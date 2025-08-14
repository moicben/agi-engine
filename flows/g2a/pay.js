// Worfklow pour acheter un carte cadeau sur G2A.com

import { launchBrowserless, closeBrowserless, waitForTimeout } from '../../utils/browserless/launchBrowserless.js';

export async function buyWorkflow() {
    const { browser, page } = await launchBrowserless();
    await page.goto('https://g2a.com/');

    // Prendre un screenshot de la page
    await page.screenshot({ path: './screenshots/g2a.png' });

    // Attendre 10 secondes
    await waitForTimeout(10000);

    // Fermer le navigateur
    await closeBrowserless(browser);
}
