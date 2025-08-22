/**
 * Exemple d'intégration NordVPN + WhatsApp
 * Montre comment utiliser le service pour l'automatisation WhatsApp
 */

import { NordVPNService } from './index.js';
import { whatsappConfig } from './config.js';
import { sleep } from '../helpers.js';

/**
 * Classe d'exemple pour automatisation WhatsApp avec NordVPN
 */
class WhatsAppVPNExample {
  constructor() {
    this.vpnService = new NordVPNService(whatsappConfig);
    this.isRunning = false;
    this.stats = {
      cyclesCompleted: 0,
      accountsCreated: 0,
      errors: 0,
      startTime: null
    };
  }

  /**
   * Démarrage de l'exemple
   */
  async start() {
    console.log('🚀 Démarrage exemple WhatsApp + NordVPN...');

    // Initialisation du service VPN
    await this.vpnService.initialize();

    // Configuration des gestionnaires d'événements
    this.setupEventHandlers();

    // Démarrage du cycle principal
    this.isRunning = true;
    this.stats.startTime = new Date();

    console.log('✅ Exemple démarré - Appuyez sur Ctrl+C pour arrêter');
    await this.mainCycle();
  }

  /**
   * Configuration des événements VPN
   */
  setupEventHandlers() {
    // Monitoring de santé
    this.vpnService.monitor.on('health:healthy', (status) => {
      console.log(`✅ VPN sain - ${status.details.vpn.server} (${status.details.ipStability.currentIP})`);
    });

    this.vpnService.monitor.on('health:degraded', (status) => {
      console.log(`⚠️ VPN dégradé - ${status.details.vpn.server}`);
    });

    this.vpnService.monitor.on('health:error', (status) => {
      console.log(`❌ VPN erreur - ${status.error}`);
    });

    // Alertes
    this.vpnService.monitor.on('alert:disconnected', async () => {
      console.log('🔴 VPN déconnecté - Tentative de reconnexion...');
      try {
        await this.vpnService.connectToCountry('ca');
      } catch (error) {
        console.error('❌ Échec reconnexion:', error.message);
      }
    });

    this.vpnService.monitor.on('alert:low_stability', (data) => {
      console.log(`📉 Stabilité VPN basse: ${data.score}%`);
    });

    // Rotations réussies
    this.vpnService.rotator.on('rotation:success', (data) => {
      console.log(`🔄 Rotation réussie: ${data.server} -> ${data.newIP}`);
    });

    this.vpnService.rotator.on('rotation:error', (data) => {
      console.log(`❌ Échec rotation: ${data.error}`);
      this.stats.errors++;
    });
  }

  /**
   * Cycle principal d'automatisation
   */
  async mainCycle() {
    console.log('\n📱 Cycle d\'automatisation WhatsApp démarré');
    console.log('🔄 Rotation toutes les 10 minutes avec vérification\n');

    while (this.isRunning) {
      try {
        // Étape 1: Rotation VPN
        console.log(`\n🔄 [Cycle ${this.stats.cyclesCompleted + 1}] Rotation VPN...`);
        const rotationResult = await this.vpnService.rotator.rotateForWhatsApp({
          country: 'ca',
          minInterval: 0, // Pas de délai minimum pour l'exemple
          verifyConnection: true,
          maxRetries: 3
        });

        if (rotationResult.success) {
          console.log(`✅ Rotation réussie: ${rotationResult.newIP}`);

          // Étape 2: Simulation d'actions WhatsApp
          await this.simulateWhatsAppActions(rotationResult.newIP);

          this.stats.cyclesCompleted++;
          this.stats.accountsCreated++; // Simulation

          // Afficher les statistiques
          this.displayStats();

        } else {
          console.log(`❌ Échec rotation: ${rotationResult.error}`);
          this.stats.errors++;
        }

        // Attendre avant la prochaine rotation (10 minutes)
        console.log('⏳ Attente 10 minutes avant la prochaine rotation...\n');
        await sleep(600000); // 10 minutes

      } catch (error) {
        console.error('❌ Erreur cycle principal:', error.message);
        this.stats.errors++;

        // Attendre avant retry
        console.log('⏳ Attente 30 secondes avant retry...');
        await sleep(30000);
      }
    }
  }

