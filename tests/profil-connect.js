// tester LaunchBrowser avec userDataDir
// tester avec Google Chrome

// Connexion manuel et utilisation manuelle du profil pour test Linux/Mac

import { launchBrowser } from '../tools/puppeteer/client.js';

const { browser, page } = await launchBrowser(false, false, true);
 await page.goto('https://dashboard.g2a.com/fr/account/settings/saved-methods');
await new Promise(resolve => setTimeout(resolve, 1200000));
await browser.close();

