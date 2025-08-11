
import fs from 'fs';
import puppeteer from 'puppeteer';
import path from 'path';

import { pressKey } from '../../utils/puppeteer/pressKey.js';
import { fillCardDetails } from '../../utils/western/fillCardDetails.js';
import { checkCookies } from '../../utils/western/checkCookies.js';
import { getRandomIdentity } from '../../utils/western/getRandomIdentity.js';

import { createPayment } from '../../utils/supabase/createPayment.js';
import { updateOrder } from '../../utils/supabase/updateOrder.js';

import { browserSession } from '../../utils/puppeteer/browserSession.js';


async function westernProceed(browser, page, orderNumber, paymentNumber, amount, cardDetails) {

  let status = 'pending';
  const { address, city, postal, phone } = await getRandomIdentity();

  try {
    // Remplir infos carte : TEMPLATE
    await fillCardDetails(page, cardDetails);
    await page.screenshot({ path: `logs/wp-${paymentNumber}-0.png` });

    //

    // PAGE : "Complete Profile"

    //

    // Remplir les informations
    await pressKey(page, 'Tab', 4);
    await page.keyboard.type(phone, { delay: 200 });

    const randomDay = (Math.floor(Math.random() * 30) + 1).toString();
    const randomMonth = Math.floor(Math.random() * 3) + 1;
    const randomYear = (Math.floor(Math.random() * 50) + 1950).toString();

    await pressKey(page, 'Tab', 1);
    await page.keyboard.type(String(randomDay), { delay: 100 });
    await new Promise(resolve => setTimeout(resolve, 1000));

    await pressKey(page, 'Tab', 1);
    await pressKey(page, 'J', randomMonth);
    await new Promise(resolve => setTimeout(resolve, 1000));

    await pressKey(page, 'Tab', 1);
    await page.keyboard.type(String(randomYear), { delay: 100 });
    await new Promise(resolve => setTimeout(resolve, 1000));
    await page.screenshot({ path: `logs/wp-${paymentNumber}-1.png` });

    await pressKey(page, 'Tab', 1);
    await page.keyboard.type(address, { delay: 200 });
    await new Promise(resolve => setTimeout(resolve, 1000));

    await pressKey(page, 'Tab', 1);
    await page.keyboard.type(city, { delay: 200 });
    await new Promise(resolve => setTimeout(resolve, 1000));

    await pressKey(page, 'Tab', 1);
    await page.keyboard.type(String(postal), { delay: 200 });
    await new Promise(resolve => setTimeout(resolve, 1000));

    await pressKey(page, 'Tab', 1);
    await page.keyboard.type('France', { delay: 200 });
    await new Promise(resolve => setTimeout(resolve, 500));
    await page.keyboard.press('Enter');
    await new Promise(resolve => setTimeout(resolve, 1000));
    await page.screenshot({ path: `logs/wp-${paymentNumber}-2.png` });

    await pressKey(page, 'Tab', 1);
    await page.keyboard.press('Space');
    await new Promise(resolve => setTimeout(resolve, 1000));

    await pressKey(page, 'Tab', 5);
    await new Promise(resolve => setTimeout(resolve, 2000));
    await page.keyboard.press('Space');

    // Chargement confirmation
    console.log('Loading Review Page...');
    await new Promise(resolve => setTimeout(resolve, 21000));

    //

    // PAGE : "Transfer Review"

    // 

    // Si l'URL contient 'review' alors carte acceptée
    if (page.url().includes('review')) {

      console.log('Review Page Loaded!');
      await page.screenshot({ path: `logs/wp-${paymentNumber}-3.png` });

      // Confirmer le paiement
      await page.click('p.custom-checkbox-section.ng-scope > label');
      await new Promise(resolve => setTimeout(resolve, 3000));
      await page.click('button#Submit');

      // Début 3D-Secures
      console.log('Begin 3D-Secure...');
      status = 'processed';
      await new Promise(resolve => setTimeout(resolve, 10000));
      await page.screenshot({ path: `logs/wp-${paymentNumber}-4.png` });
      await new Promise(resolve => setTimeout(resolve, 50000));

      // Si besoin de plus de temps
      if (page.url().includes('review')) {
        console.log('Allowing Extra 3D-Secure...');
        await page.screenshot({ path: `logs/wp-${paymentNumber}-extra.png` });
        await new Promise(resolve => setTimeout(resolve, 60000));
      }

      // Vérification de l'état de la transaction

      if (page.url().includes('decline')) {
        console.log('Transaction declined!');
        await page.screenshot({ path: `logs/wp-${paymentNumber}-declined.png` });
        status = 'declined';
      }

      else if (page.url().includes('receipt')) {
        console.log('Transaction successful!');
        await page.screenshot({ path: `logs/wp-${paymentNumber}-success.png` });
        status = 'success';
      }

      else if (page.url().includes('review')) {
        console.log('Transaction elapsed!');
        await page.screenshot({ path: `logs/wp-${paymentNumber}-elapsed.png` });
        await new Promise(resolve => setTimeout(resolve, 60000));
        await page.screenshot({ path: `logs/wp-${paymentNumber}-elapsed-2.png` });
        status = 'elapsed';
      }

      // 

      // Fin du Flow
      await page.screenshot({ path: `logs/wp-${paymentNumber}-final.png` });
      //

    }
    else {
      console.log('Card refused!');

      status = 'refused';
      await page.screenshot({ path: `logs/w-${paymentNumber}-refused.png` });
    }
  }
  catch (error) {
    status = 'error';
    console.error('Error in westernProceed:', error);
  }
  finally {

    // Fermer le navigateur
    await browser.close();

    // Sauvegarder commande + paiement
    await updateOrder(orderNumber, cardDetails, status);
    await createPayment(orderNumber, paymentNumber, status, amount, cardDetails);

    // Retourner le statut de la transaction
    console.log(`Transaction completed. Status: ${status}`);
    console.log('----- End Western Proceed -----');
    return status;
  }
}

export default function westernProceedHandler(westernBrowser, westernPage) {

  return async function handler(req, res) {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // Vérifier si les navigateurs sont initialisés
    if (!westernBrowser || !westernPage) {
      return res.status(500).json({ error: 'checkout not ready' });
    }
    
    // Vérifier les paramètres requis de la requête
    const { orderNumber, paymentNumber, amount, cardDetails } = req.body;
    if (!orderNumber || !paymentNumber || !amount || !cardDetails) {
      return res.status(400).json({ error: 'Missing required parameters: amount and cardDetails' });
    }
    
    console.log('----- Western Proceed -----');
    console.log('Order Number:', orderNumber);
    console.log('Payment Number:', paymentNumber);
    console.log('Amount:', amount);
    console.log('Card Details:', cardDetails);
    console.log('-----');
    
    try {
      // vous pouvez utiliser westernBrowser et westernPage ici si nécessaire.
      const result = await westernProceed(westernBrowser, westernPage, orderNumber, paymentNumber, amount, cardDetails);
      return res.status(200).json({ message: 'Western proceeded.', result });
    } catch (error) {
      console.error('Error in Western handler:', error);
      return res.status(500).json({ error: error.message });
    }
  }
}