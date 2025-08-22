/**
 * Service de Monitoring NordVPN
 * Surveille les connexions, la stabilité et les performances
 */

import { EventEmitter } from 'events';
import { sleep } from '../helpers.js';

export class NordVPNMonitor extends EventEmitter {
  constructor(config) {
    super();
    this.config = config;
    this.isMonitoring = false;
    this.monitorInterval = null;
    this.connectionHistory = [];
    this.metrics = {
      totalConnections: 0,
      successfulConnections: 0,
      failedConnections: 0,
      averageConnectionTime: 0,
      currentUptime: 0,
      lastConnectionTime: null,
      stabilityScore: 100
    };
  }

  /**
   * Démarrer le monitoring
   */
  startMonitoring(interval = 30000) { // 30 secondes par défaut
    if (this.isMonitoring) {
      console.log('⚠️ Monitoring NordVPN déjà en cours');
      return;
    }

    console.log('📊 Démarrage du monitoring NordVPN...');
    this.isMonitoring = true;

    this.monitorInterval = setInterval(async () => {
      await this.performHealthCheck();
    }, interval);

    // Premier check immédiat
    this.performHealthCheck();

    this.emit('monitoring:started');
  }

  /**
   * Arrêter le monitoring
   */
  stopMonitoring() {
    if (!this.isMonitoring) {
      return;
    }

    console.log('📊 Arrêt du monitoring NordVPN...');
    this.isMonitoring = false;

    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }

