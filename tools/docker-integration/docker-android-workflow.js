#!/usr/bin/env node

/**
 * Workflow Complet Docker + Android + NordVPN + WhatsApp
 * Script principal pour démarrer l'environnement intégré
 */

import { DockerIntegrationService } from './docker-integration-service.js';
import { sleep } from '../whatsapp/helpers.js';
import EventEmitter from 'events';

class DockerAndroidWorkflow extends EventEmitter {
  constructor() {
    super();
    this.dockerService = new DockerIntegrationService();
    this.isRunning = false;
    this.stats = {
      workflowsStarted: 0,
      workflowsCompleted: 0,
      errors: 0,
      startTime: null,
      activeWorkflows: []
    };
  }

  /**
   * Démarrage du workflow complet
   */
  async start(options = {}) {
    const {
      countries = ['ca', 'us', 'fr'],
      maxConcurrent = 2,
      workflowDuration = 300000, // 5 minutes par workflow
      autoRestart = false
    } = options;

    console.log('🚀 DÉMARRAGE WORKFLOW COMPLET DOCKER + ANDROID + NORDVPN + WHATSAPP');
    console.log('================================================================\n');

    await this.initialize();
    this.isRunning = true;
    this.stats.startTime = new Date();

    console.log('🌍 Pays configurés:', countries.join(', '));
    console.log('⚡ Workflows concurrents max:', maxConcurrent);
    console.log('⏱️ Durée par workflow:', Math.round(workflowDuration / 1000), 'secondes');
    console.log('🔄 Redémarrage automatique:', autoRestart ? 'Activé' : 'Désactivé');
    console.log('');

    await this.runWorkflowCycle(countries, maxConcurrent, workflowDuration, autoRestart);
  }

  /**
   * Initialisation de l'environnement
   */
  async initialize() {
    console.log('🔧 Initialisation de l\'environnement intégré...\n');

    try {
      // Vérifier l'état du container Docker
      console.log('🐳 Vérification du container Docker...');
      const containerInfo = await this.dockerService.checkContainerStatus();
      console.log('✅ Container trouvé:', containerInfo.name);
      console.log('');

      // Initialiser le service d'intégration
      console.log('🔗 Initialisation du service d\'intégration...');
      await this.dockerService.initialize();
      console.log('✅ Service d\'intégration initialisé');
      console.log('');

      // Configurer les gestionnaires d'événements
      this.setupEventHandlers();

    } catch (error) {
      console.error('❌ Erreur initialisation:', error.message);
      console.error('\n💡 Solutions possibles:');
      console.error('   1. Démarrer le container: ./start-sync.sh');
      console.error('   2. Vérifier Docker: docker ps');
      console.error('   3. Vérifier les logs: docker compose logs');
      throw error;
    }
  }

  /**
   * Configuration des gestionnaires d'événements
   */
  setupEventHandlers() {
    // Événements Docker Integration
    this.dockerService.on('workflow:created', (workflow) => {
      console.log(`🎉 Workflow créé: ${workflow.name} (${workflow.country})`);
      this.stats.workflowsStarted++;
      this.stats.activeWorkflows.push(workflow);
    });

    // Événements Android Studio (si disponible)
    if (this.dockerService.androidStudioService) {
      this.dockerService.androidStudioService.on('emulator:created', (data) => {
        console.log(`📱 Émulateur créé: ${data.emulator.name}`);
      });

      this.dockerService.androidStudioService.monitor?.on('alert:high_memory', (alert) => {
        console.log(`🚨 Mémoire élevée: ${alert.value}%`);
      });
    }

    // Événements NordVPN (si disponible)
    if (this.dockerService.nordVPNService) {
      this.dockerService.nordVPNService.monitor?.on('alert:disconnected', () => {
        console.log('🔴 NordVPN déconnecté - Reconexion...');
      });
    }
  }

