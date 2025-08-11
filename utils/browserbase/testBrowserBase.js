// Test de la fonction launchBrowserBase avec possibilité d'utiliser les proxies

import { launchBrowserBase, waitForTimeout, closeBrowserBase } from './launchBrowserBase.js';

console.log('🧪 Test de BrowserBase...');

try {
  // Lancer le navigateur BrowserBase
  const { browser, page, sessionId, connectUrl } = await launchBrowserBase({
    useProxy: true,         // Activer les proxies résidentiels
    region: 'eu-central-1',    // Région du serveur
    viewport: { width: 1920, height: 1080 },
    timeout: 3600,          // Timeout de session en secondes (max 21600)
    puppeteerTimeout: 60000, // Timeout de connexion Puppeteer en millisecondes
    keepAlive: false        // Ne pas maintenir la session active
  });

  console.log('📊 Informations de session:');
  console.log(`   Session ID: ${sessionId}`);
  console.log(`   Connect URL: ${connectUrl}`);

  // Naviguer vers un site de test
  console.log('🌐 Navigation vers Google...');
  await page.goto('https://www.google.com');

  // Attendre que la page se charge
  await waitForTimeout(3000);

  // Prendre une capture d'écran pour vérifier
  console.log('📸 Capture d\'écran...');
  await page.screenshot({ path: 'test-browserbase.png' });

  // Optionnel: tester la géolocalisation/IP
  console.log('📍 Test de localisation...');
  await page.goto('https://mylocation.org/');
  await waitForTimeout(5000);

  // Prendre une capture d'écran de la localisation
  await page.screenshot({ path: 'test-browserbase-location.png' });

  console.log('✅ Test terminé avec succès!');
  console.log('📷 Captures d\'écran sauvegardées:');
  console.log('   - test-browserbase.png');
  console.log('   - test-browserbase-location.png');

  // Attendre un moment pour visualiser si nécessaire
  console.log('⏳ Attente de 10 secondes avant fermeture...');
  await waitForTimeout(10000);

  // Fermer le navigateur proprement
  await closeBrowserBase(browser, sessionId);

} catch (error) {
  console.error('❌ Erreur lors du test:', error.message);
  console.error(error.stack);
  process.exit(1);
} 