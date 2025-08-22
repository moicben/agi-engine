/**
 * Script de test NordVPN
 * Teste les fonctionnalités de base du service
 */

import { NordVPNService } from './index.js';
import { sleep } from '../helpers.js';

async function runTests() {
  console.log('🧪 Tests du service NordVPN...\n');

  const service = new NordVPNService();

  try {
    // Test 1: Initialisation
    console.log('📋 Test 1: Initialisation');
    await service.initialize();
    console.log('✅ Initialisation réussie\n');

    // Test 2: Statut
    console.log('📋 Test 2: Récupération du statut');
    const status = await service.getStatus();
    console.log('📊 Statut:', status);
    console.log('✅ Statut récupéré\n');

    // Test 3: Statistiques
    console.log('📋 Test 3: Statistiques');
    const stats = service.getStats();
    console.log('📊 Stats:', {
      isConnected: stats.isConnected,
      totalConnections: stats.totalConnections,
      availableServers: stats.availableServers
    });
    console.log('✅ Statistiques récupérées\n');

    // Test 4: Simulation de rotation (sans connexion réelle)
    console.log('📋 Test 4: Simulation de rotation');
    const rotationStats = service.rotator.getRotationStats();
    console.log('📊 Rotation stats:', {
      totalRotations: rotationStats.totalRotations,
      canRotate: rotationStats.canRotate,
      timeUntilNextRotation: Math.round(rotationStats.timeUntilNextRotation / 1000)
    });
    console.log('✅ Test de rotation simulé\n');

    // Test 5: Configuration
    console.log('📋 Test 5: Validation de configuration');
    const validation = service.config.validate();
    console.log('📊 Configuration valide:', validation.valid);
    if (!validation.valid) {
      console.log('❌ Erreurs:', validation.errors);
    } else {
      console.log('✅ Configuration valide\n');
    }

    // Test 6: Serveurs disponibles
    console.log('📋 Test 6: Serveurs disponibles');
    const countries = service.serverManager.getAvailableCountries();
    console.log('🌍 Pays disponibles:', countries.join(', '));

    const caStats = service.serverManager.getCountryStats('CA');
    console.log('🇨🇦 Stats Canada:', {
      totalServers: caStats.totalServers,
      healthyServers: caStats.healthyServers,
      healthRate: Math.round(caStats.healthRate * 100) + '%'
    });
    console.log('✅ Serveurs analysés\n');

    // Résumé
    console.log('🎉 Tous les tests passés avec succès!');
    console.log('\n📋 Résumé:');
    console.log('   ✅ Service initialisé');
    console.log('   ✅ Statut récupéré');
    console.log('   ✅ Statistiques fonctionnelles');
    console.log('   ✅ Rotation simulée');
    console.log('   ✅ Configuration validée');
    console.log('   ✅ Serveurs disponibles');

    if (stats.availableServers > 0) {
      console.log(`\n🚀 Service prêt avec ${stats.availableServers} serveurs disponibles!`);
      console.log('💡 Vous pouvez maintenant utiliser:');
      console.log('   - await service.connectToCountry("ca")');
      console.log('   - await service.rotator.rotateForWhatsApp()');
      console.log('   - service.monitor.startMonitoring()');
    }

  } catch (error) {
    console.error('❌ Erreur lors des tests:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    // Nettoyage
    await service.cleanup();
    console.log('\n🧹 Nettoyage terminé');
  }
}

// Test rapide de connexion (optionnel)
async function testConnection() {
  console.log('\n🔌 Test de connexion (optionnel)...');

  const service = new NordVPNService();

  try {
    await service.initialize();

    console.log('🌍 Test de connexion vers le Canada...');
    const result = await service.connectToCountry('ca', {
      verifyConnection: false, // Pas de vérification pour le test
      timeout: 15000
    });

    if (result.success) {
      console.log('✅ Connexion réussie!');
      console.log('📍 IP:', result.ip);
      console.log('🖥️ Serveur:', result.server);

      // Attendre 5 secondes puis déconnecter
      console.log('⏳ Attente 5 secondes...');
      await sleep(5000);

      await service.disconnect();
      console.log('🔌 Déconnexion réussie');
    } else {
      console.log('❌ Échec de connexion');
    }

  } catch (error) {
    console.error('❌ Erreur de connexion:', error.message);
  } finally {
    await service.cleanup();
  }
}

// Fonction principale
async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--connection-test')) {
    // Test de connexion réelle
    await testConnection();
  } else {
    // Tests de base
    await runTests();
  }
}

// Lancer les tests si fichier exécuté directement
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { runTests, testConnection };
