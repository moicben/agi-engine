/**
 * Service Android Studio Complet - Architecture Modulaire
 * Supporte: Linux, macOS, Émulateurs, ADB, WhatsApp, NordVPN
 */

import { EventEmitter } from 'events';
import { execAsync, sleep } from '../whatsapp/helpers.js';
import { AndroidStudioEmulatorManager } from './emulator-manager.js';
import { AndroidStudioSDKManager } from './sdk-manager.js';
import { AndroidStudioPlatformManager } from './platform-manager.js';
import { AndroidStudioConfig } from './config.js';
import { AndroidStudioMonitor } from './monitor.js';

export class AndroidStudioService extends EventEmitter {
  constructor(options = {}) {
    super();
    this.config = new AndroidStudioConfig(options);
    this.platform = new AndroidStudioPlatformManager(this.config);
    this.sdk = new AndroidStudioSDKManager(this.config);
    this.emulators = new AndroidStudioEmulatorManager(this.config);
    this.monitor = new AndroidStudioMonitor(this.config);

    this.isInitialized = false;
    this.isRunning = false;
    this.currentPlatform = null;
    this.activeEmulators = new Map();
  }

  /**
   * Initialisation complète du service Android Studio
   */
  async initialize() {
    console.log('🔧 Initialisation du service Android Studio...');

    try {
      // Détecter la plateforme
      this.currentPlatform = await this.platform.detectPlatform();
      console.log(`📱 Plateforme détectée: ${this.currentPlatform.name} (${this.currentPlatform.os})`);

      // Vérifier l'installation d'Android Studio/SDK
      await this.checkInstallation();

      // Initialiser les composants
      await this.sdk.initialize();
      await this.emulators.initialize();
      await this.monitor.initialize();

      // Démarrer le monitoring
      this.monitor.startMonitoring();

      this.isInitialized = true;
      console.log('✅ Service Android Studio initialisé');

      this.emit('initialized', { platform: this.currentPlatform });
      return true;

    } catch (error) {
      console.error('❌ Erreur initialisation Android Studio:', error.message);
      throw error;
    }
  }

  /**
   * Vérifier l'installation d'Android Studio et du SDK
   */
  async checkInstallation() {
    try {
      // Vérifier Android Studio
      const studioPath = await this.platform.findAndroidStudio();
      if (studioPath) {
        console.log('✅ Android Studio trouvé:', studioPath);
      } else {
        console.log('⚠️ Android Studio non trouvé, fonctionnement en mode SDK uniquement');
      }

      // Vérifier le SDK Android
      const sdkPath = await this.sdk.findSDK();
      if (sdkPath) {
        console.log('✅ Android SDK trouvé:', sdkPath);
      } else {
        throw new Error('Android SDK non trouvé. Installez Android Studio ou configurez ANDROID_HOME');
      }

      // Vérifier ADB
      await this.checkADB();

      return true;
    } catch (error) {
      throw new Error(`Installation incomplète: ${error.message}`);
    }
  }

  /**
   * Vérifier ADB
   */
  async checkADB() {
    try {
      const { stdout } = await execAsync('adb version');
      const version = stdout.match(/version ([\d\.]+)/)?.[1];
      console.log('✅ ADB trouvé, version:', version || 'inconnue');
      return true;
    } catch (error) {
      throw new Error('ADB non trouvé. Installez Android SDK Platform Tools');
    }
  }

  /**
   * Créer un émulateur avec configuration optimisée
   */
  async createOptimizedEmulator(options = {}) {
    const {
      name = `whatsapp-${Date.now()}`,
      apiLevel = 29, // Android 10
      device = 'pixel_4',
      memory = 2048, // 2GB
      storage = 4096, // 4GB
      width = 1080,
      height = 1920,
      density = 420,
      autoStart = true
    } = options;

    console.log(`📱 Création de l'émulateur optimisé: ${name}`);

    try {
      // Configuration de l'émulateur
      const emulatorConfig = {
        name,
        apiLevel,
        device,
        memory,
        storage,
        width,
        height,
        density,
        // Optimisations pour WhatsApp
        noAudio: true,
        noWindow: false,
        noSnapshotLoad: true,
        lowMemory: true,
        headless: false
      };

      // Créer l'émulateur
      const emulator = await this.emulators.createEmulator(emulatorConfig);

      if (autoStart) {
        await this.startEmulator(emulator.id);
      }

      this.activeEmulators.set(emulator.id, emulator);
      console.log(`✅ Émulateur créé: ${emulator.id}`);

      this.emit('emulator:created', { emulator, config: emulatorConfig });
      return emulator;

    } catch (error) {
      console.error('❌ Erreur création émulateur:', error.message);
      throw error;
    }
  }

