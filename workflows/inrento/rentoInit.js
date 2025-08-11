import puppeteer from 'puppeteer';
import 'dotenv/config';

import { pressKey } from '../../utils/puppeteer/pressKey.js';
import { launchBrowser } from '../../utils/puppeteer/launchBrowser.js';
import { browserSession } from '../../utils/puppeteer/browserSession.js';

const START_URL = 'https://inrento.com/portfolio/';
//const START_URL = 'https://whatsmyip.com/';
//const START_URL = 'https://www.christopeit-sport.fr/';

async function rentoInit(orderNumber, amount) {

  // Lancer le navigateur Puppeteer optimisé
  const { browser, page } = await launchBrowser();

  let status = 'started';
  let comment = '';	

  try {

    // PAGE "Portfolio"

    //console.log(`Navigating to ${START_URL}...`);
    await page.goto(START_URL, { waitUntil: 'networkidle2', timeout: 120000 });

    // Ouverture popup paiement
    await new Promise(resolve => setTimeout(resolve, 2000));
    await page.evaluate(() => {
      document.querySelectorAll("button.btn.btn-primary.btn-lg.deposit-button.js-open-modal")[1].click();
    });

    // Saisir le montant
    await new Promise(resolve => setTimeout(resolve, 2000));
    await page.click('input#deposit_mango_pay_wallet_amount');

    amount = amount * 0.98;
    await page.keyboard.type(amount.toString());

    await new Promise(resolve => setTimeout(resolve, 3000));
    await pressKey(page, 'Enter', 2);
    
    // Attendre la page de paiement
    await new Promise(resolve => setTimeout(resolve, 4000));
    const paymentUrl = page.url();
    console.log('Payment URL:', paymentUrl);



    console.log('----- Init Completed ----- ');
    
    browser.close();
    return { paymentUrl }

  } catch (error) {
    console.error('Error during registration:', error);

    comment = error.message || 'Unknown error';
    status = 'error'; 


    await browser.close(); // Fermer le navigateur en cas d'erreur
    throw error;
  }
  finally {

  }
}

// const orderNumber = 'test'
// const amount = 100;

// // Lancer la fonction rentoInit
// await rentoInit(orderNumber, amount);


//

// Handler pour l'endpoint, à utiliser dans index.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  // Vérifier les paramètres requis de la requête
  const { orderNumber, amount } = req.body;
  if (!orderNumber || !amount ) {
    return res.status(400).json({ error: 'Missing required parameters: amount or orderNumber' });
  }
  
  // Afficher dans les logs les informations reçues
  console.log('----- Rento Init -----');
  console.log('Order Number:', orderNumber);
  console.log('Amount:', amount);
  console.log('-----');
  
  try {
    const { paymentUrl } = await rentoInit(orderNumber, amount);
    
    // Mettez à jour l'état partagé pour que /Rento-proceed puisse l'utiliser
    browserSession.paymentUrl = paymentUrl;
    
    res.status(200).json({ message: 'Rento initialized successfully', status: 'initialized' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
