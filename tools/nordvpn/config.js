/**
 * Configuration NordVPN
 * Paramètres centralisés pour tous les services NordVPN
 */

export class NordVPNConfig {
  constructor(options = {}) {
    // Configuration de base
    this.apiKey = options.apiKey || process.env.NORDVPN_API_KEY || null;
    this.username = options.username || process.env.NORDVPN_USERNAME || null;
    this.password = options.password || process.env.NORDVPN_PASSWORD || null;

    // Configuration réseau
    this.protocol = options.protocol || 'auto'; // auto, tcp, udp
    this.killSwitch = options.killSwitch !== false; // true par défaut
    this.cyberSec = options.cyberSec || false;
    this.obfuscate = options.obfuscate || false;

    // Configuration de monitoring
    this.monitoring = {
      enabled: options.monitoring !== false,
      interval: options.monitorInterval || 30000, // 30 secondes
      healthCheckInterval: options.healthCheckInterval || 300000, // 5 minutes
      alertThresholds: {
        stability: options.stabilityThreshold || 50,
        latency: options.latencyThreshold || 500
      }
    };

    // Configuration de rotation
    this.rotation = {
      enabled: options.rotation !== false,
      minInterval: options.minRotationInterval || 300000, // 5 minutes
      maxInterval: options.maxRotationInterval || 1800000, // 30 minutes
      randomDelay: options.randomDelay || 60000, // 60 secondes
      maxRetries: options.maxRetries || 3,
      strategies: {
        default: options.defaultStrategy || 'smart',
        whatsapp: 'smart',
        general: 'random'
      }
    };

    // Configuration des serveurs
    this.servers = {
      cacheEnabled: options.cacheEnabled !== false,
      cacheTtl: options.cacheTtl || 3600000, // 1 heure
      healthCheckEnabled: options.healthCheckEnabled !== false,
      preferredCountries: options.preferredCountries || ['CA', 'US', 'UK', 'FR'],
      excludedServers: options.excludedServers || [],
      maxLoad: options.maxServerLoad || 80 // %
    };

    // Configuration de logging
    this.logging = {
      enabled: options.logging !== false,
      level: options.logLevel || 'info',
      maxHistory: options.maxLogHistory || 1000,
      logToFile: options.logToFile || false,
      logDirectory: options.logDirectory || './logs'
    };

    // Configuration d'alerte
    this.alerts = {
      enabled: options.alerts !== false,
      email: options.alertEmail || null,
      webhook: options.alertWebhook || null,
      thresholds: {
        disconnection: true,
        lowStability: true,
        highLatency: true
      }
    };

    // Configuration spécifique WhatsApp
    this.whatsapp = {
      enabled: options.whatsapp !== false,
      rotationInterval: options.whatsappRotationInterval || 600000, // 10 minutes
      countries: options.whatsappCountries || ['CA', 'US'],
      verifyConnection: options.verifyConnection !== false,
      maxRetries: options.whatsappMaxRetries || 5
    };

    // Configuration avancée
    this.advanced = {
      connectionTimeout: options.connectionTimeout || 30000,
      retryDelay: options.retryDelay || 5000,
      maxConcurrentConnections: options.maxConcurrentConnections || 1,
      dnsServers: options.dnsServers || ['103.86.96.100', '103.86.99.100'],
      mtu: options.mtu || 1500
    };
  }

  /**
   * Obtenir la configuration pour un usage spécifique
   */
  getConfigFor(usage = 'general') {
    const baseConfig = { ...this };

    switch (usage) {
      case 'whatsapp':
        return {
          ...baseConfig,
          rotation: {
            ...baseConfig.rotation,
            strategy: this.rotation.strategies.whatsapp,
            interval: this.whatsapp.rotationInterval
          },
          countries: this.whatsapp.countries,
          verifyConnection: this.whatsapp.verifyConnection,
          maxRetries: this.whatsapp.maxRetries
        };

      case 'monitoring':
        return {
          ...baseConfig,
          monitoring: this.monitoring
        };

      default:
        return baseConfig;
    }
  }

