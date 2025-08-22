/**
 * Service de Rotation d'IP NordVPN
 * Optimisé pour l'usage WhatsApp et autres applications anti-bot
 */

import { sleep, randomSleep } from '../helpers.js';

export class NordVPNRotator {
  constructor(config, serverManager) {
    this.config = config;
    this.serverManager = serverManager;
    this.rotationHistory = [];
    this.isRotating = false;
    this.rotationStats = {
      totalRotations: 0,
      successfulRotations: 0,
      failedRotations: 0,
      averageRotationTime: 0
    };
  }

  /**
   * Rotation intelligente pour WhatsApp
   */
  async rotateForWhatsApp(options = {}) {
    const {
      country = 'ca',
      strategy = 'smart', // smart, random, fastest
      minInterval = 300000, // 5 minutes minimum entre rotations
      maxInterval = 1800000, // 30 minutes maximum
      randomDelay = 60000,  // Délai aléatoire 0-60s
      verifyConnection = true,
      maxRetries = 3
    } = options;

    console.log(`🔄 Rotation NordVPN pour WhatsApp (${country.toUpperCase()})...`);

    // Vérifier si on peut déjà faire une rotation
    if (!this.canRotate(minInterval)) {
      const waitTime = this.getTimeUntilNextRotation(minInterval);
      console.log(`⏳ Attente ${Math.round(waitTime/1000)}s avant rotation...`);
      await sleep(waitTime);
    }

    // Délai aléatoire pour éviter les patterns
    if (randomDelay > 0) {
      const delay = Math.random() * randomDelay;
      console.log(`🎲 Délai aléatoire: ${Math.round(delay/1000)}s`);
      await sleep(delay);
    }

    // Effectuer la rotation
    const result = await this.performRotation(country, strategy, verifyConnection, maxRetries);

    return result;
  }

  /**
   * Vérifier si on peut faire une rotation
   */
  canRotate(minInterval) {
    if (this.rotationHistory.length === 0) {
      return true;
    }

    const lastRotation = this.rotationHistory[this.rotationHistory.length - 1];
    const timeSinceLastRotation = Date.now() - lastRotation.timestamp;

    return timeSinceLastRotation >= minInterval;
  }

  /**
   * Obtenir le temps jusqu'à la prochaine rotation possible
   */
  getTimeUntilNextRotation(minInterval) {
    if (this.rotationHistory.length === 0) {
      return 0;
    }

    const lastRotation = this.rotationHistory[this.rotationHistory.length - 1];
    const timeSinceLastRotation = Date.now() - lastRotation.timestamp;

    return Math.max(0, minInterval - timeSinceLastRotation);
  }

