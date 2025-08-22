/**
 * Device Service minimaliste
 * Gère les environnements : morelogin, bluestacks, cloud
 */

import { execAsync } from './helpers.js';
import { config as coreConfig } from '../../core/config.js';

// État global des devices
const devices = new Map();


// Implémentations MoreLogin
async function createMoreLoginDevice(config) {
  // Simulation simple pour MoreLogin
  const deviceId = `morelogin-${Date.now()}`;
  const device = {
    id: deviceId,
    type: 'morelogin',
    status: 'created',
    config
  };
  
  devices.set(deviceId, device);
  console.log(`📱 Device MoreLogin créé: ${deviceId}`);
  return device;
}
async function launchMoreLoginDevice(deviceId, config) {
  const device = devices.get(deviceId) || { id: deviceId, type: 'morelogin' };
  device.status = 'running';
  console.log(`🚀 Device MoreLogin lancé: ${deviceId}`);
  return device;
}

// Implémentations Studio Emulator
async function launchStudioDevice(deviceId) {
  console.log(`🚀 Recherche de l'émulateur Studio: ${deviceId}`);

    
    // Vérifier si l'émulateur est déjà démarré
    try {
      await execAsync(`adb -s ${deviceId} shell echo "test"`);
      console.log(`✅ Émulateur ${deviceId} déjà actif`);
      return deviceId;
    } catch (error) {
      console.log(`⚠️ Émulateur ${deviceId} non trouvé, tentative de démarrage...`);
      
      try {
        // Lancer l'émulateur en arrière-plan (sans attendre)
        console.log(`🚀 Démarrage de l'émulateur en arrière-plan...`);
        execAsync(`nohup emulator -avd ${deviceId} > /dev/null 2>&1 &`).catch(() => {
          // Ignorer les erreurs du démarrage en arrière-plan
        });
        
        // Attendre que l'émulateur soit prêt (max 30 secondes)
        console.log(`⏳ Attente du démarrage de l'émulateur...`);
        for (let i = 0; i < 20; i++) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          try {
            await execAsync(`adb -s ${deviceId} shell echo "test"`);
            console.log(`✅ Émulateur ${deviceId} démarré et connecté`);
            return deviceId;
          } catch (testError) {
            // Émulateur pas encore prêt, continuer à attendre
          }
        }
        
        console.log(`⚠️ Timeout: L'émulateur n'a pas démarré dans les 30 secondes`);
        console.log(`💡 Assurez-vous que l'émulateur "MASTER" existe et peut être démarré`);
        return deviceId; // Retourner quand même l'ID
        
      } catch (startError) {
        console.log(`❌ Impossible de démarrer l'émulateur: ${startError.message}`);
        console.log(`💡 Veuillez démarrer manuellement: emulator -avd MASTER`);
        return deviceId;
      }
  }

  return deviceId;
}

// Implémentations BlueStacks
async function launchBlueStacksDevice(deviceId, config) {
  const device = devices.get(deviceId) || { id: deviceId, type: 'bluestacks' };
  
  // Vérifier la connexion
  try {
    await execAsync(`adb -s ${deviceId} shell echo "test"`);
    device.status = 'running';
    console.log(`🚀 Device BlueStacks actif: ${deviceId}`);
  } catch (error) {
    throw new Error(`Device non connecté: ${deviceId}`);
  }
  
  return device;
}

// Discover Bluestacks Instances by bulk connection
async function discoverBluestacksInstance(startPort = 5555) {
  const deviceIp = "127.0.0.1:"
  // Découper la vérification en lots de 10 ports à la fois
  const devicesPorts = [];
  // 10 ports par batch, 10 batches, 100 ports total
  for (let batch = 0; batch < 10; batch++) {
    // 10 ports par batch
    const start = startPort + batch * 10;
    // Incrémenter de 10 en 10 dans le batch
    for (let i = 0; i < 10; i+=10) {
      devicesPorts.push(start + i);
    }
  }
  const deviceList = devicesPorts.map(port => `${deviceIp}${port}`);
  const connectedDevices = [];

  for (const device of deviceList) {
    const result = await execAsync(`adb connect ${device}`);
    // Ensure result is a string before calling includes
    const resultStr = typeof result === 'string' ? result : (result && result.stdout ? String(result.stdout) : String(result));
    if (resultStr.includes('connected')) {
      console.log(`✅ Device ${device} connecté`);
      connectedDevices.push(device);
    } 
  }
  
  return connectedDevices;
}


/**
 * Convertir un device ID ou adresse en identifiant device valide
 * @param {string|number} device - ID du device, adresse IP, ou nom d'émulateur
 * @returns {string} - Identifiant device valide (ex: "127.0.0.1:6065" ou "emulator-5554")
 */
function getDevice(device) {
  const deviceStr = String(device).trim();


  // Si c'est un numéro de device, le retourner tel quel
  if (!isNaN(deviceStr)) {
    return deviceStr;
  }
  
  // Si c'est déjà une adresse IP complète (contient :), la retourner
  // if (deviceStr.includes(':')) {
  //   return deviceStr;
  // }
  
  // Si c'est un émulateur (commence par "emulator-" ou "émulateur-"), le retourner tel quel
  // if (deviceStr.match(/^(emulator|émulateur)-\d+$/i)) {
  //   return deviceStr;
  // }
  
  // Essayer de convertir en entier pour les ports
  const deviceId = parseInt(deviceStr);
  
  // Si ce n'est pas un nombre, retourner tel quel (peut être un nom de device spécial)
  // if (isNaN(deviceId)) {
  //   return deviceStr;
  // }
  
  // Chercher dans la configuration pour les ports
  const deviceConfig = coreConfig.devicePorts?.find(d => d.id === deviceId);
  
  // if (deviceConfig) {
  //   // Trouvé dans la config, utiliser le port configuré
  //   return `127.0.0.1:${deviceConfig.port}`;
  // } else {
  //   // Pas trouvé dans config, on assume que c'est un port direct
  //   return `127.0.0.1:${deviceStr}`;
  // }
}

// Se connecter à un device
async function connectDevice(device) {
  try {
      //  console.log(`🔌 Connexion au device ${device}...`);
      
      // Les émulateurs sont généralement déjà connectés, pas besoin de adb connect
      if (device.match(/^(emulator|émulateur)-\d+$/i)) {
        // Vérifier si l'émulateur est accessible
        await execAsync(`adb -s ${device} shell echo "test"`);
        // console.log(`✅ Émulateur ${device} accessible`);
      }
      else {
        // Pour les adresses IP, utiliser adb connect
        await execAsync('adb connect ' + device);
        // console.log(`✅ Device ${device} connecté`);
      }

      // Désactiver le clavier et la barre de navigation du device
      await execAsync(`adb -s ${device} shell settings put secure show_ime_with_hard_keyboard 0`);
      await execAsync(`adb -s ${device} shell settings put secure show_ime_with_full_screen_intent 0`);
      await execAsync(`adb -s ${device} shell settings put secure show_navigation_bar 0`);
      await execAsync(`adb -s ${device} shell settings put secure show_navigation_bar_with_hotkeys 0`);
      await execAsync(`adb -s ${device} shell "settings put global policy_control immersive.navigation=*"`);

      return true;
  } catch (error) {
      console.error(`❌ Impossible de se connecter au device ${device}:`, error.message);
      throw error;
  }
}

// Export du service
const deviceService = {
  createMoreLoginDevice,
  launchMoreLoginDevice,
  launchStudioDevice,
  launchBlueStacksDevice,
  connectDevice,
  discoverBluestacksInstance,
  getDevice
};

export { deviceService };