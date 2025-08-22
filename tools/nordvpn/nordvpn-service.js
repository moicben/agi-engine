/**
 * Service NordVPN Complet - Architecture Modulaire
 * Supporte: Local, Serveurs, Instances Cloud, Multi-pays
 */

import { execAsync } from '../helpers.js';
import { sleep, randomSleep } from '../helpers.js';
import { NordVPNServerManager } from './server-manager.js';
import { NordVPNMonitor } from './monitor.js';
import { NordVPNRotator } from './rotator.js';
import { NordVPNConfig } from './config.js';

export class NordVPNService {
  constructor(options = {}) {
    this.config = new NordVPNConfig(options);
    this.serverManager = new NordVPNServerManager(this.config);
    this.monitor = new NordVPNMonitor(this.config);
    this.rotator = new NordVPNRotator(this.config, this.serverManager);
    this.isConnected = false;
    this.currentServer = null;
    this.currentIP = null;
    this.connectionHistory = [];
  }

  /**
   * Initialisation du service
   */
  async initialize() {
    console.log('🔧 Initialisation du service NordVPN...');

    try {
      // Vérifier si NordVPN CLI est installé
      await this.checkInstallation();

      // Charger la configuration des serveurs
      await this.serverManager.loadServers();

      // Démarrer le monitoring en arrière-plan
      this.monitor.startMonitoring();

      console.log('✅ Service NordVPN initialisé');
      return true;
    } catch (error) {
      console.error('❌ Erreur initialisation NordVPN:', error.message);
      throw error;
    }
  }

  /**
   * Vérifier l'installation de NordVPN CLI
   */
  async checkInstallation() {
    try {
      const { stdout } = await execAsync('nordvpn --version');
      console.log('📦 NordVPN CLI trouvé:', stdout.trim());
      return true;
    } catch (error) {
      throw new Error('NordVPN CLI non installé. Installez-le: https://nordvpn.com/download/');
    }
  }

