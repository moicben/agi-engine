/**
 * Service de Monitoring Android Studio
 * Surveille les émulateurs, la performance et l'état du système
 */

import { EventEmitter } from 'events';
import { execAsync, sleep } from '../whatsapp/helpers.js';

export class AndroidStudioMonitor extends EventEmitter {
  constructor(config) {
    super();
    this.config = config;
    this.isMonitoring = false;
    this.monitorInterval = null;
    this.emulatorMetrics = new Map();
    this.systemMetrics = new Map();
    this.alertHistory = [];
    this.isInitialized = false;
  }

  /**
   * Initialisation du monitoring
   */
  async initialize() {
    console.log('📊 Initialisation du monitoring Android Studio...');

    try {
      // Vérifier les outils de monitoring
      await this.checkMonitoringTools();

      this.isInitialized = true;
      console.log('✅ Monitoring Android Studio initialisé');
    } catch (error) {
      console.error('❌ Erreur initialisation monitoring:', error.message);
      throw error;
    }
  }

  /**
   * Vérifier les outils de monitoring disponibles
   */
  async checkMonitoringTools() {
    const tools = ['adb', 'top', 'ps', 'df', 'free'];

    for (const tool of tools) {
      try {
        await execAsync(`which ${tool}`);
        console.log(`✅ ${tool} disponible`);
      } catch (error) {
        console.log(`⚠️ ${tool} non disponible`);
      }
    }
  }

  /**
   * Démarrer le monitoring
   */
  startMonitoring(interval = 10000) { // 10 secondes par défaut
    if (this.isMonitoring) {
      console.log('⚠️ Monitoring Android Studio déjà en cours');
      return;
    }

    console.log('📊 Démarrage du monitoring Android Studio...');
    this.isMonitoring = true;

    this.monitorInterval = setInterval(async () => {
      await this.performMonitoringCycle();
    }, interval);

    // Premier cycle immédiat
    this.performMonitoringCycle();

    this.emit('monitoring:started');
  }

  /**
   * Arrêter le monitoring
   */
  stopMonitoring() {
    if (!this.isMonitoring) {
      return;
    }

    console.log('📊 Arrêt du monitoring Android Studio...');
    this.isMonitoring = false;

    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }

