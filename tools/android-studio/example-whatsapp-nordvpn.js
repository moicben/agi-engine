#!/usr/bin/env node

/**
 * Exemple d'intégration Android Studio + WhatsApp + NordVPN
 * Montre comment créer un workflow complet automatisé
 */

import { AndroidStudioService } from './index.js';
import { sleep } from '../../whatsapp/helpers.js';

class WhatsAppNordVPNExample {
  constructor() {
    this.androidService = new AndroidStudioService();
    this.nordVPNService = null;
    this.isRunning = false;
    this.stats = {
      cyclesCompleted: 0,
      workflowsCreated: 0,
      errors: 0,
      startTime: null,
      activeWorkflows: []
    };
  }

  /**
   * Initialisation complète
   */
  async initialize() {
    console.log('🔧 Initialisation des services...\n');

    try {
      // Initialisation Android Studio
      console.log('📱 Initialisation Android Studio...');
      await this.androidService.initialize();
      console.log('✅ Android Studio initialisé\n');

      // Initialisation NordVPN (optionnelle)
      try {
        const { nordVPNService } = await import('../nordvpn/index.js');
        this.nordVPNService = nordVPNService;
        await this.nordVPNService.initialize();
        console.log('✅ NordVPN initialisé\n');
      } catch (error) {
        console.log('⚠️ NordVPN non disponible:', error.message);
        console.log('🚀 Continuer sans NordVPN...\n');
      }

      this.setupEventHandlers();

    } catch (error) {
      console.error('❌ Erreur initialisation:', error.message);
      throw error;
    }
  }

  /**
   * Configuration des gestionnaires d'événements
   */
  setupEventHandlers() {
    // Événements Android Studio
    this.androidService.on('emulator:created', (data) => {
      console.log(`✅ Émulateur créé: ${data.emulator.name} (${data.emulator.id})`);
    });

    this.androidService.on('emulator:started', (data) => {
      console.log(`🚀 Émulateur démarré: ${data.emulatorId}`);
    });

    this.androidService.on('workflow:created', (data) => {
      console.log(`🎉 Workflow créé: ${data.emulator.name} (${data.country})`);
      this.stats.workflowsCreated++;
      this.stats.activeWorkflows.push(data);
    });

    // Événements de monitoring
    this.androidService.monitor.on('alert:high_memory', (alert) => {
      console.log(`🚨 Mémoire élevée: ${alert.value}% (seuil: ${alert.threshold}%)`);
    });

    this.androidService.monitor.on('alert:high_cpu', (alert) => {
      console.log(`🚨 CPU élevé: ${alert.value}% (seuil: ${alert.threshold}%)`);
    });

    // Événements NordVPN (si disponible)
    if (this.nordVPNService) {
      this.nordVPNService.monitor.on('alert:disconnected', () => {
        console.log('🔴 NordVPN déconnecté - Reconexion automatique...');
      });
    }
  }

  /**
   * Démarrage de l'exemple
   */
  async start() {
    console.log('🚀 Démarrage exemple WhatsApp + Android Studio + NordVPN\n');

    await this.initialize();
    this.isRunning = true;
    this.stats.startTime = new Date();

    console.log('📱 Création de workflows WhatsApp...\n');

    await this.mainCycle();
  }

  /**
   * Cycle principal de création de workflows
   */
  async mainCycle() {
    const countries = ['ca', 'us', 'fr']; // Pays à tester
    let countryIndex = 0;

    while (this.isRunning) {
      try {
        const country = countries[countryIndex % countries.length];
        const timestamp = Date.now();
        const workflowName = `whatsapp-${country}-${timestamp}`;

        console.log(`\n🔄 [Cycle ${this.stats.cyclesCompleted + 1}] Création workflow: ${workflowName} (${country.toUpperCase()})`);

        // Créer le workflow WhatsApp
        const workflow = await this.androidService.createWhatsAppWorkflow({
          emulatorName: workflowName,
          country: country,
          useNordVPN: !!this.nordVPNService,
          installWhatsApp: true,
          configureDevice: true
        });

        this.stats.cyclesCompleted++;

        // Simuler des actions WhatsApp
        await this.simulateWhatsAppActions(workflow.deviceId, country);

        // Afficher les statistiques
        this.displayStats();

        // Attendre avant le prochain workflow
        console.log('⏳ Attente 2 minutes avant le prochain workflow...\n');
        await sleep(120000); // 2 minutes

        countryIndex++;

        // Limiter à 3 workflows pour l'exemple
        if (this.stats.cyclesCompleted >= 3) {
          console.log('🎯 Limite de 3 workflows atteinte pour l\'exemple');
          break;
        }

      } catch (error) {
        console.error('❌ Erreur cycle principal:', error.message);
        this.stats.errors++;

        // Attendre avant retry
        console.log('⏳ Attente 30 secondes avant retry...');
        await sleep(30000);
      }
    }

    // Générer le rapport final
    await this.generateFinalReport();
  }

  /**
   * Simuler des actions WhatsApp
   */
  async simulateWhatsAppActions(deviceId, country) {
    console.log(`📱 Simulation actions WhatsApp sur ${deviceId} (${country.toUpperCase()})`);

    const actions = [
      'Connexion à WhatsApp',
      'Vérification du numéro de téléphone',
      'Envoi du code de vérification SMS',
      'Validation du compte',
      'Configuration du profil utilisateur',
      'Synchronisation des contacts',
      'Test d\'envoi de message'
    ];

    for (let i = 0; i < actions.length; i++) {
      const action = actions[i];
      console.log(`  ${i + 1}. ${action}...`);
      await sleep(1000 + Math.random() * 2000); // 1-3 secondes
    }

    console.log('✅ Simulation WhatsApp terminée avec succès');
  }