  /**
   * Connexion à un pays avec optimisation
   */
  async connectToCountry(country, options = {}) {
    const {
      serverType = 'auto', // auto, fastest, random
      protocol = 'auto',   // auto, tcp, udp
      retries = 3,
      timeout = 30000
    } = options;

    console.log(`🌍 Connexion NordVPN vers ${country.toUpperCase()}...`);

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        // Sélection du serveur optimal
        const server = await this.serverManager.selectOptimalServer(country, serverType);

        // Configuration du protocole
        if (protocol !== 'auto') {
          await this.setProtocol(protocol);
        }

        // Connexion
        await this.connectToServer(server);

        // Vérification de la connexion
        await this.waitForConnection(timeout);

        // Récupération de l'IP actuelle
        this.currentIP = await this.getCurrentIP();

        console.log(`✅ Connecté à ${server} (${this.currentIP})`);
        return {
          success: true,
          server,
          ip: this.currentIP,
          country: country.toUpperCase()
        };

      } catch (error) {
        console.log(`❌ Tentative ${attempt}/${retries} échouée:`, error.message);

        if (attempt < retries) {
          console.log('🔄 Nouvelle tentative dans 5 secondes...');
          await sleep(5000);
        }
      }
    }

    throw new Error(`Impossible de se connecter à ${country} après ${retries} tentatives`);
  }

  /**
   * Connexion à un serveur spécifique
   */
  async connectToServer(server) {
    try {
      console.log(`🔌 Connexion à ${server}...`);

      // Déconnexion préalable si nécessaire
      if (this.isConnected) {
        await this.disconnect();
      }

      // Connexion
      const { stdout } = await execAsync(`nordvpn connect ${server}`);

      this.currentServer = server;
      this.isConnected = true;

      // Log de l'historique
      this.connectionHistory.push({
        timestamp: new Date(),
        server,
        action: 'connect',
        status: 'success'
      });

      return stdout;
    } catch (error) {
      this.connectionHistory.push({
        timestamp: new Date(),
        server,
        action: 'connect',
        status: 'error',
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Déconnexion
   */
  async disconnect() {
    try {
      console.log('🔌 Déconnexion NordVPN...');
      const { stdout } = await execAsync('nordvpn disconnect');

      this.isConnected = false;
      this.currentServer = null;
      this.currentIP = null;

      this.connectionHistory.push({
        timestamp: new Date(),
        action: 'disconnect',
        status: 'success'
      });

      return stdout;
    } catch (error) {
      this.connectionHistory.push({
        timestamp: new Date(),
        action: 'disconnect',
        status: 'error',
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Attendre que la connexion soit établie
   */
  async waitForConnection(timeout = 30000) {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      try {
        const status = await this.getStatus();

        if (status.status === 'Connected') {
          return status;
        }

        await sleep(1000);
      } catch (error) {
        // Continue waiting
      }
    }

    throw new Error(`Timeout: connexion non établie après ${timeout}ms`);
  }

  /**
   * Obtenir le statut de connexion
   */
  async getStatus() {
    try {
      const { stdout } = await execAsync('nordvpn status');
      return this.parseStatus(stdout);
    } catch (error) {
      return { status: 'Error', error: error.message };
    }
  }

  /**
   * Parser le statut NordVPN
   */
  parseStatus(output) {
    const lines = output.split('\n');
    const status = {};

    for (const line of lines) {
      if (line.includes('Status:')) {
        status.status = line.split(':')[1].trim();
      } else if (line.includes('Server:')) {
        status.server = line.split(':')[1].trim();
      } else if (line.includes('Country:')) {
        status.country = line.split(':')[1].trim();
      } else if (line.includes('City:')) {
        status.city = line.split(':')[1].trim();
      } else if (line.includes('IP:')) {
        status.ip = line.split(':')[1].trim();
      }
    }

    return status;
  }

  /**
   * Obtenir l'IP actuelle
   */
  async getCurrentIP() {
    try {
      const { stdout } = await execAsync('curl -s https://api.ipify.org');
      return stdout.trim();
    } catch (error) {
      // Fallback methods
      try {
        const { stdout } = await execAsync('curl -s https://ipv4.icanhazip.com');
        return stdout.trim();
      } catch (error2) {
        const status = await this.getStatus();
        return status.ip || null;
      }
    }
  }

  /**
   * Définir le protocole (TCP/UDP)
   */
  async setProtocol(protocol) {
    try {
      const { stdout } = await execAsync(`nordvpn set protocol ${protocol}`);
      console.log(`🔧 Protocole NordVPN défini sur ${protocol.toUpperCase()}`);
      return stdout;
    } catch (error) {
      throw new Error(`Impossible de définir le protocole ${protocol}: ${error.message}`);
    }
  }

  /**
   * Rotation automatique (pour usage WhatsApp)
   */
  async rotateForWhatsApp(country = 'ca', options = {}) {
    const {
      minInterval = 300000, // 5 minutes minimum entre rotations
      randomDelay = 60000  // Délai aléatoire 0-60s
    } = options;

    // Vérifier l'intervalle minimum
    if (this.lastRotation) {
      const timeSinceLastRotation = Date.now() - this.lastRotation;
      if (timeSinceLastRotation < minInterval) {
        const waitTime = minInterval - timeSinceLastRotation;
        console.log(`⏳ Attente ${Math.round(waitTime/1000)}s avant rotation...`);
        await sleep(waitTime);
      }
    }

    // Délai aléatoire pour éviter les patterns
    if (randomDelay > 0) {
      const delay = Math.random() * randomDelay;
      await sleep(delay);
    }

    // Rotation
    const result = await this.connectToCountry(country, {
      serverType: 'random',
      ...options
    });

    this.lastRotation = Date.now();
    return result;
  }

  /**
   * Obtenir les statistiques
   */
  getStats() {
    const successfulConnections = this.connectionHistory.filter(h => h.status === 'success').length;
    const failedConnections = this.connectionHistory.filter(h => h.status === 'error').length;
    const totalRotations = this.connectionHistory.filter(h => h.action === 'connect').length;

    return {
      isConnected: this.isConnected,
      currentServer: this.currentServer,
      currentIP: this.currentIP,
      totalConnections: this.connectionHistory.length,
      successfulConnections,
      failedConnections,
      successRate: successfulConnections / Math.max(totalConnections, 1),
      totalRotations,
      availableServers: this.serverManager.getAvailableServersCount(),
      connectionHistory: this.connectionHistory.slice(-10) // Derniers 10 événements
    };
  }

  /**
   * Nettoyage et arrêt
   */
  async cleanup() {
    console.log('🧹 Nettoyage du service NordVPN...');

    if (this.isConnected) {
      await this.disconnect();
    }

    if (this.monitor) {
      this.monitor.stopMonitoring();
    }

    console.log('✅ Service NordVPN nettoyé');
  }
}

// Instance singleton pour usage global
export const nordVPNService = new NordVPNService();

// Export des utilitaires
export { NordVPNServerManager } from './server-manager.js';
export { NordVPNMonitor } from './monitor.js';
export { NordVPNRotator } from './rotator.js';
export { NordVPNConfig } from './config.js';
