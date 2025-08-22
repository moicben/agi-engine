/**
 * Point d'entrée principal NordVPN
 * Interface unifiée pour tous les services NordVPN
 */

export { NordVPNService, nordVPNService } from './nordvpn-service.js';
export { NordVPNServerManager } from './server-manager.js';
export { NordVPNMonitor } from './monitor.js';
export { NordVPNRotator } from './rotator.js';
export { NordVPNConfig, whatsappConfig } from './config.js';
export { defaultConfig } from './config.js';

// Fonctions utilitaires pour usage rapide
import { nordVPNService } from './nordvpn-service.js';
import { whatsappConfig, defaultConfig } from './config.js';

/**
 * Initialisation rapide
 */
export async function initNordVPN(options = {}) {
  await nordVPNService.initialize();
  return nordVPNService;
}

/**
 * Connexion rapide à un pays
 */
export async function connect(country, options = {}) {
  return await nordVPNService.connectToCountry(country, options);
}

/**
 * Rotation pour WhatsApp
 */
export async function rotateForWhatsApp(country = 'ca', options = {}) {
  const config = { ...whatsappConfig, ...options };
  return await nordVPNService.rotator.rotateForWhatsApp({ country, ...config.whatsapp });
}

/**
 * Obtenir le statut actuel
 */
export async function getStatus() {
  return await nordVPNService.getStatus();
}

/**
 * Déconnexion
 */
export async function disconnect() {
  return await nordVPNService.disconnect();
}

/**
 * Obtenir les statistiques
 */
export function getStats() {
  return {
    service: nordVPNService.getStats(),
    rotation: nordVPNService.rotator.getRotationStats(),
    monitoring: nordVPNService.monitor.getMetrics()
  };
}

/**
 * Nettoyage
 */
export async function cleanup() {
  await nordVPNService.cleanup();
}

/**
 * Configuration par défaut
 */
export const CONFIG = {
  DEFAULT: defaultConfig,
  WHATSAPP: whatsappConfig
};

// Export des types pour TypeScript (si utilisé)
export const TYPES = {
  SERVICE: 'NordVPNService',
  MONITOR: 'NordVPNMonitor',
  ROTATOR: 'NordVPNRotator',
  MANAGER: 'NordVPNServerManager',
  CONFIG: 'NordVPNConfig'
};

// Messages d'aide
export const HELP = {
  QUICK_START: `
🚀 Démarrage rapide NordVPN:

import { initNordVPN, connect, rotateForWhatsApp } from './tools/nordvpn/index.js';

// Initialisation
await initNordVPN();

// Connexion simple
await connect('ca');

// Rotation pour WhatsApp
await rotateForWhatsApp('ca');

// Nettoyage
await cleanup();
  `,

  CONFIG_WHATSAPP: `
⚙️ Configuration optimisée WhatsApp:

import { NordVPNService } from './tools/nordvpn/index.js';
import { whatsappConfig } from './tools/nordvpn/config.js';

const service = new NordVPNService(whatsappConfig);
await service.initialize();

// Rotation toutes les 10 minutes avec vérification
await service.rotator.rotateForWhatsApp({
  country: 'ca',
  minInterval: 600000,
  verifyConnection: true
});
  `,

  MONITORING: `
📊 Monitoring et alertes:

import { NordVPNService } from './tools/nordvpn/index.js';

const service = new NordVPNService();

// Écouter les événements
service.monitor.on('health:healthy', (status) => {
  console.log('✅ NordVPN sain');
});

service.monitor.on('health:error', (status) => {
  console.log('❌ Problème NordVPN:', status.error);
});

service.monitor.on('alert:disconnected', () => {
  console.log('🔴 NordVPN déconnecté!');
});
  `
};

// Console.log d'aide au démarrage
console.log(`
🌐 Service NordVPN Modulaire - Prêt à l'emploi
📖 Tapez: console.log(HELP.QUICK_START) pour l'aide
⚙️ Configuration optimisée WhatsApp: whatsappConfig
🔄 Service principal: nordVPNService
`);