  /**
   * Démarrer un émulateur
   */
  async startEmulator(emulatorId, options = {}) {
    const {
      timeout = 120000, // 2 minutes
      waitForBoot = true
    } = options;

    console.log(`🚀 Démarrage de l'émulateur: ${emulatorId}`);

    try {
      const result = await this.emulators.startEmulator(emulatorId, { timeout });

      if (waitForBoot) {
        await this.waitForDevice(emulatorId, timeout);
      }

      const emulator = this.activeEmulators.get(emulatorId);
      if (emulator) {
        emulator.status = 'running';
        emulator.startedAt = new Date();
      }

      console.log(`✅ Émulateur démarré: ${emulatorId}`);
      this.emit('emulator:started', { emulatorId, result });

      return result;

    } catch (error) {
      console.error('❌ Erreur démarrage émulateur:', error.message);
      throw error;
    }
  }

  /**
   * Attendre qu'un device soit prêt
   */
  async waitForDevice(deviceId, timeout = 120000) {
    const startTime = Date.now();

    console.log(`⏳ Attente du device: ${deviceId}`);

    while (Date.now() - startTime < timeout) {
      try {
        const { stdout } = await execAsync(`adb -s ${deviceId} shell getprop sys.boot_completed`);
        if (stdout.trim() === '1') {
          console.log(`✅ Device prêt: ${deviceId}`);
          return true;
        }
      } catch (error) {
        // Device pas encore prêt
      }

      await sleep(2000);
    }

    throw new Error(`Timeout: Device ${deviceId} pas prêt après ${timeout}ms`);
  }

  /**
   * Créer un workflow WhatsApp complet
   */
  async createWhatsAppWorkflow(options = {}) {
    const {
      emulatorName = `whatsapp-${Date.now()}`,
      country = 'ca',
      useNordVPN = true,
      installWhatsApp = true,
      configureDevice = true
    } = options;

    console.log(`🔄 Création workflow WhatsApp: ${emulatorName} (${country})`);

    try {
      // 1. Créer l'émulateur optimisé
      const emulator = await this.createOptimizedEmulator({
        name: emulatorName,
        apiLevel: 29,
        device: 'pixel_4'
      });

      // 2. Intégration NordVPN si demandé
      if (useNordVPN) {
        await this.integrateNordVPN(emulator.id, country);
      }

      // 3. Installer WhatsApp si demandé
      if (installWhatsApp) {
        await this.installWhatsApp(emulator.id);
      }

      // 4. Configurer le device si demandé
      if (configureDevice) {
        await this.configureDeviceForWhatsApp(emulator.id, country);
      }

      console.log(`✅ Workflow WhatsApp créé: ${emulatorName}`);
      this.emit('workflow:created', {
        emulator,
        country,
        useNordVPN,
        installWhatsApp,
        configureDevice
      });

      return {
        emulator,
        deviceId: emulator.id,
        country,
        ready: true
      };

    } catch (error) {
      console.error('❌ Erreur workflow WhatsApp:', error.message);
      throw error;
    }
  }

  /**
   * Intégrer NordVPN avec l'émulateur
   */
  async integrateNordVPN(deviceId, country) {
    try {
      // Importer le service NordVPN
      const { nordVPNService } = await import('../nordvpn/index.js');

      if (!nordVPNService.isConnected) {
        console.log(`🌍 Configuration NordVPN pour ${country}...`);
        await nordVPNService.initialize();
        await nordVPNService.connectToCountry(country);
      }

      console.log(`✅ NordVPN intégré avec ${deviceId}`);
      return true;

    } catch (error) {
      console.log(`⚠️ Intégration NordVPN échouée: ${error.message}`);
      return false;
    }
  }

  /**
   * Installer WhatsApp sur un device
   */
  async installWhatsApp(deviceId) {
    try {
      // Trouver l'APK WhatsApp
      const apkPath = await this.findWhatsAppAPK();

      if (apkPath) {
        console.log(`📦 Installation WhatsApp sur ${deviceId}...`);
        await execAsync(`adb -s ${deviceId} install "${apkPath}"`);
        console.log(`✅ WhatsApp installé sur ${deviceId}`);
        return true;
      } else {
        console.log(`⚠️ APK WhatsApp non trouvé`);
        return false;
      }

    } catch (error) {
      console.error('❌ Erreur installation WhatsApp:', error.message);
      return false;
    }
  }

