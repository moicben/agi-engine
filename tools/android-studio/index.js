/**
 * Point d'entrée principal Android Studio
 * Interface unifiée pour tous les services Android Studio
 */

// Services principaux
export { AndroidStudioService, androidStudioService } from './android-studio-service.js';
export { AndroidStudioEmulatorManager } from './emulator-manager.js';
export { AndroidStudioSDKManager } from './sdk-manager.js';
export { AndroidStudioPlatformManager } from './platform-manager.js';
export { AndroidStudioMonitor } from './monitor.js';
export { AndroidStudioConfig, defaultConfig, whatsappConfig, testingConfig } from './config.js';

// Fonctions utilitaires pour usage rapide
import { androidStudioService } from './android-studio-service.js';
import { whatsappConfig, defaultConfig, testingConfig } from './config.js';

/**
 * Initialisation rapide
 */
export async function initAndroidStudio(options = {}) {
  await androidStudioService.initialize();
  return androidStudioService;
}

/**
 * Créer un émulateur optimisé
 */
export async function createEmulator(options = {}) {
  await androidStudioService.initialize();
  return await androidStudioService.createOptimizedEmulator(options);
}

/**
 * Créer un workflow WhatsApp complet
 */
export async function createWhatsAppWorkflow(options = {}) {
  await androidStudioService.initialize();
  return await androidStudioService.createWhatsAppWorkflow(options);
}

/**
 * Obtenir le statut du service
 */
export async function getStatus() {
  return androidStudioService.getStats();
}

/**
 * Nettoyer les ressources
 */
export async function cleanup() {
  await androidStudioService.cleanup();
}

/**
 * Configuration par défaut
 */
export const CONFIG = {
  DEFAULT: defaultConfig,
  WHATSAPP: whatsappConfig,
  TESTING: testingConfig
};

// Export des types pour TypeScript (si utilisé)
export const TYPES = {
  SERVICE: 'AndroidStudioService',
  EMULATOR_MANAGER: 'AndroidStudioEmulatorManager',
  SDK_MANAGER: 'AndroidStudioSDKManager',
  PLATFORM_MANAGER: 'AndroidStudioPlatformManager',
  MONITOR: 'AndroidStudioMonitor',
  CONFIG: 'AndroidStudioConfig'
};

// Messages d'aide
export const HELP = {
  QUICK_START: `
🚀 Démarrage rapide Android Studio:

import { initAndroidStudio, createWhatsAppWorkflow } from './tools/android-studio/index.js';

// Initialisation
await initAndroidStudio();

// Créer un workflow WhatsApp complet
const workflow = await createWhatsAppWorkflow({
  emulatorName: 'whatsapp-ca',
  country: 'ca',
  useNordVPN: true,
  installWhatsApp: true
});

console.log('✅ Workflow WhatsApp créé:', workflow);
  `,

  EMULATOR_MANAGEMENT: `
📱 Gestion des émulateurs:

import { AndroidStudioService } from './tools/android-studio/index.js';

const service = new AndroidStudioService();
await service.initialize();

// Créer un émulateur optimisé
const emulator = await service.createOptimizedEmulator({
  name: 'my-app-test',
  apiLevel: 31,
  memory: 3072,
  storage: 6144,
  width: 1440,
  height: 3120
});

// Démarrer l'émulateur
await service.startEmulator(emulator.id);

// Arrêter l'émulateur
await service.stopEmulator(emulator.id);
  `,

  WHATSAPP_INTEGRATION: `
📱 Intégration WhatsApp + NordVPN:

import { AndroidStudioService } from './tools/android-studio/index.js';
import { nordVPNService } from '../nordvpn/index.js';

const androidService = new AndroidStudioService(whatsappConfig);
await androidService.initialize();

// Intégration NordVPN
await nordVPNService.initialize();

// Créer workflow complet
const workflow = await androidService.createWhatsAppWorkflow({
  emulatorName: 'whatsapp-vpn-ca',
  country: 'ca',
  useNordVPN: true,
  installWhatsApp: true,
  configureDevice: true
});

console.log('🎉 Workflow WhatsApp + NordVPN créé!');
  `,

  MONITORING: `
📊 Monitoring et alertes:

import { AndroidStudioService } from './tools/android-studio/index.js';

const service = new AndroidStudioService();
await service.initialize();

// Écouter les événements de monitoring
service.monitor.on('alert:high_memory', (alert) => {
  console.log('🚨 Mémoire élevée:', alert);
});

// Écouter les événements d'émulateur
service.on('emulator:created', (data) => {
  console.log('✅ Émulateur créé:', data.emulator.name);
});

// Obtenir les métriques actuelles
const metrics = service.monitor.getCurrentMetrics();
console.log('📈 Métriques:', metrics);
  `,

  PLATFORM_DETECTION: `
🖥️ Détection de plateforme:

import { AndroidStudioPlatformManager } from './tools/android-studio/index.js';

const platform = new AndroidStudioPlatformManager(config);
const info = await platform.detectPlatform();

console.log('📍 Plateforme:', info.name);
console.log('🏗️ Architecture:', info.arch);
console.log('💾 Mémoire:', \`\${info.memory.total}MB\`);
console.log('⚡ CPU:', \`\${info.cpu.cores} cœurs\`);

const recommendations = platform.getRecommendedConfig();
console.log('💡 Recommandations:', recommendations.recommended);
  `
};

// Console.log d'aide au démarrage
console.log(`
🤖 Service Android Studio Modulaire - Prêt à l'emploi
📖 Tapez: console.log(HELP.QUICK_START) pour l'aide
⚙️ Configuration optimisée WhatsApp: whatsappConfig
🔄 Service principal: androidStudioService
`);
