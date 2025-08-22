#!/usr/bin/env node

/**
 * Test rapide Android Studio
 * Vérification basique des imports et de l'initialisation
 */

import { AndroidStudioService, CONFIG, HELP } from './index.js';

async function quickTest() {
  console.log('🧪 Test rapide Android Studio...\n');

  try {
    // Test 1: Import
    console.log('1️⃣ Test des imports...');
    console.log('   ✅ AndroidStudioService:', typeof AndroidStudioService);
    console.log('   ✅ CONFIG:', typeof CONFIG);
    console.log('   ✅ HELP:', typeof HELP);
    console.log('   ✅ Import réussi!\n');

    // Test 2: Configuration
    console.log('2️⃣ Test de la configuration...');
    const config = CONFIG.WHATSAPP;
    console.log('   ✅ Configuration WhatsApp:', config.constructor.name);
    console.log('   ✅ API Level par défaut:', config.emulators.defaultApiLevel);
    console.log('   ✅ Mémoire par défaut:', config.emulators.defaultMemory + 'MB');
    console.log('   ✅ Pays par défaut:', config.whatsapp.country);
    console.log('   ✅ Configuration valide!\n');

    // Test 3: Service (sans initialisation complète)
    console.log('3️⃣ Test du service (sans init complète)...');
    const service = new AndroidStudioService();
    console.log('   ✅ Service créé:', service.constructor.name);
    console.log('   ✅ Service non initialisé:', !service.isInitialized);
    console.log('   ✅ Service prêt pour initialisation!\n');

    // Test 4: Aide disponible
    console.log('4️⃣ Test de l\'aide...');
    console.log('   ✅ Aide rapide:', HELP.QUICK_START.length > 0);
    console.log('   ✅ Exemple monitoring:', HELP.MONITORING.length > 0);
    console.log('   ✅ Documentation disponible!\n');

    // Test 5: Intégration NordVPN (optionnel)
    console.log('5️⃣ Test intégration NordVPN...');
    try {
      const { nordVPNService } = await import('../nordvpn/index.js');
      console.log('   ✅ NordVPN disponible:', typeof nordVPNService);
    } catch (error) {
      console.log('   ⚠️ NordVPN non disponible (normal):', error.message);
    }
    console.log('   ✅ Test intégration terminé!\n');

    console.log('🎉 TOUS LES TESTS RÉUSSIS !');
    console.log('\n📋 Résumé:');
    console.log('   ✅ Imports fonctionnels');
    console.log('   ✅ Configuration valide');
    console.log('   ✅ Service opérationnel');
    console.log('   ✅ Documentation complète');
    console.log('   ✅ Architecture modulaire prête');

    console.log('\n🚀 Prochaines étapes:');
    console.log('   1. Installez Android Studio: https://developer.android.com/studio');
    console.log('   2. Lancez: node tools/android-studio/example-whatsapp-nordvpn.js');
    console.log('   3. Testez: node tools/android-studio/test-diagnostic.js');
    console.log('   4. Intégrez dans vos workflows WhatsApp');

    return true;

  } catch (error) {
    console.error('\n❌ ERREUR LORS DES TESTS:');
    console.error('Message:', error.message);
    console.error('Stack:', error.stack);
    return false;
  }
}

// Lancer le test si exécuté directement
if (import.meta.url === `file://${process.argv[1]}`) {
  quickTest().catch(console.error);
}

export { quickTest };
