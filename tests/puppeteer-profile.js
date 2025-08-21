// tester LaunchBrowser avec userDataDir

// import { proceedG2AWorkflow } from '../scripts/puppeteer/g2a/proceed.js';


// const cardDetails = {
//   cardNumber: '4111111111111111',
//   cardExpiry: '12/2025',
//   cardCvc: '123',
//   cardHolder: 'John Doe'
// };

//await proceedG2AWorkflow({ cardDetails, paymentId: "test1" });



import { launchBrowser } from '../tools/puppeteer/client.js';

const { browser, page } = await launchBrowser(false, false, true);
await page.goto('https://www.g2a.com/fr/page/cart?___locale=fr');
//await page.goto('https://www.google.com');
//await page.goto('https://www.g2a.com/fr/page/cart?___locale=fr');

await new Promise(resolve => setTimeout(resolve, 1200000));
await page.screenshot({ path: 'screenshot.png' });

await browser.close();