  /**
   * Effectuer la rotation
   */
  async performRotation(country, strategy, verifyConnection, maxRetries) {
    const rotationStart = Date.now();
    let result = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 Tentative de rotation ${attempt}/${maxRetries}`);

        // Sélectionner le serveur
        const server = await this.serverManager.selectOptimalServer(country, strategy);
        console.log(`🎯 Serveur sélectionné: ${server}`);

        // Effectuer la rotation
        result = await this.executeRotation(server, country);

        // Vérifier la connexion si demandé
        if (verifyConnection) {
          await this.verifyNewConnection();
        }

        // Succès
        result.success = true;
        result.attempt = attempt;
        result.duration = Date.now() - rotationStart;

        this.recordRotation(result);
        this.rotationStats.successfulRotations++;
        this.rotationStats.totalRotations++;

        console.log(`✅ Rotation réussie en ${result.duration}ms`);
        return result;

      } catch (error) {
        console.log(`❌ Échec rotation ${attempt}: ${error.message}`);

        result = {
          success: false,
          attempt,
          error: error.message,
          duration: Date.now() - rotationStart
        };

        this.recordRotation(result);

        if (attempt < maxRetries) {
          const waitTime = attempt * 5000; // Attente progressive
          console.log(`🔄 Retry dans ${waitTime}ms...`);
          await sleep(waitTime);
        }
      }
    }

    // Échec final
    this.rotationStats.failedRotations++;
    this.rotationStats.totalRotations++;

    throw new Error(`Rotation échouée après ${maxRetries} tentatives`);
  }

  /**
   * Exécuter la rotation
   */
  async executeRotation(server, country) {
    const { execAsync } = await import('../helpers.js');

    // Déconnexion actuelle si nécessaire
    try {
      await execAsync('nordvpn disconnect');
      await sleep(2000);
    } catch (error) {
      // Ignore disconnection errors
    }

    // Nouvelle connexion
    const { stdout } = await execAsync(`nordvpn connect ${server}`);
    await sleep(3000); // Attendre l'établissement

    // Obtenir la nouvelle IP
    const newIP = await this.getCurrentIP();

    return {
      timestamp: new Date(),
      server,
      country,
      newIP,
      previousIP: this.lastIP || null
    };
  }

  /**
   * Vérifier la nouvelle connexion
   */
  async verifyNewConnection(timeout = 15000) {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      try {
        const { execAsync } = await import('../helpers.js');
        const { stdout } = await execAsync('nordvpn status');

        if (stdout.includes('Connected')) {
          return true;
        }

        await sleep(1000);
      } catch (error) {
        // Continue checking
      }
    }

    throw new Error('Connexion non vérifiée après timeout');
  }

  /**
   * Obtenir l'IP actuelle
   */
  async getCurrentIP() {
    try {
      const { execAsync } = await import('../helpers.js');
      const { stdout } = await execAsync('curl -s https://api.ipify.org');
      return stdout.trim();
    } catch (error) {
      return null;
    }
  }

  /**
   * Enregistrer une rotation
   */
  recordRotation(result) {
    this.rotationHistory.push(result);

    // Garder seulement les 50 dernières rotations
    if (this.rotationHistory.length > 50) {
      this.rotationHistory = this.rotationHistory.slice(-50);
    }

    // Mettre à jour les stats
    if (result.success) {
      this.lastIP = result.newIP;
    }
  }

  /**
   * Rotation par pool (plusieurs pays)
   */
  async rotateThroughPool(countries = ['ca', 'us', 'uk'], options = {}) {
    console.log(`🌍 Rotation à travers ${countries.length} pays...`);

    const results = [];

    for (const country of countries) {
      try {
        const result = await this.rotateForWhatsApp({
          country,
          ...options
        });

        results.push(result);

        // Attendre entre les rotations de pays
        if (options.countryInterval) {
          await sleep(options.countryInterval);
        }

      } catch (error) {
        console.log(`❌ Échec rotation ${country}: ${error.message}`);
        results.push({
          success: false,
          country,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * Rotation automatique avec planning
   */
  async startAutoRotation(options = {}) {
    const {
      countries = ['ca'],
      interval = 600000, // 10 minutes
      strategy = 'smart',
      enabled = true
    } = options;

    if (!enabled) {
      console.log('⏸️ Auto-rotation désactivée');
      return;
    }

    console.log('🔄 Démarrage auto-rotation NordVPN...');

    while (enabled) {
      try {
        await this.rotateForWhatsApp({
          country: countries[Math.floor(Math.random() * countries.length)],
          strategy,
          minInterval: 0 // Pas de limite pour l'auto-rotation
        });

        console.log(`⏳ Prochaine rotation dans ${Math.round(interval/1000)}s...`);
        await sleep(interval);

      } catch (error) {
        console.error('❌ Erreur auto-rotation:', error.message);

        // Attendre un peu plus en cas d'erreur
        await sleep(interval * 2);
      }
    }
  }

  /**
   * Obtenir les statistiques de rotation
   */
  getRotationStats() {
    const recentRotations = this.rotationHistory.slice(-10);

    return {
      ...this.rotationStats,
      successRate: this.rotationStats.totalRotations > 0 ?
        (this.rotationStats.successfulRotations / this.rotationStats.totalRotations) * 100 : 0,
      recentRotations,
      canRotate: this.canRotate(300000), // 5 minutes
      timeUntilNextRotation: this.getTimeUntilNextRotation(300000),
      countriesUsed: [...new Set(this.rotationHistory
        .filter(r => r.success)
        .map(r => r.country))],
      serversUsed: [...new Set(this.rotationHistory
        .filter(r => r.success)
        .map(r => r.server))]
    };
  }

  /**
   * Obtenir l'historique récent
   */
  getRecentRotations(count = 5) {
    return this.rotationHistory.slice(-count);
  }

  /**
   * Nettoyer l'historique
   */
  clearHistory() {
    this.rotationHistory = [];
    console.log('🧹 Historique de rotation nettoyé');
  }

  /**
   * Arrêter la rotation en cours
   */
  stopRotation() {
    this.isRotating = false;
    console.log('⏹️ Rotation arrêtée');
  }
}
