// tester LaunchBrowser avec userDataDir

//import { proceedG2AWorkflow } from '../scripts/puppeteer/g2a/proceed.js';
// import { saveCardG2AWorkflow } from '../scripts/puppeteer/g2a/save-card.js';


// const cardDetails = {
//   cardNumber: '4111111111111111',
//   cardExpiry: '12/2025',
//   cardCvc: '123',
//   cardHolder: 'John Doe'
// };

//await proceedG2AWorkflow({ cardDetails, paymentId: "test1" });
//await saveCardG2AWorkflow({ cardDetails, paymentId: "test1" });





// TEST MANUEL :

import { launchBrowser } from '../tools/puppeteer/client.js';

const { browser, page } = await launchBrowser(false, false, true);
 await page.goto('https://dashboard.g2a.com/fr/account/settings/saved-methods');
await new Promise(resolve => setTimeout(resolve, 1200000));
await browser.close();

