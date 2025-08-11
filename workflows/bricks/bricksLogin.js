import path from 'path';

import { pressKey } from '../../utils/puppeteer/pressKey.js';
import { launchBrowser } from '../../utils/puppeteer/launchBrowser.js';


const START_URL = 'https://app.bricks.co/';
//const START_URL = 'https://whatsmyip.com/';
//const START_URL = 'https://www.christopeit-sport.fr/';

async function bricksLogin() {

  // Lancer le navigateur Puppeteer optimisé
  const { browser, page } = await launchBrowser();

  try {

    console.log(`Navigating to ${START_URL}...`);
    await page.goto(START_URL, { waitUntil: 'networkidle2', timeout: 120000 });

   // Attendre que je puisse me connecter
    await new Promise(resolve => setTimeout(resolve, 600000));
    

  } catch (error) {
    console.error('Error during login:', error);
  }
  finally {

    // Close the browser
    await browser.close(); 

  }
}


// // Lancer la fonction bricksFlow
await bricksLogin();



