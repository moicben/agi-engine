import puppeteer from 'puppeteer';
import 'dotenv/config';
import { importCookies } from '../../utils/puppeteer/importCookies.js';
import fs from 'fs/promises';

import { createPayment } from '../../utils/supabase/createPayment.js';
import { updateOrder } from '../../utils/supabase/updateOrder.js';


const GOOGLE_URL = 'https://ads.google.com/aw/billing/summary?ocid=6921193135&euid=1339874804';


async function googleTopup(orderNumber, paymentNumber, amount, cardDetails) {
  const browser = await puppeteer.launch({
    headless: false, // Mode non-headless pour voir le processus
    defaultViewport: null,
    args: [
      '--start-maximized',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled', // Désactiver les détections d'automatisation
      '--disable-infobars', // Supprimer la barre d'information
      `--user-data-dir=${process.env.PUPPETEER_PROFIL_PATH || '/root/chrome-profile/Default'}`, // Chemin vers le profil Chrome
    ],
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,  
  });
  
  const page = await browser.newPage();
  let status = 'pending';

  try {
    const cardExpiration = cardDetails.cardExpiration.replace('/', '');
    const formattedAmount = amount.toString().replace('.', ',');

    // Importer les cookies sauvegardés
    //await importCookies(page, 'cookies/google.json');

    // Naviguer vers l'URL Google
    console.log(`Navigating to ${GOOGLE_URL}...`);
    await page.goto(GOOGLE_URL, { waitUntil: 'networkidle2' });

    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log('-> Start URL: ', page.url());
    await page.screenshot({ path: `logs/g-${paymentNumber}-0.png` });

    // Se connecter si nécessaire
    if (page.url().includes('signin')) {
      console.log('-> Cookies not valid, retrying...');
      await page.goto(GOOGLE_URL, { waitUntil: 'networkidle2' });

      // Extra-whaiting time to rerify if still on signin
      await new Promise(resolve => setTimeout(resolve, 2000));
      if (page.url().includes('signin')) {
        console.log('-> Cookies not valid, login to page');

        // Login Sequence
        await page.keyboard.type("macfix.dijon@gmail.com", { delay: 100 });
        await new Promise(resolve => setTimeout(resolve, 1000));

        await page.keyboard.press('Enter');
        await new Promise(resolve => setTimeout(resolve, 4000));

        await page.keyboard.type("Cadeau2014!", { delay: 100 });
        await new Promise(resolve => setTimeout(resolve, 1000));

        await page.keyboard.press('Enter');

        // Time to valide number on phone
        await new Promise(resolve => setTimeout(resolve, 20000));
      }
    }
      
    // Vérifier URL après connexion
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Sélectionne rle compte si nécessaire
    if (page.url().includes('selectaccount')) {

      console.log('-> Select account required, starting...');
      await page.keyboard.press('Tab');
      await new Promise(resolve => setTimeout(resolve, 1000));

      await page.keyboard.press('Enter');
      await new Promise(resolve => setTimeout(resolve, 9000));

      await page.keyboard.press('Enter');
      await new Promise(resolve => setTimeout(resolve, 7000));

      await page.keyboard.press('Tab');
      await new Promise(resolve => setTimeout(resolve, 1000));

      await page.keyboard.press('Enter');
      await new Promise(resolve => setTimeout(resolve, 6000));

      // Retourner à l'URL de départ
      await page.goto(GOOGLE_URL, { waitUntil: 'networkidle2' });
      await new Promise(resolve => setTimeout(resolve, 2000)); 
    }


    // Fermer d'éventuelles popups
    await page.keyboard.press('Escape');
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Extraire les cookies de la page 
    // const initCookies = await page.cookies();
    // await fs.writeFile('cookies/mollie.json', JSON.stringify(initCookies, null, 2));

    // Effectuer un clic pour lancer l'option de paiement
    await page.click('base-root div.card-body > material-button.make-optional-payment-button');
    await new Promise(resolve => setTimeout(resolve, 2500));
    await page.screenshot({ path: `logs/g-${paymentNumber}-1.png` });

    // Lancer le processus d'ajout de moyen de paiement
    await page.keyboard.press('Tab');
    await new Promise(resolve => setTimeout(resolve, 500));
    await page.keyboard.press('Tab');
    await new Promise(resolve => setTimeout(resolve, 500));
    await page.keyboard.press('Enter');  
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Séquence de saisie pour ajouter une nouvelle carte
    for (let i = 0; i < 32; i++) {
      await page.keyboard.press('ArrowDown');
      await new Promise(resolve => setTimeout(resolve, 100)); // Small delay between key presses
    }

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Cliquer aux coordonnées 700, 500 de la page
    await page.mouse.click(700, 440);
    await new Promise(resolve => setTimeout(resolve, 2000));
    await page.screenshot({ path: `logs/g-${paymentNumber}-2.png` });


    // // Si aucune carte existe :
      // await page.keyboard.press('Tab');
      // await new Promise(resolve => setTimeout(resolve, 500));
      // await page.keyboard.press('Tab');
      // await new Promise(resolve => setTimeout(resolve, 500));
      // await page.keyboard.press('Tab');
      // await new Promise(resolve => setTimeout(resolve, 500));
      // await page.keyboard.press('ArrowDown');
      // await new Promise(resolve => setTimeout(resolve, 500));
      // await page.keyboard.press('Enter'); 
      // await new Promise(resolve => setTimeout(resolve, 1500));

    // Saisie du numéro de carte
    await page.keyboard.press('Tab');
    await new Promise(resolve => setTimeout(resolve, 500));
    await page.keyboard.press('Tab');
    await new Promise(resolve => setTimeout(resolve, 500));
    await page.keyboard.type(cardDetails.cardNumber, { delay: 250 });
    await new Promise(resolve => setTimeout(resolve, 1500)); 

    // Saisie de la date d'expiration et du CVV
    await page.keyboard.press('Tab');
    await new Promise(resolve => setTimeout(resolve, 500));
    await page.keyboard.type(cardDetails.cardExpiration, { delay: 100 });
    await new Promise(resolve => setTimeout(resolve, 500));
    await page.keyboard.type(cardDetails.cardCVC, { delay: 100 });
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Saisie du nom du titulaire
    await page.keyboard.press('Tab');
    await new Promise(resolve => setTimeout(resolve, 500));
    await page.keyboard.type(cardDetails.cardOwner, { delay: 100 });
    await new Promise(resolve => setTimeout(resolve, 1500));
    await page.screenshot({ path: `logs/g-${paymentNumber}-3.png` });

    // Confirmation de l'ajout de la carte
    await page.keyboard.press('Tab');
    await new Promise(resolve => setTimeout(resolve, 500));
    await page.keyboard.press('Tab');
    await new Promise(resolve => setTimeout(resolve, 500));
    await page.keyboard.press('Tab');
    await new Promise(resolve => setTimeout(resolve, 500));
    await page.keyboard.press('Tab');
    await new Promise(resolve => setTimeout(resolve, 500));
    await page.keyboard.press('Tab');
    await new Promise(resolve => setTimeout(resolve, 500));
    await page.keyboard.press('Tab');
    await new Promise(resolve => setTimeout(resolve, 500));

    await page.keyboard.press('Enter');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Saisie du montant à recharger
    await page.keyboard.press('Tab');
    await new Promise(resolve => setTimeout(resolve, 500));
    await page.keyboard.press('Tab');
    await new Promise(resolve => setTimeout(resolve, 500));
    await page.keyboard.press('Tab');
    await new Promise(resolve => setTimeout(resolve, 500));

    await page.keyboard.press('ArrowDown');
    await new Promise(resolve => setTimeout(resolve, 500));
    await page.keyboard.press('Space');
    await new Promise(resolve => setTimeout(resolve, 500));
    await page.keyboard.press('Tab');
    await new Promise(resolve => setTimeout(resolve, 1500));

    await page.keyboard.type(formattedAmount, { delay: 250 });
    await new Promise(resolve => setTimeout(resolve, 1000));
    await page.screenshot({ path: `logs/g-${paymentNumber}-3.png` });

    // Confirmation du montant
    await page.keyboard.press('Tab');
    await new Promise(resolve => setTimeout(resolve, 500));
    await page.keyboard.press('Tab');
    await new Promise(resolve => setTimeout(resolve, 500));
    await page.keyboard.press('Enter');
    await new Promise(resolve => setTimeout(resolve, 4000));
    await page.screenshot({ path: `logs/g-${paymentNumber}-4.png` });

    // Confirmation du paiement
    await page.keyboard.press('Tab');
    await new Promise(resolve => setTimeout(resolve, 500));
    await page.keyboard.press('Tab');
    await new Promise(resolve => setTimeout(resolve, 500));
    await page.keyboard.press('Enter');
    await new Promise(resolve => setTimeout(resolve, 13000));
    await page.screenshot({ path: `logs/g-${paymentNumber}-5.png` });

    // Démarrer l'authentification si nécessaire
    await page.keyboard.press('Tab');
    await new Promise(resolve => setTimeout(resolve, 500));
    await page.keyboard.press('Tab');
    await new Promise(resolve => setTimeout(resolve, 500));
    await page.keyboard.press('Enter');
    await page.screenshot({ path: `logs/g-${paymentNumber}-6.png` });

    // 2 minutes pour traiter la validation 3D-secure
    await new Promise(resolve => setTimeout(resolve, 60000));
    await page.screenshot({ path: `logs/g-${paymentNumber}-7.png` });
    await new Promise(resolve => setTimeout(resolve, 30000));

    //

    // Fin du flow
    status = 'processed'
    await page.screenshot({ path: `logs/g-${paymentNumber}-processed.png` });

  } catch (error) {
    console.error('Error during Google Topup automation:', error);
    status = 'error';
  } finally {

    // Extraire les cookies de la page 
    const endCookies = await page.cookies();
    await fs.writeFile('cookies/mollie.json', JSON.stringify(endCookies, null, 2));

    await updateOrder(orderNumber, cardDetails, status);
    await createPayment(orderNumber, paymentNumber, status, amount, cardDetails);

    await browser.close();

    console.log('Transaction completed. Status:', status);
    console.log('----- End Google Topup -----');
    return status;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  // Exemple d'attente des données dans le corps de la requête
  const { orderNumber, paymentNumber, amount, cardDetails } = req.body;
  if (!orderNumber || !paymentNumber || !amount || !cardDetails ) {
    return res.status(400).json({ error: 'Missing required parameters: amount and cardDetails' });
  }
  
  // Afficher dans les logs les informations reçues
  console.log('----- Google Topup -----');
  console.log('Order Number:', orderNumber);
  console.log('Payment Number:', paymentNumber);
  console.log('Amount:', amount);
  console.log('Card Details:', cardDetails);
  console.log('-----');
  
  try {
    const result = await googleTopup(orderNumber, paymentNumber, amount, cardDetails);
    return res.status(200).json({ message: 'Google Topup automation completed successfully', result });
  } catch (error) {
    console.error('Error in Google Topup handler:', error);
    return res.status(500).json({ error: error.message });
  }
}