    this.emit('monitoring:stopped');
  }

  /**
   * Effectuer un contrôle de santé
   */
  async performHealthCheck() {
    try {
      const healthStatus = await this.checkHealth();

      // Mettre à jour les métriques
      this.updateMetrics(healthStatus);

      // Émettre les événements appropriés
      if (healthStatus.status === 'error') {
        this.emit('health:error', healthStatus);
      } else if (healthStatus.status === 'degraded') {
        this.emit('health:degraded', healthStatus);
      } else {
        this.emit('health:healthy', healthStatus);
      }

      // Vérifier les seuils d'alerte
      this.checkAlerts(healthStatus);

    } catch (error) {
      console.error('❌ Erreur monitoring NordVPN:', error.message);
      this.emit('monitoring:error', error);
    }
  }

  /**
   * Vérifier la santé de la connexion
   */
  async checkHealth() {
    const status = {
      timestamp: new Date(),
      status: 'unknown',
      details: {}
    };

    try {
      // Vérifier le statut NordVPN
      const vpnStatus = await this.checkVPNStatus();
      status.details.vpn = vpnStatus;

      // Vérifier la connectivité réseau
      const networkStatus = await this.checkNetworkConnectivity();
      status.details.network = networkStatus;

      // Vérifier la stabilité de l'IP
      const ipStability = await this.checkIPStability();
      status.details.ipStability = ipStability;

      // Déterminer le statut global
      status.status = this.determineOverallStatus(status.details);

    } catch (error) {
      status.status = 'error';
      status.error = error.message;
    }

    return status;
  }

  /**
   * Vérifier le statut NordVPN
   */
  async checkVPNStatus() {
    try {
      const { execAsync } = await import('../helpers.js');
      const { stdout } = await execAsync('nordvpn status');

      const status = this.parseVPNStatus(stdout);
      return {
        connected: status.status === 'Connected',
        server: status.server,
        country: status.country,
        ip: status.ip,
        raw: stdout
      };
    } catch (error) {
      return {
        connected: false,
        error: error.message
      };
    }
  }

  /**
   * Parser le statut NordVPN
   */
  parseVPNStatus(output) {
    const lines = output.split('\n');
    const status = {};

    for (const line of lines) {
      const [key, ...valueParts] = line.split(':');
      if (valueParts.length > 0) {
        const value = valueParts.join(':').trim();
        const cleanKey = key.trim().toLowerCase().replace(/\s+/g, '_');

        if (cleanKey === 'status') status.status = value;
        else if (cleanKey === 'server') status.server = value;
        else if (cleanKey === 'country') status.country = value;
        else if (cleanKey === 'ip') status.ip = value;
      }
    }

    return status;
  }

  /**
   * Vérifier la connectivité réseau
   */
  async checkNetworkConnectivity() {
    try {
      const { execAsync } = await import('../helpers.js');

      // Test ping rapide
      const startTime = Date.now();
      await execAsync('ping -c 1 -W 2 8.8.8.8');
      const latency = Date.now() - startTime;

      return {
        reachable: true,
        latency,
        quality: latency < 100 ? 'excellent' : latency < 500 ? 'good' : 'poor'
      };
    } catch (error) {
      return {
        reachable: false,
        error: error.message
      };
    }
  }

  /**
   * Vérifier la stabilité de l'IP
   */
  async checkIPStability() {
    try {
      const { execAsync } = await import('../helpers.js');

      // Obtenir l'IP actuelle
      const { stdout: ipOutput } = await execAsync('curl -s https://api.ipify.org');
      const currentIP = ipOutput.trim();

      // Vérifier si l'IP a changé récemment
      const recentIPs = this.connectionHistory
        .slice(-10) // Dernières 10 connexions
        .map(conn => conn.ip)
        .filter(ip => ip);

      const ipChanges = recentIPs.filter((ip, index) =>
        index > 0 && ip !== recentIPs[index - 1]
      ).length;

      return {
        currentIP,
        recentChanges: ipChanges,
        stability: ipChanges === 0 ? 'stable' : ipChanges <= 2 ? 'moderate' : 'unstable'
      };
    } catch (error) {
      return {
        error: error.message,
        stability: 'unknown'
      };
    }
  }

  /**
   * Déterminer le statut global
   */
  determineOverallStatus(details) {
    const issues = [];

    // Vérifier la connexion VPN
    if (!details.vpn.connected) {
      issues.push('vpn_disconnected');
    }

    // Vérifier la connectivité réseau
    if (!details.network.reachable) {
      issues.push('network_unreachable');
    }

    // Vérifier la stabilité IP
    if (details.ipStability.stability === 'unstable') {
      issues.push('ip_unstable');
    }

    // Déterminer le statut
    if (issues.length === 0) {
      return 'healthy';
    } else if (issues.length <= 1) {
      return 'degraded';
    } else {
      return 'error';
    }
  }

  /**
   * Mettre à jour les métriques
   */
  updateMetrics(healthStatus) {
    // Mettre à jour l'historique
    this.connectionHistory.push({
      timestamp: healthStatus.timestamp,
      status: healthStatus.status,
      ip: healthStatus.details.ipStability?.currentIP,
      server: healthStatus.details.vpn?.server
    });

    // Garder seulement les 100 dernières entrées
    if (this.connectionHistory.length > 100) {
      this.connectionHistory = this.connectionHistory.slice(-100);
    }

    // Calculer les métriques
    const recentHistory = this.connectionHistory.slice(-20); // Dernières 20 vérifications

    this.metrics.totalConnections = this.connectionHistory.length;
    this.metrics.successfulConnections = recentHistory.filter(h => h.status === 'healthy').length;
    this.metrics.failedConnections = recentHistory.filter(h => h.status === 'error').length;

    // Calculer le score de stabilité
    const healthyCount = recentHistory.filter(h => h.status === 'healthy').length;
    this.metrics.stabilityScore = Math.round((healthyCount / recentHistory.length) * 100);

    // Mettre à jour l'uptime
    if (healthStatus.status === 'healthy') {
      this.metrics.currentUptime += 30; // 30 secondes d'intervalle
    } else {
      this.metrics.currentUptime = 0;
    }
  }

  /**
   * Vérifier les seuils d'alerte
   */
  checkAlerts(healthStatus) {
    // Alerte si stabilité basse
    if (this.metrics.stabilityScore < 50) {
      this.emit('alert:low_stability', {
        score: this.metrics.stabilityScore,
        message: 'Score de stabilité NordVPN très bas'
      });
    }

    // Alerte si déconnexion
    if (healthStatus.status === 'error') {
      this.emit('alert:disconnected', {
        message: 'NordVPN déconnecté ou en erreur'
      });
    }

    // Alerte si uptime trop bas
    if (this.metrics.currentUptime === 0 && this.connectionHistory.length > 1) {
      this.emit('alert:connection_lost', {
        message: 'Connexion NordVPN perdue'
      });
    }
  }

  /**
   * Obtenir les métriques actuelles
   */
  getMetrics() {
    return {
      ...this.metrics,
      isMonitoring: this.isMonitoring,
      connectionHistory: this.connectionHistory.slice(-5) // Dernières 5 entrées
    };
  }

  /**
   * Obtenir le rapport de santé détaillé
   */
  async getHealthReport() {
    const currentHealth = await this.checkHealth();
    const metrics = this.getMetrics();

    return {
      currentHealth,
      metrics,
      recommendations: this.generateRecommendations(currentHealth, metrics)
    };
  }

  /**
   * Générer des recommandations
   */
  generateRecommendations(health, metrics) {
    const recommendations = [];

    if (metrics.stabilityScore < 50) {
      recommendations.push('Considérer un redémarrage du service NordVPN');
    }

    if (health.details.vpn?.connected === false) {
      recommendations.push('Reconnexion manuelle à NordVPN recommandée');
    }

    if (health.details.network?.reachable === false) {
      recommendations.push('Vérifier la connectivité réseau');
    }

    if (health.details.ipStability?.stability === 'unstable') {
      recommendations.push('IP change fréquemment - possible problème de serveur');
    }

    return recommendations;
  }

  /**
   * Nettoyer les ressources
   */
  cleanup() {
    this.stopMonitoring();
    this.connectionHistory = [];
    this.removeAllListeners();
  }
}