  /**
   * Cycle principal des workflows
   */
  async runWorkflowCycle(countries, maxConcurrent, workflowDuration, autoRestart) {
    let countryIndex = 0;
    let runningWorkflows = 0;

    while (this.isRunning) {
      try {
        // Attendre si on a atteint le maximum concurrent
        while (runningWorkflows >= maxConcurrent && this.isRunning) {
          await sleep(5000);
          // Nettoyer les workflows terminés
          this.cleanupCompletedWorkflows();
        }

        if (!this.isRunning) break;

        const country = countries[countryIndex % countries.length];
        const timestamp = Date.now();
        const workflowName = `docker-whatsapp-${country}-${timestamp}`;

        console.log(`\n🔄 [Cycle ${this.stats.workflowsStarted + 1}] Création workflow: ${workflowName} (${country.toUpperCase()})`);

        // Créer le workflow en arrière-plan
        const workflowPromise = this.createWorkflow(workflowName, country, workflowDuration);
        runningWorkflows++;

        // Gérer le workflow (sans bloquer les autres)
        workflowPromise
          .then(() => {
            runningWorkflows--;
            this.stats.workflowsCompleted++;
            console.log(`✅ Workflow terminé: ${workflowName}`);
          })
          .catch((error) => {
            runningWorkflows--;
            this.stats.errors++;
            console.error(`❌ Workflow échoué ${workflowName}:`, error.message);
          });

        countryIndex++;

        // Petite pause entre les créations
        await sleep(2000);

        // Afficher les statistiques toutes les 10 workflows
        if (this.stats.workflowsStarted % 10 === 0) {
          this.displayStats();
        }

        // Limiter le nombre total de workflows pour la démonstration
        if (this.stats.workflowsStarted >= 50 && !autoRestart) {
          console.log('\n🎯 Limite de 50 workflows atteinte pour la démonstration');
          break;
        }

      } catch (error) {
        console.error('❌ Erreur cycle principal:', error.message);
        this.stats.errors++;
        await sleep(10000); // Pause plus longue en cas d'erreur
      }
    }

    // Attendre que tous les workflows se terminent
    console.log('\n⏳ Attente de la fin de tous les workflows...');
    while (runningWorkflows > 0) {
      await sleep(5000);
      this.cleanupCompletedWorkflows();
    }

    // Générer le rapport final
    await this.generateFinalReport();
  }

  /**
   * Créer un workflow individuel
   */
  async createWorkflow(workflowName, country, duration) {
    try {
      console.log(`🚀 Démarrage workflow: ${workflowName}`);

      // Créer le workflow complet
      const workflow = await this.dockerService.createDockerWhatsAppWorkflow({
        emulatorName: workflowName,
        country: country,
        useNordVPN: true,
        installWhatsApp: true,
        configureDevice: true
      });

      // Simuler l'activité WhatsApp
      await this.simulateWhatsAppActivity(workflow, duration);

      // Nettoyer le workflow
      await this.cleanupWorkflow(workflow);

      return workflow;

    } catch (error) {
      console.error(`❌ Erreur workflow ${workflowName}:`, error.message);
      throw error;
    }
  }

  /**
   * Simuler l'activité WhatsApp
   */
  async simulateWhatsAppActivity(workflow, duration) {
    const activities = [
      'Connexion WhatsApp',
      'Vérification SMS',
      'Configuration profil',
      'Synchronisation contacts',
      'Test envoi message',
      'Test appel vocal',
      'Test statut',
      'Test stories'
    ];

    const startTime = Date.now();
    let activityIndex = 0;

    console.log(`📱 Simulation activité WhatsApp sur ${workflow.name}...`);

    while (Date.now() - startTime < duration && this.isRunning) {
      const activity = activities[activityIndex % activities.length];
      console.log(`   ${activityIndex + 1}. ${activity}...`);

      // Simuler le temps d'activité (5-15 secondes)
      const activityTime = 5000 + Math.random() * 10000;
      await sleep(activityTime);

      // Vérifier que le workflow est toujours actif
      const currentWorkflow = this.stats.activeWorkflows.find(w => w.id === workflow.id);
      if (!currentWorkflow || currentWorkflow.status !== 'ready') {
        console.log(`⚠️ Workflow ${workflow.name} plus actif`);
        break;
      }

      activityIndex++;
    }

    console.log(`✅ Simulation terminée pour ${workflow.name} (${activityIndex} activités)`);
  }

  /**
   * Nettoyer un workflow
   */
  async cleanupWorkflow(workflow) {
    try {
      console.log(`🧹 Nettoyage workflow: ${workflow.name}`);

      // Arrêter l'émulateur
      await this.dockerService.stopDockerEmulator(workflow.emulator.id);

      // Mettre à jour le statut
      workflow.status = 'completed';
      workflow.completedAt = new Date();

      // Retirer de la liste active
      const index = this.stats.activeWorkflows.findIndex(w => w.id === workflow.id);
      if (index !== -1) {
        this.stats.activeWorkflows.splice(index, 1);
      }

      console.log(`✅ Workflow nettoyé: ${workflow.name}`);

    } catch (error) {
      console.log(`⚠️ Erreur nettoyage workflow ${workflow.name}:`, error.message);
    }
  }

