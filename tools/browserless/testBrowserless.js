// Test de la fonction launchBrowserless avec live streaming

import { launchBrowserless } from './launchBrowserless.js';

const { browser, page } = await launchBrowserless({
    useProxy: true,
    proxyCountry: 'fr',
    proxySticky: false
  });

// Activer le live streaming
console.log('🎥 Live streaming disponible sur:');
console.log(`https://production-sfo.browserless.io/debugger?token=S1AMT3E9fOmOF332e325829abd823a1975bff5acdf`);

await page.goto('https://www.google.com');

// Remplacer page.waitForTimeout par setTimeout avec Promise
await new Promise(resolve => setTimeout(resolve, 200000));

await browser.disconnect(); // Utiliser disconnect() au lieu de close()