  /**
   * Valider la configuration
   */
  validate() {
    const errors = [];

    // Vérifier les paramètres requis
    if (!this.username && !this.apiKey) {
      errors.push('Username ou API key requis');
    }

    // Vérifier les protocoles valides
    if (!['auto', 'tcp', 'udp'].includes(this.protocol)) {
      errors.push('Protocole invalide (auto, tcp, udp)');
    }

    // Vérifier les intervalles
    if (this.rotation.minInterval >= this.rotation.maxInterval) {
      errors.push('minInterval doit être < maxInterval');
    }

    // Vérifier les pays
    if (this.servers.preferredCountries.length === 0) {
      errors.push('Au moins un pays préféré requis');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Obtenir les pays disponibles
   */
  getAvailableCountries() {
    return this.servers.preferredCountries;
  }

  /**
   * Obtenir la configuration de rotation pour un usage
   */
  getRotationConfig(usage = 'general') {
    return {
      ...this.rotation,
      strategy: this.rotation.strategies[usage] || this.rotation.strategies.default
    };
  }

  /**
   * Obtenir la configuration de monitoring
   */
  getMonitoringConfig() {
    return this.monitoring;
  }

  /**
   * Mettre à jour dynamiquement la configuration
   */
  update(updates) {
    Object.assign(this, updates);
    return this.validate();
  }

  /**
   * Exporter la configuration (sans données sensibles)
   */
  export() {
    const exported = { ...this };
    // Supprimer les données sensibles
    delete exported.username;
    delete exported.password;
    delete exported.apiKey;
    return exported;
  }

  /**
   * Créer une configuration depuis un fichier
   */
  static fromFile(filePath) {
    try {
      const fs = require('fs');
      const path = require('path');
      const fullPath = path.resolve(filePath);

      if (!fs.existsSync(fullPath)) {
        throw new Error(`Fichier de configuration non trouvé: ${fullPath}`);
      }

      const configData = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
      return new NordVPNConfig(configData);
    } catch (error) {
      throw new Error(`Erreur chargement configuration: ${error.message}`);
    }
  }

  /**
   * Sauvegarder la configuration
   */
  save(filePath) {
    try {
      const fs = require('fs');
      const path = require('path');
      const fullPath = path.resolve(filePath);

      // Créer le dossier si nécessaire
      const dir = path.dirname(fullPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Sauvegarder sans données sensibles
      const safeConfig = this.export();
      fs.writeFileSync(fullPath, JSON.stringify(safeConfig, null, 2));

      console.log(`💾 Configuration sauvegardée: ${fullPath}`);
      return true;
    } catch (error) {
      console.error(`❌ Erreur sauvegarde configuration: ${error.message}`);
      return false;
    }
  }

  /**
   * Obtenir une configuration par défaut optimisée
   */
  static getDefault() {
    return new NordVPNConfig({
      protocol: 'auto',
      killSwitch: true,
      cyberSec: false,
      obfuscate: false,
      monitoring: {
        enabled: true,
        interval: 30000
      },
      rotation: {
        enabled: true,
        minInterval: 300000,
        maxInterval: 1800000,
        randomDelay: 60000,
        maxRetries: 3
      },
      servers: {
        preferredCountries: ['CA', 'US', 'UK', 'FR'],
        maxLoad: 80
      }
    });
  }

  /**
   * Obtenir une configuration optimisée pour WhatsApp
   */
  static getWhatsAppOptimized() {
    return new NordVPNConfig({
      protocol: 'tcp', // Plus stable pour WhatsApp
      killSwitch: true,
      cyberSec: true, // Protection supplémentaire
      obfuscate: false,
      whatsapp: {
        enabled: true,
        rotationInterval: 600000, // 10 minutes
        countries: ['CA', 'US'],
        verifyConnection: true,
        maxRetries: 5
      },
      rotation: {
        enabled: true,
        minInterval: 300000,
        maxInterval: 1200000,
        randomDelay: 120000, // 2 minutes
        maxRetries: 5,
        strategies: {
          whatsapp: 'smart'
        }
      },
      servers: {
        preferredCountries: ['CA', 'US'],
        maxLoad: 70 // Serveurs moins chargés
      },
      monitoring: {
        enabled: true,
        interval: 15000, // Plus fréquent
        alertThresholds: {
          stability: 70,
          latency: 300
        }
      }
    });
  }
}

// Configuration par défaut exportée
export const defaultConfig = NordVPNConfig.getDefault();

// Configuration optimisée WhatsApp exportée
export const whatsappConfig = NordVPNConfig.getWhatsAppOptimized();
