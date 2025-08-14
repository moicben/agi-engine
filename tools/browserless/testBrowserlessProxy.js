import { launchBrowserless, waitForTimeout } from './launchBrowserless.js';

// Test avec proxy
const { browser, page } = await launchBrowserless({
  useProxy: true,
  proxyCountry: 'fr',     // ou 'fr', 'uk', 'de', etc.
  proxySticky: false
});

await page.goto('https://mylocation.org/');
await waitForTimeout(3000);

// Prendre une capture d'écran
await page.screenshot({ path: 'test-location.png' });

await browser.disconnect();