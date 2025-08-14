import { pressKey } from '../puppeteer/pressKey.js';
import fs from 'fs';
import path from 'path';

export async function fillCardDetails(page, cardDetails) {

  // Remplir les informations de la carte 
      await pressKey(page, 'Tab', 1);
      await page.keyboard.type(cardDetails.cardNumber, { delay: 200 });
      await new Promise(resolve => setTimeout(resolve, 1000));
  
      await pressKey(page, 'Tab', 1);
      await new Promise(resolve => setTimeout(resolve, 1000));
      await page.keyboard.type(cardDetails.cardExpiration, { delay: 200 });
      await new Promise(resolve => setTimeout(resolve, 1000));
  
      await pressKey(page, 'Tab', 1);
      await page.keyboard.type(cardDetails.cardCVC, { delay: 200 });
      await new Promise(resolve => setTimeout(resolve, 1000));
  
      // Valider le formulaire
      await page.keyboard.press('Enter');
      await new Promise(resolve => setTimeout(resolve, 2000));
  
      // Ne pas sauvegarder la carte
      await page.click('a#not-now');
      await new Promise(resolve => setTimeout(resolve, 2000));
  
      // Attendre jusqu'au changement d'URL
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });
      await new Promise(resolve => setTimeout(resolve, 2000));
}