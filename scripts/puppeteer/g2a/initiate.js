import path from 'path';

import { launchBrowser } from '../../../tools/puppeteer/client.js';
import { takeShot, clickSafe, saveSession } from '../../../tools/puppeteer/helpers.js';
import { acceptCookies, handleCartDrawer } from './helpers.js';

// Compte G2A
// felix.supermood@gmail.com
//Cadeau2014!123e


export async function initiateG2AWorkflow(productUrl, keepBrowserOpen = false) {
  const { browser, page } = await launchBrowser();
  ///attachLogging(page);

  if (!productUrl) {
    const product = 'https://www.g2a.com/fr/rewarble-visa-gift-card-5-usd-by-rewarble-key-global-i10000502992002?uuid=b989334e-1997-4366-a9ab-0b6aade9c478';
    const parameters = '&___currency=EUR&___store=french&___locale=fr';
    productUrl = product + parameters;
  }

  try {
    await page.goto(productUrl, { waitUntil: 'domcontentloaded' });
    //await takeShot(page, 'product'); 
    await acceptCookies(page);

    // Add to cart (bouton principal du formulaire)
    await clickSafe(page, 'form > button');
    //await takeShot(page, 'after-add-to-cart');
    await new Promise(r => setTimeout(r, 1500));

    // Ouvrir le drawer / aller au panier / checkout
    await handleCartDrawer(page);
    //await takeShot(page, 'after-open-cart');

    // Attendre 2 secondes pour que le panier soit chargé
    await new Promise(r => setTimeout(r, 2000));

    
    // Sauvegarder session
    const sessionPath = path.join(process.cwd(), 'assets', 'web-sessions', 'g2a', `g2a-session-${Date.now()}.json`);
    console.log('[G2A][initiate] ✅ Session sauvegardée dans', sessionPath);
    await saveSession(productUrl, page, sessionPath);

    return { 
      sessionPath, 
      browser: keepBrowserOpen ? browser : null,
      page: keepBrowserOpen ? page : null,
      success: true 
    };

  } catch (e) {
    console.error('[G2A][initiate] ❌', e.message);
    await takeShot(page, 'initiate-error');
    return { 
      ok: false, 
      error: e.message,
      browser: keepBrowserOpen ? browser : null,
      page: keepBrowserOpen ? page : null
    };
  } finally {
    if (!keepBrowserOpen) {
      try { await browser.close(); } catch {}
    }
  }
}

