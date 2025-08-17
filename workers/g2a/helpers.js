import { clickByText } from '../../tools/puppeteer/helpers.js';
import { initiateG2AWorkflow } from './initiate.js';
import { takeShot } from '../../tools/puppeteer/helpers.js';
import { extractTextFromImage } from '../../tools/ocr.js';
import { clickSafe } from '../../tools/puppeteer/helpers.js';
import { restoreSession } from '../../tools/puppeteer/helpers.js';
import fs from 'fs';


export async function acceptCookies(page) {
    const candidates = [
      '#onetrust-accept-btn-handler',
      'button#accept-cookies',
      'button[aria-label="Accept all"]',
    ];
    for (const sel of candidates) {
      try {
        const el = await page.$(sel);
        if (el) {
          await el.click();
          await new Promise((r) => setTimeout(r, 500));
          console.log('[G2A] ✅ Cookies acceptés via', sel);
          return true;
        }
      } catch {}
    }
    // Fallback: chercher un bouton par texte
    try {
      const clicked = await clickByText(page, ['button','a'], ['accept all','accepter','j\'accepte']);
      if (clicked) return true;
    } catch {}
    return false;
  }
  
  export async function handleCartDrawer(page) {
    const actions = [
      '.rc-drawer-content .light > div > .justify-between a',
      'a[href*="/cart"]',
    ];
    for (const sel of actions) {
      const el = await page.$(sel);
      if (el) {
        await el.click();
        await new Promise((r) => setTimeout(r, 1500));
        return true;
      }
    }
    // fallback par texte
    const clicked = await clickByText(page, ['a','button'], ['view cart','checkout','proceed to checkout','aller au panier','panier']);
    return !!clicked;
  }

// Fonction élégante de réinitialisation du workflow
export async function resetWorkflow() {
  console.log('[G2A][pay] 🔄 Réinitialisation du workflow...');
  
  const result = await initiateG2AWorkflow(null, true); // keepBrowserOpen = true
  
  if (!result.success) {
    throw new Error(`Échec de la réinitialisation: ${result.error}`);
  }
  
  console.log('[G2A][pay] ✅ Workflow réinitialisé avec succès');
  return result;
}



export async function paymentSequence(page, cardNumber, cardExpiry, cardCvc, cardHolder) {

  console.log('[G2A][pay] 💳 Séquence de paiement...');

  // Continuer vers le formulaire de paiement
  await clickSafe(page, "button[data-testid='continue-payment-button']");
  await takeShot(page, 'after-continue-payment-card');
  await new Promise(r => setTimeout(r, 8000));

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
  const verifShot = await takeShot(page, 'after-submit-card');
  const verifOcr = (await extractTextFromImage(verifShot)).text;
  // console.log('[G2A][pay] 📊 Résultat de la vérification:', verifOcr);

  return verifOcr;
}