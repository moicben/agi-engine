import puppeteer from 'puppeteer';


import 'dotenv/config';

//import { importCookies } from './importCookies.js';
import fs from 'fs/promises';

const GOOGLE_URL = 'https://ads.google.com/aw/billing/summary?ocid=6921193135&euid=1339874804';

// const BROWSERLESS_TOKEN = process.env.BROWSERLESS_TOKEN;

async function googleLogin() {
  const browser = await puppeteer.launch({
    headless: false, // Pour voir le navigateur en action
    defaultViewport: null,
    args: [
      '--start-maximized',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-infobars',
      `--user-data-dir=${process.env.PUPPETEER_PROFIL_PATH || '/root/chrome-profile/Default'}`, // Chemin vers le profil Chrome
    ],
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/google-chrome-stable',
  });

  const page = await browser.newPage();

  try {
    console.log(`Navigating to ${GOOGLE_URL}...`);
    await page.goto(GOOGLE_URL, { waitUntil: 'networkidle2'});

    // Attendre que je me login
    await new Promise(resolve => setTimeout(resolve, 60000));


    // Extraire les cookies de la page et les enregistrer dans un fichier
    // const newCookies = await page.cookies();
    // await fs.writeFile('cookies/google.json', JSON.stringify(newCookies, null, 2));
    // console.log('Cookies saved to cookies/google.json');
    
  }
  
    catch (error) {
      console.error('Error during navigation:', error);
    } finally {
      await browser.close();
    }
}


//await googleLogin()

export default googleLogin;