  /**
   * Configurer le device pour WhatsApp
   */
  async configureDeviceForWhatsApp(deviceId, country) {
    try {
      console.log(`⚙️ Configuration device ${deviceId} pour WhatsApp...`);

      // Désactiver les animations
      await execAsync(`adb -s ${deviceId} shell settings put global window_animation_scale 0`);
      await execAsync(`adb -s ${deviceId} shell settings put global transition_animation_scale 0`);
      await execAsync(`adb -s ${deviceId} shell settings put global animator_duration_scale 0`);

      // Configurer la langue
      const language = this.getLanguageForCountry(country);
      await execAsync(`adb -s ${deviceId} shell setprop persist.sys.locale ${language}`);

      // Configurer le timezone
      const timezone = this.getTimezoneForCountry(country);
      await execAsync(`adb -s ${deviceId} shell setprop persist.sys.timezone ${timezone}`);

      // Autoriser les permissions
      await execAsync(`adb -s ${deviceId} shell pm grant com.whatsapp android.permission.READ_EXTERNAL_STORAGE`);
      await execAsync(`adb -s ${deviceId} shell pm grant com.whatsapp android.permission.WRITE_EXTERNAL_STORAGE`);
      await execAsync(`adb -s ${deviceId} shell pm grant com.whatsapp android.permission.CAMERA`);
      await execAsync(`adb -s ${deviceId} shell pm grant com.whatsapp android.permission.READ_CONTACTS`);
      await execAsync(`adb -s ${deviceId} shell pm grant com.whatsapp android.permission.WRITE_CONTACTS`);

      console.log(`✅ Device ${deviceId} configuré pour WhatsApp`);
      return true;

    } catch (error) {
      console.error('❌ Erreur configuration device:', error.message);
      return false;
    }
  }

  /**
   * Obtenir la langue pour un pays
   */
  getLanguageForCountry(country) {
    const languageMap = {
      'fr': 'fr-FR',
      'ca': 'en-CA',
      'us': 'en-US',
      'uk': 'en-GB',
      'de': 'de-DE',
      'es': 'es-ES',
      'it': 'it-IT'
    };
    return languageMap[country.toLowerCase()] || 'en-US';
  }

  /**
   * Obtenir le timezone pour un pays
   */
  getTimezoneForCountry(country) {
    const timezoneMap = {
      'fr': 'Europe/Paris',
      'ca': 'America/Toronto',
      'us': 'America/New_York',
      'uk': 'Europe/London',
      'de': 'Europe/Berlin',
      'es': 'Europe/Madrid',
      'it': 'Europe/Rome'
    };
    return timezoneMap[country.toLowerCase()] || 'UTC';
  }

  /**
   * Trouver l'APK WhatsApp
   */
  async findWhatsAppAPK() {
    const possiblePaths = [
      './assets/apk/whatsapp.apk',
      './assets/apk/Whatsapp.apk',
      './assets/apk/WhatsApp.apk',
      '/opt/whatsapp.apk'
    ];

    for (const path of possiblePaths) {
      try {
        await execAsync(`test -f "${path}"`);
        return path;
      } catch (error) {
        // Fichier non trouvé
      }
    }

    return null;
  }

  /**
   * Obtenir les statistiques
   */
  getStats() {
    return {
      isInitialized: this.isInitialized,
      isRunning: this.isRunning,
      platform: this.currentPlatform,
      activeEmulators: this.activeEmulators.size,
      sdk: {
        path: this.sdk.sdkPath,
        version: this.sdk.sdkVersion
      },
      emulators: this.emulators.getStats()
    };
  }

  /**
   * Nettoyer les ressources
   */
  async cleanup() {
    console.log('🧹 Nettoyage du service Android Studio...');

    // Arrêter tous les émulateurs
    for (const [id, emulator] of this.activeEmulators) {
      try {
        await this.emulators.stopEmulator(id);
      } catch (error) {
        console.log(`⚠️ Erreur arrêt émulateur ${id}:`, error.message);
      }
    }

    // Arrêter le monitoring
    if (this.monitor) {
      this.monitor.stopMonitoring();
    }

    this.isInitialized = false;
    this.activeEmulators.clear();

    console.log('✅ Service Android Studio nettoyé');
  }
}

// Instance singleton
export const androidStudioService = new AndroidStudioService();