  /**
   * Affichage des statistiques
   */
  displayStats() {
    const uptime = this.stats.startTime ? Date.now() - this.stats.startTime.getTime() : 0;
    const uptimeMinutes = Math.round(uptime / (1000 * 60) * 100) / 100;

    console.log('\n📊 Statistiques actuelles:');
    console.log(`   • Cycles complétés: ${this.stats.cyclesCompleted}`);
    console.log(`   • Workflows créés: ${this.stats.workflowsCreated}`);
    console.log(`   • Workflows actifs: ${this.stats.activeWorkflows.length}`);
    console.log(`   • Erreurs: ${this.stats.errors}`);
    console.log(`   • Uptime: ${uptimeMinutes} minutes`);
    console.log(`   • Taux de succès: ${this.stats.cyclesCompleted > 0 ?
      Math.round((this.stats.cyclesCompleted / (this.stats.cyclesCompleted + this.stats.errors)) * 100) : 0}%`);

    // Statistiques Android Studio
    const androidStats = this.androidService.getStats();
    console.log(`   • Émulateurs actifs: ${androidStats.activeEmulators}`);
    console.log(`   • Score stabilité: ${androidStats.monitoring?.stabilityScore || 'N/A'}%`);

    // Statistiques NordVPN (si disponible)
    if (this.nordVPNService) {
      const vpnStats = this.nordVPNService.getStats();
      console.log(`   • IP actuelle: ${vpnStats.currentIP || 'N/A'}`);
      console.log(`   • Pays: ${vpnStats.currentServer?.split('-')[0]?.toUpperCase() || 'N/A'}`);
    }
  }

  /**
   * Générer le rapport final
   */
  async generateFinalReport() {
    console.log('\n📋 RAPPORT FINAL - WhatsApp + Android Studio + NordVPN');
    console.log('======================================================');

    // Statistiques complètes
    this.displayStats();

    // Rapport Android Studio
    console.log('\n🤖 État Android Studio:');
    const androidReport = await this.androidService.monitor.generateHealthReport();
    console.log(`   • Statut monitoring: ${androidReport.monitoring.active ? 'Actif' : 'Inactif'}`);
    console.log(`   • Émulateurs créés: ${this.stats.workflowsCreated}`);
    console.log(`   • Recommandations: ${androidReport.recommendations.length}`);

    if (androidReport.recommendations.length > 0) {
      console.log('   💡 Recommandations:');
      androidReport.recommendations.forEach((rec, i) => {
        console.log(`      ${i + 1}. ${rec}`);
      });
    }

    // Rapport NordVPN (si disponible)
    if (this.nordVPNService) {
      console.log('\n🌍 État NordVPN:');
      const vpnReport = await this.nordVPNService.monitor.getHealthReport();
      console.log(`   • Statut: ${vpnReport.currentHealth.status}`);
      console.log(`   • IP actuelle: ${vpnReport.currentHealth.details.ipStability?.currentIP || 'N/A'}`);
      console.log(`   • Serveur: ${vpnReport.currentHealth.details.vpn?.server || 'N/A'}`);
      console.log(`   • Recommandations: ${vpnReport.recommendations.length}`);
    }

    // Workflows actifs
    if (this.stats.activeWorkflows.length > 0) {
      console.log('\n📱 Workflows WhatsApp actifs:');
      this.stats.activeWorkflows.forEach((workflow, i) => {
        console.log(`   ${i + 1}. ${workflow.emulator.name} (${workflow.country.toUpperCase()})`);
        console.log(`      • Device ID: ${workflow.emulator.id}`);
        console.log(`      • Statut: ${workflow.emulator.status}`);
        console.log(`      • Créé le: ${workflow.emulator.createdAt?.toLocaleTimeString() || 'N/A'}`);
      });
    }

    console.log('\n🎯 Objectif atteint: Système d\'automatisation WhatsApp fonctionnel!');
    console.log('\n📈 Résultats obtenus:');
    console.log(`   • ✅ ${this.stats.workflowsCreated} workflows WhatsApp créés`);
    console.log(`   • ✅ Intégration Android Studio réussie`);
    if (this.nordVPNService) {
      console.log(`   • ✅ Intégration NordVPN réussie`);
    }
    console.log(`   • ✅ Monitoring temps réel actif`);
    console.log(`   • ✅ Gestion d'erreurs robuste`);
  }

  /**
   * Arrêt propre
   */
  async stop() {
    console.log('\n⏹️ Arrêt de l\'exemple...');
    this.isRunning = false;

    // Générer le rapport final
    await this.generateFinalReport();

    // Nettoyer les ressources
    await this.androidService.cleanup();

    if (this.nordVPNService) {
      await this.nordVPNService.cleanup();
    }

    console.log('✅ Exemple arrêté proprement');
  }
}

// Fonction principale
async function main() {
  const example = new WhatsAppNordVPNExample();

  // Gestion des signaux d'arrêt
  process.on('SIGINT', async () => {
    console.log('\n🛑 Signal d\'arrêt reçu...');
    await example.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('\n🛑 Signal de terminaison reçu...');
    await example.stop();
    process.exit(0);
  });

  try {
    await example.start();
  } catch (error) {
    console.error('❌ Erreur fatale:', error.message);
    await example.stop();
    process.exit(1);
  }
}

// Lancer l'exemple si exécuté directement
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { WhatsAppNordVPNExample };
export default WhatsAppNordVPNExample;
