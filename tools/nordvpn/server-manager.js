/**
 * Gestionnaire de Serveurs NordVPN
 * Gère les 352 serveurs Canada + serveurs internationaux
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class NordVPNServerManager {
  constructor(config) {
    this.config = config;
    this.servers = new Map(); // country -> servers[]
    this.serverHealth = new Map(); // server -> health status
    this.lastHealthCheck = new Map(); // server -> timestamp
    this.healthCheckInterval = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Charger tous les serveurs disponibles
   */
  async loadServers() {
    console.log('📡 Chargement des serveurs NordVPN...');

    try {
      // Charger le serveur Canada (352 serveurs)
      const caServersPath = path.join(__dirname, '../../assets/vpn/ca-nordvpn-servers.json');
      if (fs.existsSync(caServersPath)) {
        const caServers = JSON.parse(fs.readFileSync(caServersPath, 'utf8'));
        this.servers.set('CA', caServers.map(server => ({
          hostname: server,
          country: 'CA',
          countryName: 'Canada',
          load: 0, // Will be updated by health checks
          lastUsed: null,
          successCount: 0,
          errorCount: 0
        })));
        console.log(`✅ ${caServers.length} serveurs Canada chargés`);
      }

      // TODO: Ajouter d'autres pays si nécessaire
      // const otherCountries = ['US', 'UK', 'FR', 'DE', 'AU'];
      // for (const country of otherCountries) {
      //   const serversPath = path.join(__dirname, `../../assets/vpn/${country.toLowerCase()}-nordvpn-servers.json`);
      //   if (fs.existsSync(serversPath)) {
      //     const servers = JSON.parse(fs.readFileSync(serversPath, 'utf8'));
      //     this.servers.set(country, servers.map(server => ({ hostname: server, country })));
      //   }
      // }

      console.log(`✅ ${this.getTotalServersCount()} serveurs chargés au total`);
    } catch (error) {
      console.error('❌ Erreur chargement serveurs:', error.message);
      throw error;
    }
  }

  /**
   * Sélectionner le serveur optimal pour un pays
   */
  async selectOptimalServer(country, strategy = 'auto') {
    const countryUpper = country.toUpperCase();
    const servers = this.servers.get(countryUpper);

    if (!servers || servers.length === 0) {
      throw new Error(`Aucun serveur disponible pour ${countryUpper}`);
    }

    // Mettre à jour la santé des serveurs si nécessaire
    await this.updateServerHealth(servers);

    switch (strategy) {
      case 'fastest':
        return this.selectFastestServer(servers);

      case 'random':
        return this.selectRandomServer(servers);

      case 'least_used':
        return this.selectLeastUsedServer(servers);

      case 'auto':
      default:
        return this.selectSmartServer(servers);
    }
  }

  /**
   * Sélection intelligente (balance charge + succès)
   */
  selectSmartServer(servers) {
    // Calculer un score pour chaque serveur
    const scoredServers = servers.map(server => {
      const health = this.serverHealth.get(server.hostname) || { load: 50, latency: 100 };
      const usageScore = server.errorCount / Math.max(server.successCount + server.errorCount, 1);
      const loadScore = health.load / 100;
      const timeSinceLastUse = server.lastUsed ? Date.now() - server.lastUsed : 0;
      const recencyBonus = Math.min(timeSinceLastUse / (60 * 1000), 10) / 10; // 0-1 bonus

      const score = (usageScore * 0.4) + (loadScore * 0.4) + (recencyBonus * 0.2);

      return { server, score, health };
    });

    // Trier par score (plus bas = meilleur)
    scoredServers.sort((a, b) => a.score - b.score);

    // Sélectionner le meilleur avec un peu de randomisation
    const bestServers = scoredServers.slice(0, 3);
    const selected = bestServers[Math.floor(Math.random() * bestServers.length)];

    console.log(`🎯 Serveur sélectionné: ${selected.server.hostname} (score: ${selected.score.toFixed(3)})`);

    return selected.server.hostname;
  }

  /**
   * Sélectionner le serveur le plus rapide
   */
  selectFastestServer(servers) {
    const healthyServers = servers.filter(server => {
      const health = this.serverHealth.get(server.hostname);
      return health && health.load < 80; // Éviter les serveurs surchargés
    });

    if (healthyServers.length === 0) {
      return this.selectRandomServer(servers);
    }

    // Trier par latence
    healthyServers.sort((a, b) => {
      const healthA = this.serverHealth.get(a.hostname) || { latency: 999 };
      const healthB = this.serverHealth.get(b.hostname) || { latency: 999 };
      return healthA.latency - healthB.latency;
    });

    return healthyServers[0].hostname;
  }

  /**
   * Sélectionner un serveur aléatoire
   */
  selectRandomServer(servers) {
    const randomIndex = Math.floor(Math.random() * servers.length);
    return servers[randomIndex].hostname;
  }

  /**
   * Sélectionner le serveur le moins utilisé
   */
  selectLeastUsedServer(servers) {
    const sortedServers = [...servers].sort((a, b) => {
      const totalA = a.successCount + a.errorCount;
      const totalB = b.successCount + b.errorCount;
      return totalA - totalB;
    });

    return sortedServers[0].hostname;
  }

  /**
   * Mettre à jour la santé des serveurs
   */
  async updateServerHealth(servers) {
    const now = Date.now();

    for (const server of servers) {
      const lastCheck = this.lastHealthCheck.get(server.hostname);
      const needsCheck = !lastCheck || (now - lastCheck > this.healthCheckInterval);

      if (needsCheck) {
        try {
          const health = await this.checkServerHealth(server.hostname);
          this.serverHealth.set(server.hostname, health);
          this.lastHealthCheck.set(server.hostname, now);
        } catch (error) {
          // Marquer comme dégradé
          this.serverHealth.set(server.hostname, { load: 100, latency: 999, error: error.message });
        }
      }
    }
  }

  /**
   * Vérifier la santé d'un serveur (simulation)
   * En production, ceci ferait un ping réel ou utiliserait l'API NordVPN
   */
  async checkServerHealth(server) {
    // Simulation de vérification de santé
    // En production, vous pourriez:
    // 1. Ping le serveur
    // 2. Utiliser l'API NordVPN pour les stats
    // 3. Tester une connexion rapide

    const load = Math.floor(Math.random() * 100); // 0-100%
    const latency = 20 + Math.random() * 180; // 20-200ms

    return {
      load,
      latency: Math.round(latency),
      lastCheck: new Date(),
      status: load < 80 ? 'healthy' : 'degraded'
    };
  }

  /**
   * Marquer l'utilisation d'un serveur
   */
  recordServerUsage(server, success = true) {
    const servers = Array.from(this.servers.values()).flat();
    const serverObj = servers.find(s => s.hostname === server);

    if (serverObj) {
      if (success) {
        serverObj.successCount++;
      } else {
        serverObj.errorCount++;
      }
      serverObj.lastUsed = Date.now();
    }
  }

  /**
   * Obtenir les statistiques d'un pays
   */
  getCountryStats(country) {
    const countryUpper = country.toUpperCase();
    const servers = this.servers.get(countryUpper) || [];

    const total = servers.length;
    const healthy = servers.filter(s => {
      const health = this.serverHealth.get(s.hostname);
      return health && health.status === 'healthy';
    }).length;

    const avgLoad = servers.reduce((sum, s) => {
      const health = this.serverHealth.get(s.hostname);
      return sum + (health ? health.load : 50);
    }, 0) / Math.max(total, 1);

    return {
      country: countryUpper,
      totalServers: total,
      healthyServers: healthy,
      averageLoad: Math.round(avgLoad),
      healthRate: total > 0 ? (healthy / total) : 0
    };
  }

  /**
   * Obtenir tous les pays disponibles
   */
  getAvailableCountries() {
    return Array.from(this.servers.keys());
  }

  /**
   * Obtenir le nombre total de serveurs
   */
  getTotalServersCount() {
    return Array.from(this.servers.values()).reduce((sum, servers) => sum + servers.length, 0);
  }

  /**
   * Obtenir le nombre de serveurs disponibles
   */
  getAvailableServersCount() {
    return this.getTotalServersCount();
  }

  /**
   * Obtenir les serveurs d'un pays
   */
  getServers(country) {
    return this.servers.get(country.toUpperCase()) || [];
  }

  /**
   * Obtenir la santé d'un serveur
   */
  getServerHealth(server) {
    return this.serverHealth.get(server) || { load: 50, latency: 100, status: 'unknown' };
  }
}
