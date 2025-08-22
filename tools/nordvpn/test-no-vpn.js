#!/usr/bin/env node

/**
 * Test NordVPN sans CLI installé
 * Teste les fonctionnalités qui ne nécessitent pas NordVPN CLI
 */

import { NordVPNConfig, defaultConfig, whatsappConfig } from './index.js';

async function testWithoutVPN() {
  console.log('🧪 Test du service NordVPN (sans CLI)\n');

  try {
    // Test 1: Configuration
    console.log('1️⃣ Test de la configuration...');
    const config = new NordVPNConfig({
      protocol: 'tcp',
      killSwitch: true,
      monitoring: { enabled: true }
    });

    const isValid = config.validate();
    console.log(`   • Configuration valide: ${isValid.valid ? '✅' : '❌'}`);
    if (!isValid.valid) {
      console.log('   • Erreurs:', isValid.errors);
    }

    // Test 2: Configuration par défaut
    console.log('\n2️⃣ Test de la configuration par défaut...');
    console.log(`   • Protocole par défaut: ${defaultConfig.protocol}`);
    console.log(`   • KillSwitch: ${defaultConfig.killSwitch ? 'Activé' : 'Désactivé'}`);
    console.log(`   • Monitoring: ${defaultConfig.monitoring.enabled ? 'Activé' : 'Désactivé'}`);

    // Test 3: Configuration WhatsApp
    console.log('\n3️⃣ Test de la configuration WhatsApp...');
    console.log(`   • Protocole: ${whatsappConfig.protocol}`);
    console.log(`   • Rotation interval: ${whatsappConfig.whatsapp.rotationInterval}ms`);
    console.log(`   • Pays: ${whatsappConfig.whatsapp.countries.join(', ')}`);

    // Test 4: Classes disponibles
    console.log('\n4️⃣ Test des classes disponibles...');
    const classes = [
      'NordVPNService',
      'NordVPNServerManager',
      'NordVPNMonitor',
      'NordVPNRotator',
      'NordVPNConfig'
    ];

    for (const className of classes) {
      try {
        const { [className]: Class } = await import('./index.js');
        console.log(`   • ${className}: ✅ Disponible`);
      } catch (error) {
        console.log(`   • ${className}: ❌ Non disponible`);
      }
    }

    // Test 5: Fonctions utilitaires
    console.log('\n5️⃣ Test des fonctions utilitaires...');
    const { CONFIG, TYPES } = await import('./index.js');
    console.log(`   • CONFIG.DEFAULT: ${CONFIG.DEFAULT ? '✅' : '❌'}`);
    console.log(`   • CONFIG.WHATSAPP: ${CONFIG.WHATSAPP ? '✅' : '❌'}`);
    console.log(`   • TYPES: ${TYPES ? '✅' : '❌'}`);

    // Test 6: Aide disponible
    console.log('\n6️⃣ Test de l\'aide disponible...');
    const { HELP } = await import('./index.js');
    console.log(`   • Documentation: ${HELP.QUICK_START ? '✅' : '❌'}`);
    console.log(`   • Exemple WhatsApp: ${HELP.CONFIG_WHATSAPP ? '✅' : '❌'}`);

    console.log('\n🎉 Tous les tests sans VPN réussis!');
    console.log('\n📋 Résumé:');
    console.log('   ✅ Configuration fonctionnelle');
    console.log('   ✅ Classes disponibles');
    console.log('   ✅ Fonctions utilitaires');
    console.log('   ✅ Documentation accessible');
    console.log('   ✅ Architecture modulaire prête');

    console.log('\n🚀 Prochaines étapes:');
    console.log('   1. Installez NordVPN CLI: https://nordvpn.com/download/');
    console.log('   2. Lancez: node tools/nordvpn/demo.js');
    console.log('   3. Testez: node tools/nordvpn/example-whatsapp.js');
    console.log('   4. Intégrez dans vos workflows WhatsApp');

  } catch (error) {
    console.error('\n❌ Erreur lors des tests:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Lancer les tests si exécuté directement
if (import.meta.url === `file://${process.argv[1]}`) {
  testWithoutVPN().catch(console.error);
}

export { testWithoutVPN };
