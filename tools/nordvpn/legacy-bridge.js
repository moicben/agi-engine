/**
 * Bridge de compatibilité pour l'ancien nordvpn.js
 * Permet d'utiliser le nouveau service avec l'ancienne interface
 */

import { nordVPNService } from './nordvpn-service.js';
import { sleep } from '../whatsapp/helpers.js';

// Variables globales pour la compatibilité
let isConnected = false;
let currentServer = null;

// Interface compatible avec l'ancien nordvpn.js
export async function getRandomServer(country) {
  try {
    await nordVPNService.initialize();
    const server = await nordVPNService.serverManager.selectOptimalServer(country, 'random');
    return server;
  } catch (error) {
    console.error('Erreur getRandomServer:', error.message);
    // Fallback vers l'ancien comportement
    const servers = require(`../assets/vpn/${country}-nordvpn-servers.json`);
    return servers[Math.floor(Math.random() * servers.length)];
  }
}

export async function connectToServer(country) {
  try {
    await nordVPNService.initialize();
    const result = await nordVPNService.connectToCountry(country, {
      serverType: 'random',
      verifyConnection: false
    });

    if (result.success) {
      isConnected = true;
      currentServer = result.server;
      console.log(`✅ Connecté via nouveau service: ${result.server}`);
    } else {
      throw new Error('Échec de connexion');
    }
  } catch (error) {
    console.error('Erreur connectToServer:', error.message);
    console.log('🔄 Fallback vers simulation...');

    // Simulation pour la compatibilité
    isConnected = true;
    console.log(`🔌 Simulation connexion: ${country}`);
    await sleep(1000);
  }
}

export async function disconnectFromServer() {
  try {
    if (nordVPNService.isConnected) {
      await nordVPNService.disconnect();
    }
    isConnected = false;
    currentServer = null;
    console.log('✅ Déconnecté via nouveau service');
  } catch (error) {
    console.error('Erreur disconnectFromServer:', error.message);
    console.log('🔄 Simulation déconnexion...');
    isConnected = false;
    await sleep(1000);
  }
}

// Nouvelles fonctions pour migrer vers le nouveau service
export async function initializeNewService() {
  await nordVPNService.initialize();
  return nordVPNService;
}

export async function getService() {
  return nordVPNService;
}

export async function migrateToNewAPI() {
  console.log('🚀 Migration vers la nouvelle API NordVPN...');
  console.log('📚 Nouvelle interface disponible:');
  console.log('   - nordVPNService.connectToCountry("ca")');
  console.log('   - nordVPNService.rotator.rotateForWhatsApp()');
  console.log('   - nordVPNService.monitor.startMonitoring()');
  console.log('   - Voir tools/nordvpn/README.md pour la documentation complète');

  return nordVPNService;
}

// Export de compatibilité
export { nordVPNService as newService };
export { initializeNewService as init };
export { migrateToNewAPI as migrate };
