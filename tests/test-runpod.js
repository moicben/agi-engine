// Test de lancement de browser avec runpod

import { launchBrowser } from '../tools/puppeteer/client.js';

(async () => {
  const { browser, page } = await launchBrowser();
  
  await page.goto('https://www.mylocation.org');
  await new Promise((resolve) => setTimeout(resolve, 3000));
  await page.screenshot({ path: 'screenshots/runpod.png', fullPage: true });
  await browser.close();
})();