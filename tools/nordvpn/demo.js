#!/usr/bin/env node

/**
 * Démonstration NordVPN Service
 * Script de démonstration rapide pour tester le service
 */

import { NordVPNService } from './index.js';
import { sleep } from '../helpers.js';

async function demo() {
  console.log('🎬 Démonstration du service NordVPN\n');

  const service = new NordVPNService();

  try {
    // 1. Initialisation
    console.log('1️⃣ Initialisation du service...');
    await service.initialize();
    console.log('✅ Service initialisé\n');

    // 2. Affichage des statistiques
    console.log('2️⃣ Statistiques initiales:');
    const stats = service.getStats();
    console.log(`   • Serveurs disponibles: ${stats.availableServers}`);
    console.log(`   • Connecté: ${stats.isConnected ? 'Oui' : 'Non'}`);
    console.log(`   • Pays disponibles: ${service.serverManager.getAvailableCountries().join(', ')}\n`);

    // 3. Test de sélection de serveur
    console.log('3️⃣ Test de sélection de serveur:');
    const server = await service.serverManager.selectOptimalServer('CA', 'smart');
    console.log(`   • Serveur sélectionné: ${server}\n`);

    // 4. Statistiques de pays
    console.log('4️⃣ Statistiques Canada:');
    const caStats = service.serverManager.getCountryStats('CA');
    console.log(`   • Serveurs total: ${caStats.totalServers}`);
    console.log(`   • Serveurs sains: ${caStats.healthyServers}`);
    console.log(`   • Taux de santé: ${Math.round(caStats.healthRate * 100)}%\n`);

    // 5. Test du rotateur
    console.log('5️⃣ Test du système de rotation:');
    const rotationStats = service.rotator.getRotationStats();
    console.log(`   • Peut tourner: ${rotationStats.canRotate ? 'Oui' : 'Non'}`);
    console.log(`   • Temps jusqu'à rotation: ${Math.round(rotationStats.timeUntilNextRotation / 1000)}s\n`);

    // 6. Test du monitoring (démarrage/arrêt rapide)
    console.log('6️⃣ Test du système de monitoring:');
    service.monitor.startMonitoring(10000); // 10 secondes
    console.log('   • Monitoring démarré (10s interval)');

    await sleep(2000); // Attendre un peu

    const metrics = service.monitor.getMetrics();
    console.log(`   • Statut monitoring: ${metrics.isMonitoring ? 'Actif' : 'Inactif'}`);
    console.log(`   • Score stabilité: ${metrics.stabilityScore}%`);

    service.monitor.stopMonitoring();
    console.log('   • Monitoring arrêté\n');

    // 7. Rapport de santé
    console.log('7️⃣ Rapport de santé système:');
    const healthReport = await service.monitor.getHealthReport();
    console.log(`   • Statut général: ${healthReport.currentHealth.status}`);
    console.log(`   • Recommandations: ${healthReport.recommendations.length}`);

    if (healthReport.recommendations.length > 0) {
      healthReport.recommendations.forEach((rec, i) => {
        console.log(`     ${i + 1}. ${rec}`);
      });
    }

    console.log('\n🎉 Démonstration terminée avec succès!');
    console.log('\n🚀 Le service NordVPN est prêt à être utilisé!');
    console.log('\n📖 Prochaines étapes:');
    console.log('   • Lisez tools/nordvpn/README.md pour la documentation complète');
    console.log('   • Testez tools/nordvpn/example-whatsapp.js pour l\'intégration WhatsApp');
    console.log('   • Utilisez tools/nordvpn/test.js pour les tests complets');

  } catch (error) {
    console.error('\n❌ Erreur lors de la démonstration:', error.message);
    console.error('Stack:', error.stack);

    console.log('\n🔧 Dépannage:');
    console.log('   • Vérifiez que NordVPN CLI est installé: nordvpn --version');
    console.log('   • Assurez-vous d\'être connecté à internet');
    console.log('   • Vérifiez les permissions utilisateur');

  } finally {
    // Nettoyage
    console.log('\n🧹 Nettoyage...');
    await service.cleanup();
    console.log('✅ Nettoyage terminé');
  }
}

// Lancer la démo si exécuté directement
if (import.meta.url === `file://${process.argv[1]}`) {
  demo().catch(console.error);
}

export { demo };