    this.emit('monitoring:stopped');
  }

  /**
   * Effectuer un cycle de monitoring complet
   */
  async performMonitoringCycle() {
    try {
      // Monitoring système
      const systemMetrics = await this.monitorSystem();
      this.systemMetrics.set(Date.now(), systemMetrics);

      // Monitoring des émulateurs
      const emulatorMetrics = await this.monitorEmulators();
      emulatorMetrics.forEach((metrics, emulatorId) => {
        if (!this.emulatorMetrics.has(emulatorId)) {
          this.emulatorMetrics.set(emulatorId, new Map());
        }
        this.emulatorMetrics.get(emulatorId).set(Date.now(), metrics);
      });

      // Vérifier les seuils d'alerte
      await this.checkAlerts(systemMetrics, emulatorMetrics);

      // Émettre les événements
      this.emit('monitoring:cycle', {
        timestamp: new Date(),
        system: systemMetrics,
        emulators: emulatorMetrics
      });

    } catch (error) {
      console.error('❌ Erreur cycle monitoring:', error.message);
      this.emit('monitoring:error', error);
    }
  }

  /**
   * Monitorer le système
   */
  async monitorSystem() {
    const metrics = {
      timestamp: new Date(),
      cpu: {},
      memory: {},
      disk: {},
      network: {}
    };

    try {
      // CPU
      metrics.cpu = await this.getCPUUsage();

      // Mémoire
      metrics.memory = await this.getMemoryUsage();

      // Disque
      metrics.disk = await this.getDiskUsage();

      // Réseau (basique)
      metrics.network = await this.getNetworkUsage();

    } catch (error) {
      console.log('⚠️ Erreur monitoring système:', error.message);
    }

    return metrics;
  }

  /**
   * Obtenir l'utilisation CPU
   */
  async getCPUUsage() {
    try {
      const platform = require('os').platform();

      if (platform === 'linux') {
        const { stdout } = await execAsync('top -bn1 | grep "Cpu(s)"');
        const cpuMatch = stdout.match(/(\d+\.\d+)%\s*us/);
        return {
          usage: cpuMatch ? parseFloat(cpuMatch[1]) : 0,
          cores: require('os').cpus().length
        };
      } else if (platform === 'darwin') {
        const { stdout } = await execAsync('top -l 1 | grep "CPU usage"');
        const cpuMatch = stdout.match(/(\d+\.\d+)%\s*user/);
        return {
          usage: cpuMatch ? parseFloat(cpuMatch[1]) : 0,
          cores: require('os').cpus().length
        };
      }

      return { usage: 0, cores: require('os').cpus().length };
    } catch (error) {
      return { usage: 0, cores: require('os').cpus().length };
    }
  }

  /**
   * Obtenir l'utilisation mémoire
   */
  async getMemoryUsage() {
    try {
      const platform = require('os').platform();

      if (platform === 'linux') {
        const { stdout } = await execAsync('free -m');
        const lines = stdout.split('\n');
        const memLine = lines[1];
        const values = memLine.split(/\s+/);

        return {
          total: parseInt(values[1]),
          used: parseInt(values[2]),
          free: parseInt(values[3]),
          usage: Math.round((parseInt(values[2]) / parseInt(values[1])) * 100)
        };
      }

      // Fallback générique
      const totalMem = require('os').totalmem();
      const freeMem = require('os').freemem();
      const usedMem = totalMem - freeMem;

      return {
        total: Math.round(totalMem / 1024 / 1024),
        used: Math.round(usedMem / 1024 / 1024),
        free: Math.round(freeMem / 1024 / 1024),
        usage: Math.round((usedMem / totalMem) * 100)
      };
    } catch (error) {
      return { total: 0, used: 0, free: 0, usage: 0 };
    }
  }

  /**
   * Obtenir l'utilisation disque
   */
  async getDiskUsage() {
    try {
      const { stdout } = await execAsync('df -h / | tail -1');
      const values = stdout.split(/\s+/);

      return {
        total: values[1],
        used: values[2],
        available: values[3],
        usage: parseInt(values[4].replace('%', ''))
      };
    } catch (error) {
      return { total: '0G', used: '0G', available: '0G', usage: 0 };
    }
  }

  /**
   * Obtenir l'utilisation réseau
   */
  async getNetworkUsage() {
    try {
      const { stdout } = await execAsync('cat /proc/net/dev | grep eth0 || echo "0 0 0 0 0 0 0 0 0 0"');
      const values = stdout.trim().split(/\s+/);

      return {
        interface: 'eth0',
        rxBytes: parseInt(values[1] || 0),
        txBytes: parseInt(values[9] || 0)
      };
    } catch (error) {
      return { interface: 'unknown', rxBytes: 0, txBytes: 0 };
    }
  }

  /**
   * Monitorer les émulateurs
   */
  async monitorEmulators() {
    const emulatorMetrics = new Map();

    try {
      // Obtenir la liste des devices ADB
      const { stdout } = await execAsync('adb devices');
      const lines = stdout.split('\n');

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line && line.includes('device') && !line.includes('List')) {
          const deviceId = line.split('\t')[0];
          if (deviceId.includes('emulator')) {
            const metrics = await this.monitorEmulator(deviceId);
            emulatorMetrics.set(deviceId, metrics);
          }
        }
      }

    } catch (error) {
      console.log('⚠️ Erreur monitoring émulateurs:', error.message);
    }

    return emulatorMetrics;
  }

  /**
   * Monitorer un émulateur spécifique
   */
  async monitorEmulator(deviceId) {
    const metrics = {
      timestamp: new Date(),
      deviceId,
      cpu: 0,
      memory: {},
      battery: {},
      processes: []
    };

    try {
      // CPU
      metrics.cpu = await this.getEmulatorCPU(deviceId);

      // Mémoire
      metrics.memory = await this.getEmulatorMemory(deviceId);

      // Batterie
      metrics.battery = await this.getEmulatorBattery(deviceId);

      // Processus
      metrics.processes = await this.getEmulatorProcesses(deviceId);

    } catch (error) {
      console.log(`⚠️ Erreur monitoring ${deviceId}:`, error.message);
    }

    return metrics;
  }

  /**
   * Obtenir l'utilisation CPU d'un émulateur
   */
  async getEmulatorCPU(deviceId) {
    try {
      const { stdout } = await execAsync(`adb -s ${deviceId} shell dumpsys cpuinfo | grep TOTAL`);
      const cpuMatch = stdout.match(/(\d+)%\s*TOTAL/);
      return cpuMatch ? parseInt(cpuMatch[1]) : 0;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Obtenir l'utilisation mémoire d'un émulateur
   */
  async getEmulatorMemory(deviceId) {
    try {
      const { stdout } = await execAsync(`adb -s ${deviceId} shell dumpsys meminfo`);
      const totalMatch = stdout.match(/Total RAM:\s*(\d+)/);
      const freeMatch = stdout.match(/Free RAM:\s*(\d+)/);

      const total = totalMatch ? parseInt(totalMatch[1]) : 0;
      const free = freeMatch ? parseInt(freeMatch[1]) : 0;
      const used = total - free;

      return {
        total,
        used,
        free,
        usage: total > 0 ? Math.round((used / total) * 100) : 0
      };
    } catch (error) {
      return { total: 0, used: 0, free: 0, usage: 0 };
    }
  }

  /**
   * Obtenir l'état de la batterie d'un émulateur
   */
  async getEmulatorBattery(deviceId) {
    try {
      const { stdout } = await execAsync(`adb -s ${deviceId} shell dumpsys battery`);
      const levelMatch = stdout.match(/level:\s*(\d+)/);
      const statusMatch = stdout.match(/status:\s*(\d+)/);

      return {
        level: levelMatch ? parseInt(levelMatch[1]) : 100,
        status: statusMatch ? parseInt(statusMatch[1]) : 0
      };
    } catch (error) {
      return { level: 100, status: 0 };
    }
  }

  /**
   * Obtenir les processus d'un émulateur
   */
  async getEmulatorProcesses(deviceId) {
    try {
      const { stdout } = await execAsync(`adb -s ${deviceId} shell ps | head -10`);
      const lines = stdout.split('\n').slice(1);
      return lines.map(line => {
        const parts = line.trim().split(/\s+/);
        return {
          pid: parts[1],
          name: parts[parts.length - 1],
          cpu: 0,
          memory: 0
        };
      }).filter(p => p.pid);
    } catch (error) {
      return [];
    }
  }

  /**
   * Vérifier les seuils d'alerte
   */
  async checkAlerts(systemMetrics, emulatorMetrics) {
    // Alertes système
    if (systemMetrics.cpu.usage > this.config.monitoring.alertThresholds.cpu) {
      this.emitAlert('high_cpu', {
        type: 'system',
        metric: 'cpu',
        value: systemMetrics.cpu.usage,
        threshold: this.config.monitoring.alertThresholds.cpu
      });
    }

    if (systemMetrics.memory.usage > this.config.monitoring.alertThresholds.memory) {
      this.emitAlert('high_memory', {
        type: 'system',
        metric: 'memory',
        value: systemMetrics.memory.usage,
        threshold: this.config.monitoring.alertThresholds.memory
      });
    }

    // Alertes émulateurs
    for (const [deviceId, metrics] of emulatorMetrics) {
      if (metrics.memory.usage > this.config.monitoring.alertThresholds.memory) {
        this.emitAlert('high_emulator_memory', {
          type: 'emulator',
          deviceId,
          metric: 'memory',
          value: metrics.memory.usage,
          threshold: this.config.monitoring.alertThresholds.memory
        });
      }

      if (metrics.battery.level < this.config.monitoring.alertThresholds.battery) {
        this.emitAlert('low_battery', {
          type: 'emulator',
          deviceId,
          metric: 'battery',
          value: metrics.battery.level,
          threshold: this.config.monitoring.alertThresholds.battery
        });
      }
    }
  }

  /**
   * Émettre une alerte
   */
  emitAlert(type, data) {
    const alert = {
      timestamp: new Date(),
      type,
      ...data
    };

    this.alertHistory.push(alert);

    // Garder seulement les 100 dernières alertes
    if (this.alertHistory.length > 100) {
      this.alertHistory = this.alertHistory.slice(-100);
    }

    this.emit('alert', alert);
    this.emit(`alert:${type}`, alert);

    console.log(`🚨 Alerte ${type}:`, data);
  }

  /**
   * Obtenir les métriques actuelles
   */
  getCurrentMetrics() {
    const latestSystem = Array.from(this.systemMetrics.values()).pop();
    const latestEmulators = {};

    for (const [deviceId, metrics] of this.emulatorMetrics) {
      latestEmulators[deviceId] = Array.from(metrics.values()).pop();
    }

    return {
      timestamp: new Date(),
      system: latestSystem || {},
      emulators: latestEmulators,
      alerts: this.alertHistory.slice(-5)
    };
  }

  /**
   * Obtenir les statistiques de monitoring
   */
  getStats() {
    const now = Date.now();
    const last24h = now - (24 * 60 * 60 * 1000);

    const recentAlerts = this.alertHistory.filter(alert =>
      alert.timestamp.getTime() > last24h
    );

    return {
      isMonitoring: this.isMonitoring,
      uptime: this.isMonitoring ? now - (this.monitorInterval ? Date.now() - this.monitorInterval : now) : 0,
      totalSystemMetrics: this.systemMetrics.size,
      totalEmulatorMetrics: Array.from(this.emulatorMetrics.values()).reduce((sum, metrics) => sum + metrics.size, 0),
      totalAlerts: this.alertHistory.length,
      recentAlerts: recentAlerts.length,
      alertTypes: this.getAlertStats()
    };
  }

  /**
   * Obtenir les statistiques d'alertes
   */
  getAlertStats() {
    const stats = {};

    for (const alert of this.alertHistory) {
      stats[alert.type] = (stats[alert.type] || 0) + 1;
    }

    return stats;
  }

  /**
   * Générer un rapport de santé
   */
  async generateHealthReport() {
    const currentMetrics = this.getCurrentMetrics();
    const stats = this.getStats();

    const report = {
      timestamp: new Date(),
      monitoring: {
        active: this.isMonitoring,
        uptime: stats.uptime,
        interval: this.config.monitoring.interval
      },
      system: currentMetrics.system,
      emulators: currentMetrics.emulators,
      alerts: {
        total: stats.totalAlerts,
        recent: stats.recentAlerts,
        types: stats.alertTypes
      },
      recommendations: this.generateRecommendations(currentMetrics)
    };

    return report;
  }

  /**
   * Générer des recommandations
   */
  generateRecommendations(metrics) {
    const recommendations = [];

    // Recommandations système
    if (metrics.system.cpu?.usage > 80) {
      recommendations.push('CPU système élevé - Considérer réduire le nombre d\'émulateurs');
    }

    if (metrics.system.memory?.usage > 85) {
      recommendations.push('Mémoire système élevée - Fermer les émulateurs inutilisés');
    }

    // Recommandations émulateurs
    for (const [deviceId, emulatorMetrics] of Object.entries(metrics.emulators)) {
      if (emulatorMetrics.memory?.usage > 90) {
        recommendations.push(`Émulateur ${deviceId}: Mémoire élevée - Redémarrer recommandé`);
      }

      if (emulatorMetrics.battery?.level < 30) {
        recommendations.push(`Émulateur ${deviceId}: Batterie faible - Recharger`);
      }
    }

    return recommendations;
  }

  /**
   * Nettoyer les ressources
   */
  cleanup() {
    this.stopMonitoring();
    this.emulatorMetrics.clear();
    this.systemMetrics.clear();
    this.alertHistory = [];
    this.removeAllListeners();
  }
}