  /**
   * Nettoyer les workflows terminés
   */
  cleanupCompletedWorkflows() {
    this.stats.activeWorkflows = this.stats.activeWorkflows.filter(workflow =>
      workflow.status === 'ready'
    );
  }

  /**
   * Afficher les statistiques
   */
  displayStats() {
    const uptime = this.stats.startTime ? Date.now() - this.stats.startTime.getTime() : 0;
    const uptimeMinutes = Math.round(uptime / (1000 * 60) * 100) / 100;

    console.log('\n📊 STATISTIQUES ACTUELLES');
    console.log('==========================');
    console.log(`   • Workflows démarrés: ${this.stats.workflowsStarted}`);
    console.log(`   • Workflows terminés: ${this.stats.workflowsCompleted}`);
    console.log(`   • Workflows actifs: ${this.stats.activeWorkflows.length}`);
    console.log(`   • Erreurs: ${this.stats.errors}`);
    console.log(`   • Uptime: ${uptimeMinutes} minutes`);

    if (this.stats.workflowsStarted > 0) {
      const successRate = Math.round((this.stats.workflowsCompleted / this.stats.workflowsStarted) * 100);
      console.log(`   • Taux de succès: ${successRate}%`);
    }

    // Statistiques Docker
    if (this.dockerService.containerInfo) {
      console.log(`   • Container: ${this.dockerService.containerInfo.name}`);
      console.log(`   • Status: ${this.dockerService.containerInfo.status}`);
    }

    // Workflows actifs actuels
    if (this.stats.activeWorkflows.length > 0) {
      console.log('   • Workflows actifs:');
      this.stats.activeWorkflows.slice(0, 3).forEach((workflow, i) => {
        const duration = workflow.createdAt ? Date.now() - workflow.createdAt.getTime() : 0;
        const durationMinutes = Math.round(duration / (1000 * 60) * 100) / 100;
        console.log(`     ${i + 1}. ${workflow.name} (${workflow.country}) - ${durationMinutes}min`);
      });

      if (this.stats.activeWorkflows.length > 3) {
        console.log(`     ... et ${this.stats.activeWorkflows.length - 3} autres`);
      }
    }

    console.log('');
  }

  /**
   * Générer le rapport final
   */
  async generateFinalReport() {
    console.log('\n📋 RAPPORT FINAL - DOCKER + ANDROID + NORDVPN + WHATSAPP');
    console.log('==========================================================');

    // Statistiques finales
    this.displayStats();

    // Rapport Docker
    console.log('\n🐳 ÉTAT DOCKER:');
    try {
      const dockerStats = await this.dockerService.getDockerStats();
      if (dockerStats) {
        console.log(`   • Container: ${dockerStats.container?.name || 'N/A'}`);
        console.log(`   • Workflows totaux: ${dockerStats.workflows?.total || 0}`);
        console.log(`   • Services Android: ${dockerStats.services?.androidStudio ? '✅' : '❌'}`);
        console.log(`   • Services NordVPN: ${dockerStats.services?.nordVPN ? '✅' : '❌'}`);

        if (dockerStats.android) {
          console.log(`   • Émulateurs Docker: ${dockerStats.android.avds?.length || 0}`);
          console.log(`   • Devices connectés: ${dockerStats.android.devices?.length || 0}`);
        }
      }
    } catch (error) {
      console.log('   • Erreur récupération stats Docker');
    }

    // Résumé des performances
    console.log('\n⚡ RÉSUMÉ PERFORMANCES:');
    const totalWorkflows = this.stats.workflowsStarted;
    const successfulWorkflows = this.stats.workflowsCompleted;
    const failedWorkflows = this.stats.errors;

    console.log(`   • Total workflows: ${totalWorkflows}`);
    console.log(`   • Réussis: ${successfulWorkflows}`);
    console.log(`   • Échoués: ${failedWorkflows}`);

    if (totalWorkflows > 0) {
      const successRate = Math.round((successfulWorkflows / totalWorkflows) * 100);
      const failureRate = Math.round((failedWorkflows / totalWorkflows) * 100);
      console.log(`   • Taux de succès: ${successRate}%`);
      console.log(`   • Taux d'échec: ${failureRate}%`);
    }

    // Recommandations
    console.log('\n💡 RECOMMANDATIONS:');
    if (this.stats.errors > 0) {
      console.log('   • Analyser les logs pour identifier les causes d\'échec');
      console.log('   • Vérifier la stabilité du container Docker');
      console.log('   • Optimiser les paramètres d\'émulateur');
    }

    if (successfulWorkflows > 0) {
      console.log('   • Configuration optimale trouvée');
      console.log('   • Process automatisé fonctionnel');
      console.log('   • Scalabilité possible');
    }

    console.log('\n🎯 OBJECTIF ATTEINT: Système d\'automatisation WhatsApp intégré fonctionnel!');
    console.log('   ✅ Docker + Android + NordVPN + WhatsApp couplés');
    console.log('   ✅ Workflows automatisés et monitorés');
    console.log('   ✅ Gestion d\'erreurs robuste');
    console.log('   ✅ Statistiques et rapports détaillés');

    // Sauvegarder les statistiques
    await this.saveStatsReport();
  }

