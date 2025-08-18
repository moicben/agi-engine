// Workflow de paiement G2A (panier + paiement par carte)
import fs from 'fs';

import { launchBrowser } from '../../tools/puppeteer/client.js';
import { initiateG2AWorkflow } from './initiate.js';
import { takeShot, clickSafe, restoreSession, typeSafe } from '../../tools/puppeteer/helpers.js';
import { extractTextFromImage } from '../../tools/ocr.js';
import { getRandomEmail } from '../../tools/temp-mail.js';
import { updatePayment } from '../../tools/supabase/payments.js';
import { resetWorkflow, pollPaymentStatus } from './helpers.js';

export async function payG2AWorkflow({ sessionPath, cardDetails, paymentId }) {
    if (!sessionPath || !fs.existsSync(sessionPath)) {
        throw new Error('sessionPath manquant ou invalide');
    }
    
    // Workflow initiation
    const session = JSON.parse(fs.readFileSync(sessionPath, 'utf8'));
    const { cardNumber, cardExpiry, cardCvc, cardHolder } = cardDetails;
    let { browser } = await launchBrowser();
    let email = await getRandomEmail();
    //let email = "bendoymclol@gmail.com";
    let status = 'initiated';
    let ocr = '';
    
    // Mettre à jour le statut initial en base (pending)
    try { await updatePayment(paymentId, 'pending'); } catch (e) { console.warn('[G2A][pay] updatePayment pending warn:', e.message); }
    
    try {
        // Restore session
        let page = await restoreSession(browser, session);
        const startShot = await takeShot(page, 'pay-start');
        
        // Analyse de la page
        ocr = (await extractTextFromImage(startShot)).text;
        
        // [OCR] ne détecte aucun panier, réinitialiser élégamment
        if (ocr.includes("allez-y et ajoutez-y")) {
            // Fermer le navigateur actuel
            try { await browser.close(); } catch {}
            
            // Réinitialiser le workflow et récupérer les nouvelles ressources
            const resetResult = await resetWorkflow();
            sessionPath = resetResult.sessionPath;
            browser = resetResult.browser;
            page = resetResult.page;
        }
        
        // Saisie email invité
        await typeSafe(page, "input[type='email']", email, { clear: true });
        await takeShot(page, 'after-email');
        await new Promise(r => setTimeout(r, 1000));
        
        // Confimer le panier
        await clickSafe(page, "button[data-event='cart-continue']");
        await new Promise(r => setTimeout(r, 6000));
        
        // [OCR] retry loop erreur l'email
        let emailShot = await takeShot(page, 'after-cart-continue');
        let emailRetry = true;
        while (emailRetry) {
            ocr = (await extractTextFromImage(emailShot)).text;
            
            if (ocr.includes("votre compte est suspendu") || ocr.includes("il y a eu un problème")) {
                
                // Fermer la popup en apuyant sur échap
                await page.keyboard.press('Escape');
                await new Promise(r => setTimeout(r, 1000));
                
                // Utiliser un nouvel email
                email = await getRandomEmail();
                
                // Vider le champ 
                await clickSafe(page, "section label.font-bold");
                await new Promise(r => setTimeout(r, 1000));
                await page.keyboard.press('Tab');
                await page.keyboard.press('Backspace');
                await new Promise(r => setTimeout(r, 1000));
                
                // Entrer un nouvel email
                await typeSafe(page, "input[type='email']", email, { clear: true });
                await new Promise(r => setTimeout(r, 1000));
                
                // Confimer le panier
                await clickSafe(page, "button[data-event='cart-continue']");
                await new Promise(r => setTimeout(r, 6000));
                emailShot = await takeShot(page, 'after-cart-continue');
                
                // Revérifier l'email
                emailRetry = true;
            } else {
                emailRetry = false;
            }
        }
        
        // TRANSITION BETWEEN EMAIL <-> PAYMENT
        await new Promise(r => setTimeout(r, 3000));

        // Sélectionner le mode de paiement par carte
        await clickSafe(page, "div[data-test-id='payment-method-list'] > label:nth-child(2)"); 
        await new Promise(r => setTimeout(r, 4000));

        // Continuer vers le formulaire de paiement
        await clickSafe(page, "button[data-testid='continue-payment-button']");
        await takeShot(page, 'after-continue-payment-card');
        await new Promise(r => setTimeout(r, 8000));
        
        let paymentRetry = true; 
        let paymentTries = 0;
        while (paymentRetry) {
            
            // [OCR] Vérifier sur quelle page nous sommes
            let paymentShot = await takeShot(page, 'after-continue-payment-card');
            let paymentOcr = (await extractTextFromImage(paymentShot)).text;
            //console.log('[G2A][pay] 📊 Résultat de la vérification:', paymentOcr);

            // Page des modes de paiement
            if (paymentOcr.includes("unionpay")) { // UnionPay donc page des modes de paiement

                // Continuer vers le formulaire de paiement
                await clickSafe(page, "button[data-testid='continue-payment-button']");
                await takeShot(page, 'after-continue-payment-card');
                await new Promise(r => setTimeout(r, 8000));
                
            } 
            // Popup erreur de paiement
            else if (paymentOcr.includes("quelque chose a mal tourné") || paymentOcr.includes("something went wrong") || paymentOcr.includes("blocked")) {
                // Cliquer sur réessayer avec autre carte
                await clickSafe(page, "section button:nth-child(2)");
                await new Promise(r => setTimeout(r, 6000));
                continue;
            }
            
            paymentTries++;
            
            // Remplir les champs de la carte
            await clickSafe(page, "section div div div div div div div div div svg");  // Focus icone de paiement
            await new Promise(r => setTimeout(r, 1000));
            await page.keyboard.press('Tab');
            
            await page.keyboard.type(cardNumber);
            await page.keyboard.press('Tab');
            await page.keyboard.type(cardExpiry);
            await page.keyboard.press('Tab');
            await page.keyboard.type(cardCvc);
            await page.keyboard.press('Tab');
            await page.keyboard.type(cardHolder);
            await new Promise(r => setTimeout(r, 2000));
            
            // Soumettre le formulaire de carte
            await page.keyboard.press('Enter');
            console.log('[G2A][pay] 💳 Formulaire de carte soumis (10s)...');
            await new Promise(r => setTimeout(r, 10000));
            
            // Vérification simple du statut (sans polling)
            let verifShot = await takeShot(page, 'after-submit-card');
            let verifOcr = (await extractTextFromImage(verifShot)).text;
            console.log('[G2A][pay] 📊 Résultat de la vérification:', verifOcr);
            
            console.log('🔄 PaymentTries:', paymentTries);
            if (paymentTries >= 3) {
                status = 'error';
                ocr = verifOcr;
                try { await updatePayment(paymentId, 'error'); } catch {}
                return { status, ocr };
            }
        }

        // Début 3DS (120s)
        status = 'in_verif';
        try { await updatePayment(paymentId, 'in_verif'); } catch {}
        await new Promise(r => setTimeout(r, 120000));
        
        // Vérifier le statut
        const verifShot = await takeShot(page, 'after-submit-card');
        const verifOcr = (await extractTextFromImage(verifShot)).text;
        console.log('[G2A][pay] 📊 Résultat de la vérification:', verifOcr);
        
        if (verifOcr.includes("quelque chose a mal tourné") || verifOcr.includes("compte bloqué")) {
            status = 'error';
            ocr = verifOcr;
            try { await updatePayment(paymentId, 'error'); } catch {}
            return { status, ocr };
        }
        else {
            status = 'success';
            ocr = verifOcr;
            try { await updatePayment(paymentId, 'success'); } catch {}
            return { status, ocr };
        }
        
    } catch (e) {
        console.error('[G2A][pay] ❌', e.message);
        try { await updatePayment(paymentId, 'error'); } catch {}
        return { status: 'error', error: e.message };
    } finally {
        try { await browser.close(); } catch {}
    }
}
