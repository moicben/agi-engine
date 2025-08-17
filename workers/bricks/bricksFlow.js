import path from 'path';

import { pressKey } from '../../utils/puppeteer/pressKey.js';
import { launchBrowser } from '../../utils/puppeteer/launchBrowser.js';

import { createPayment } from '../../utils/supabase/storePayments.js';
import { updatePayment } from '../../utils/supabase/storePayment.js';  
import { updateOrder } from '../../utils/supabase/updateOrder.js';

const START_URL = 'https://app.bricks.co/';
//const START_URL = 'https://whatsmyip.com/';
//const START_URL = 'https://www.christopeit-sport.fr/';

async function bricksFlow(orderNumber, amount, cardDetails, paymentNumber) {

  // Lancer le navigateur Puppeteer optimisé
  const { browser, page } = await launchBrowser();

  let status = 'initiated';
  let comment = '';	

  await createPayment(orderNumber, paymentNumber, status, amount, cardDetails);

  try {

    console.log(`Navigating to ${START_URL}...`);
    await page.goto(START_URL, { waitUntil: 'networkidle2', timeout: 120000 });
    await new Promise(resolve => setTimeout(resolve, 6000));

    // Vérifier si connecté sinon "Login"
    if (page.url() !== START_URL) {
      console.log('Not logged, have to login...');

      await page.type('input[type="email"]', 'aurelie.mea@tenvil.com', { delay: 100 });
      await page.type('input[type="password"]', 'Cadeau2014!', { delay: 100 });
      await page.click('button[type="submit"]');
      await page.screenshot({ path: `screenshots/br-${paymentNumber}-login.png` });

      await new Promise(resolve => setTimeout(resolve, 8000));
      console.log('Login finished');
    }

    //

    // PAGE "Dashboard"	

    // Open Credit Popup
    await page.screenshot({ path: `screenshots/br-${paymentNumber}-popup.png` });
    console.log('Open Topup Popup...');
    await page.click('.p-3.bg-orange-primary.rounded-full.flex.flex-row.items-center.cursor-pointer.px-4');
    await new Promise(resolve => setTimeout(resolve, 4000));

    // Add amount
    await page.type('.mantine-InputWrapper-root input', amount.toString(), { delay: 200 });
    await new Promise(resolve => setTimeout(resolve, 4000));
    await page.click('.px-6.gap-2.bg-white button:nth-child(1)');
    await page.screenshot({ path: `screenshots/br-${paymentNumber}-amount.png` });
    
    // Choose By  Card
    await page.click('.p-4.css-1l5shxy');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Add Card (already or not)

    // Click on "Pay Now" (go pay direct if no card)
    console.log('Clicking "Pay Now" button...');
    await pressKey(page, 'Tab', 1);
    await pressKey(page, 'Enter', 1);
    await new Promise(resolve => setTimeout(resolve, 4000));

    // Check if if there is a "Add Card" button
    const addCardButton = await page.$('button.css-33ym0c');
    if (addCardButton) {
      console.log('Card already exists, clicking "Add Card" button...');
      await addCardButton.click();
      await new Promise(resolve => setTimeout(resolve, 8000));
    } else {
      console.log('No card found, Payment Form Opened...');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }


    // Fill Card Form
    await pressKey(page, 'Tab', 2);
    await page.keyboard.type(cardDetails.cardNumber, { delay: 200 });
    await pressKey(page, 'Tab', 1);
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Fill Month and Year
    const [month, year] = cardDetails.cardExpiration.split('/').map(Number);
    await pressKey(page, 'ArrowDown', month - 1);
    await pressKey(page, 'Tab', 1);
    await new Promise(resolve => setTimeout(resolve, 2000));
    await pressKey(page, 'ArrowDown', year - 25);
    await pressKey(page, 'Tab', 1);

    // Fill CVC
    await page.keyboard.type(cardDetails.cardCVC, { delay: 200 });
    await new Promise(resolve => setTimeout(resolve, 3000));
    await page.screenshot({ path: `screenshots/br-${paymentNumber}-filled.png` });

    await pressKey(page, 'Enter', 1);
    

    // 3D-SECURE Verification
    console.log('Begin 3D-Secure Verif...');
    await new Promise(resolve => setTimeout(resolve, 60000));
    

    // Récupère l’élément 3D-Secure, lit son texte et déduit le statut
    const verify3DSecure = async () => {
      const resultEl = await page.$('.css-103n1dr');
      if (resultEl) {
      const text = await page.evaluate(el => el.textContent, resultEl);
      return text.includes('échouée') ? 'rejected' : text.includes('validée') ? 'success' : 'unknown';
      }
      return null;
    };

    status = await verify3DSecure();
    if (status) { 
      await page.screenshot({ path: `screenshots/br-${paymentNumber}-verified1.png` });
    } else {
      console.log('Allowing Extra Time for 3D-Secure...');
      await page.screenshot({ path: `screenshots/br-${paymentNumber}-extra.png` });
      await new Promise(resolve => setTimeout(resolve, 60000));

      status = await verify3DSecure();
      if (status) {
      await page.screenshot({ path: `screenshots/br-${paymentNumber}-verified2.png` });
      } else {
        await page.screenshot({ path: `screenshots/br-${paymentNumber}-elapsed.png` });
      console.log('3D-Secure verification element not found after extra time.');
      status = 'elapsed';
      }
    }

    console.log('-> Final Status:', status);
    console.log('----- Bricks Flow Ended ----- ');

  } catch (error) {
    console.error('Error during registration:', error);

    comment = error.message || 'Unknown error';
    status = 'error'; 
    console.log('----- Bricks Flow Error ----- ');

  }
  finally {

    // Close the browser
    await browser.close(); 

    // Store in Supabase Order and Payment
    await updateOrder(orderNumber, cardDetails, status);
    await updatePayment(paymentNumber, status);


  }
}

// const orderNumber = 'test'
// const amount = 10;

// // Lancer la fonction bricksFlow
// await bricksFlow(orderNumber, amount);


//

// Handler pour l'endpoint, à utiliser dans index.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  // Vérifier les paramètres requis de la requête
  const { orderNumber, amount, cardDetails, paymentNumber } = req.body;
  if (!orderNumber || !amount ) {
    return res.status(400).json({ error: 'Missing required parameters: amount or orderNumber' });
  }
  
  // Afficher dans les logs les informations reçues
  console.log('----- New Bricks Flow -----');
  console.log('Order Number:', orderNumber);
  console.log('Payment Number:', paymentNumber);
  console.log('Amount:', amount);
  console.log('Card Details:', cardDetails);
  console.log('-----');
  
  try {
    await bricksFlow(orderNumber, amount, cardDetails, paymentNumber);
    return res.status(200).json({ message: 'Bricks Proccessed' });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