  /**
   * Simulation d'actions WhatsApp
   */
  async simulateWhatsAppActions(ip) {
    console.log(`📱 Simulation actions WhatsApp avec IP: ${ip}`);

    // Simulation de différentes étapes
    const steps = [
      'Connexion à WhatsApp',
      'Vérification du numéro',
      'Envoi du code SMS',
      'Validation du compte',
      'Configuration du profil'
    ];

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      console.log(`  ${i + 1}. ${step}...`);
      await sleep(2000 + Math.random() * 3000); // 2-5 secondes
    }

    console.log('✅ Simulation terminée avec succès');
  }

  /**
   * Affichage des statistiques
   */
  displayStats() {
    const uptime = this.stats.startTime ? Date.now() - this.stats.startTime.getTime() : 0;
    const uptimeHours = Math.round(uptime / (1000 * 60 * 60) * 100) / 100;

    console.log('\n📊 Statistiques:');
    console.log(`   Cycles complétés: ${this.stats.cyclesCompleted}`);
    console.log(`   Comptes créés: ${this.stats.accountsCreated}`);
    console.log(`   Erreurs: ${this.stats.errors}`);
    console.log(`   Uptime: ${uptimeHours}h`);
    console.log(`   Taux de succès: ${this.stats.cyclesCompleted > 0 ?
      Math.round((this.stats.cyclesCompleted / (this.stats.cyclesCompleted + this.stats.errors)) * 100) : 0}%`);

    // Statistiques VPN
    const vpnStats = this.vpnService.getStats();
    console.log(`   Connexions VPN: ${vpnStats.totalConnections}`);
    console.log(`   Score stabilité VPN: ${vpnStats.stabilityScore}%`);

    // Statistiques rotation
    const rotationStats = this.vpnService.rotator.getRotationStats();
    console.log(`   Rotations: ${rotationStats.totalRotations}`);
    console.log(`   Taux succès rotation: ${Math.round(rotationStats.successRate)}%`);
    console.log(`   Pays utilisés: ${rotationStats.countriesUsed.join(', ')}`);
  }

  /**
   * Rapport final
   */
  async generateReport() {
    console.log('\n📋 RAPPORT FINAL');
    console.log('================');

    // Statistiques complètes
    this.displayStats();

    // Rapport VPN détaillé
    const vpnReport = await this.vpnService.monitor.getHealthReport();
    console.log('\n🔍 État VPN:');
    console.log(`   Statut: ${vpnReport.currentHealth.status}`);
    console.log(`   Serveur: ${vpnReport.currentHealth.details.vpn?.server || 'N/A'}`);
    console.log(`   IP: ${vpnReport.currentHealth.details.ipStability?.currentIP || 'N/A'}`);

    if (vpnReport.recommendations.length > 0) {
      console.log('\n💡 Recommandations:');
      vpnReport.recommendations.forEach(rec => {
        console.log(`   • ${rec}`);
      });
    }

    // Historique récent
    const recentRotations = this.vpnService.rotator.getRecentRotations(5);
    if (recentRotations.length > 0) {
      console.log('\n🔄 5 dernières rotations:');
      recentRotations.forEach(rotation => {
        const time = new Date(rotation.timestamp).toLocaleTimeString();
        const status = rotation.success ? '✅' : '❌';
        const server = rotation.server?.split('.')[0] || 'unknown';
        const ip = rotation.newIP || rotation.error;
        console.log(`   ${status} ${time} - ${server} -> ${ip}`);
      });
    }

    console.log('\n🎯 Objectif atteint: Système de rotation d\'IP fonctionnel!');
  }

  /**
   * Arrêt propre
   */
  async stop() {
    console.log('\n⏹️ Arrêt de l\'exemple...');
    this.isRunning = false;

    // Générer le rapport final
    await this.generateReport();

    // Nettoyage
    await this.vpnService.cleanup();

    console.log('✅ Exemple arrêté proprement');
  }
}

// Fonction principale
async function main() {
  const example = new WhatsAppVPNExample();

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

// Lancer l'exemple si fichier exécuté directement
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { WhatsAppVPNExample };
export default WhatsAppVPNExample;
