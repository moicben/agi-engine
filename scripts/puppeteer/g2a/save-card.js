// Workflow d'enregistrement d'une carte bancaire sur G2A
import { launchBrowser } from '../../../tools/puppeteer/client.js';
import { takeShot, clickSafe, restoreSession, typeSafe } from '../../../tools/puppeteer/helpers.js';
import { extractTextFromImage } from '../../../tools/ocr.js';
import { getRandomEmail } from '../../../tools/temp-mail.js';
import { updatePayment } from '../../../tools/supabase/payments.js';

export async function saveCardG2AWorkflow({ cardDetails, paymentId }) {
    
    // Lancer la session avec profil existant
    const { cardNumber, cardExpiry, cardCvc, cardHolder } = cardDetails;
    const  { browser, page } = await launchBrowser(false, false, true); // pas de proxy, pas de headless, userDataDir = true
    let status = 'initiated';
    let ocr = '';
    
    // Mettre à jour le statut initial en base (pending)
    try { await updatePayment(paymentId, 'pending'); } catch (e) { console.warn('[G2A][pay] updatePayment pending warn:', e.message); }
    
    try {
        // Se diriger vers la page des méthodes de paiement enregistrées
        await page.goto('https://dashboard.g2a.com/fr/account/settings/saved-methods', { waitUntil: 'networkidle2' });
        await new Promise(r => setTimeout(r, 2000));
        
        // Cliquer sur le bouton "Ajouter un moyen de paiement"
        await clickSafe(page, "main section button");
        await new Promise(r => setTimeout(r, 5000));
        
        // Choisir carte bancaire
        await clickSafe(page, "main section a");
        await new Promise(r => setTimeout(r, 10000));
        
        // Focus sur le champ h4 : divdata-test-id="overlay-container h4"
        await clickSafe(page, "div[data-test-id='overlay-container'] h4");
        await new Promise(r => setTimeout(r, 2000));
        await page.keyboard.press('Tab');
        await new Promise(r => setTimeout(r, 2000));

        // Remplir les champs de la carte
        await typeSafe(page, "input[name='cardNumber']", cardNumber);
        await page.keyboard.press('Tab');
        await new Promise(r => setTimeout(r, 2000));
        await typeSafe(page, "input[name='cardExpiry']", cardExpiry);
        await new Promise(r => setTimeout(r, 2000));
        await typeSafe(page, "input[name='cardCvc']", cardCvc);
        await new Promise(r => setTimeout(r, 2000));
        await typeSafe(page, "input[name='cardHolder']", cardHolder);
        await new Promise(r => setTimeout(r, 2000));
        
        // Appuyer sur entrer
        await page.keyboard.press('Enter');
        await new Promise(r => setTimeout(r, 10000));

        // [OCR] Vérifier le statut du paiement
        let paymentShot = await takeShot(page, 'after-save-card');
        let paymentOcr = (await extractTextFromImage(paymentShot)).text;
        console.log('[G2A][pay] 📊 Résultat de la vérification:', paymentOcr);

        // Si paiement est refusé, retourner l'erreur et arreter
        if (paymentOcr.includes("quelque chose a mal tourné") || paymentOcr.includes("something went wrong") || paymentOcr.includes("blocked")) {
            status = 'error';
            ocr = paymentOcr;
            try { await updatePayment(paymentId, 'error'); } catch {}
            return { status, ocr };
        }
        else {
            // Indiquer la vérification 3DS est en cours
            try { await updatePayment(paymentId, 'in_verif'); } catch {}
            // Laisser 120s pour que la validation 3DS
            await new Promise(r => setTimeout(r, 120000));
            status = 'processed';
            ocr = paymentOcr;
            try { await updatePayment(paymentId, 'processed'); } catch {}
            return { status, ocr };
        }

    } catch (e) {
        console.error('[G2A][pay] saveCardG2AWorkflow error:', e.message);
        status = 'error';
        ocr = e.message;
        try { await updatePayment(paymentId, 'error'); } catch {}
        return { status, ocr };
    }
}