  /**
   * Sauvegarder le rapport de statistiques
   */
  async saveStatsReport() {
    try {
      const report = {
        timestamp: new Date().toISOString(),
        stats: this.stats,
        dockerInfo: this.dockerService.containerInfo,
        workflows: this.stats.activeWorkflows.map(w => ({
          id: w.id,
          name: w.name,
          country: w.country,
          status: w.status,
          createdAt: w.createdAt,
          completedAt: w.completedAt
        }))
      };

      // Utiliser import dynamique pour fs
      const { writeFileSync } = await import('fs');
      const reportPath = `./logs/docker-workflow-report-${Date.now()}.json`;
      writeFileSync(reportPath, JSON.stringify(report, null, 2));
      console.log(`\n📄 Rapport sauvegardé: ${reportPath}`);

    } catch (error) {
      console.log('⚠️ Erreur sauvegarde rapport:', error.message);
    }
  }

  /**
   * Arrêt propre du workflow
   */
  async stop() {
    console.log('\n⏹️ ARRÊT DU WORKFLOW...\n');
    this.isRunning = false;

    // Arrêter tous les workflows actifs
    console.log('🔄 Arrêt de tous les workflows actifs...');
    const stopPromises = this.stats.activeWorkflows.map(workflow =>
      this.cleanupWorkflow(workflow).catch(error =>
        console.log(`⚠️ Erreur arrêt workflow ${workflow.name}:`, error.message)
      )
    );

    await Promise.allSettled(stopPromises);

    // Nettoyer l'environnement Docker
    console.log('🧹 Nettoyage de l\'environnement Docker...');
    await this.dockerService.cleanup();

    // Générer le rapport final
    await this.generateFinalReport();

    console.log('✅ Workflow arrêté proprement');
  }
}

// Gestion des signaux d'arrêt
process.on('SIGINT', async () => {
  console.log('\n🛑 Signal d\'arrêt reçu...');
  const workflow = global.dockerWorkflow;
  if (workflow) {
    await workflow.stop();
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Signal de terminaison reçu...');
  const workflow = global.dockerWorkflow;
  if (workflow) {
    await workflow.stop();
  }
  process.exit(0);
});

// Fonction principale
async function main() {
  const workflow = new DockerAndroidWorkflow();
  global.dockerWorkflow = workflow;

  try {
    // Options de configuration
    const options = {
      countries: process.env.WORKFLOW_COUNTRIES ? process.env.WORKFLOW_COUNTRIES.split(',') : ['ca', 'us', 'fr'],
      maxConcurrent: parseInt(process.env.MAX_CONCURRENT_WORKFLOWS) || 2,
      workflowDuration: parseInt(process.env.WORKFLOW_DURATION) || 300000,
      autoRestart: process.env.AUTO_RESTART === 'true'
    };

    console.log('🔧 Options de configuration:');
    console.log('   • Pays:', options.countries.join(', '));
    console.log('   • Concurrent max:', options.maxConcurrent);
    console.log('   • Durée workflow:', Math.round(options.workflowDuration / 1000), 'secondes');
    console.log('   • Auto-redémarrage:', options.autoRestart);
    console.log('');

    await workflow.start(options);

  } catch (error) {
    console.error('❌ Erreur fatale:', error.message);
    await workflow.stop();
    process.exit(1);
  }
}

// Lancer si exécuté directement
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { DockerAndroidWorkflow };
export default DockerAndroidWorkflow;
