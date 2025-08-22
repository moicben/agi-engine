/**
 * Configuration Android Studio
 * Paramètres centralisés pour tous les services Android Studio
 */

export class AndroidStudioConfig {
  constructor(options = {}) {
    // Configuration de base
    this.workspace = options.workspace || process.env.ANDROID_STUDIO_WORKSPACE || './android-workspace';
    this.debug = options.debug || false;
    this.timeout = options.timeout || 120000; // 2 minutes

    // Configuration SDK
    this.sdk = {
      autoInstall: options.autoInstallSDK !== false,
      acceptLicenses: options.acceptLicenses !== false,
      updateOnStart: options.updateSDK || false,
      requiredComponents: options.requiredComponents || [
        'platform-tools',
        'build-tools;33.0.2',
        'platforms;android-29',
        'platforms;android-31',
        'system-images;android-29;google_apis;x86_64',
        'emulator'
      ]
    };

    // Configuration des émulateurs
    this.emulators = {
      defaultApiLevel: options.defaultApiLevel || 29,
      defaultDevice: options.defaultDevice || 'pixel_4',
      defaultMemory: options.defaultMemory || 2048,
      defaultStorage: options.defaultStorage || 4096,
      defaultResolution: options.defaultResolution || '1080x1920',
      defaultDensity: options.defaultDensity || 420,
      maxConcurrent: options.maxConcurrentEmulators || 3,
      autoStart: options.autoStartEmulators || false,
      headless: options.headlessMode || false,
      noAudio: options.noAudio !== false,
      lowMemory: options.lowMemory || true,
      enableSnapshots: options.enableSnapshots || false,
      timeout: options.emulatorTimeout || 120000
    };

    // Configuration WhatsApp
    this.whatsapp = {
      enabled: options.whatsappEnabled !== false,
      apkPath: options.whatsappApkPath || './assets/apk/whatsapp.apk',
      autoInstall: options.autoInstallWhatsApp !== false,
      configureDevice: options.configureDevice !== false,
      country: options.defaultCountry || 'ca',
      useNordVPN: options.integrateNordVPN !== false
    };

    // Configuration NordVPN (intégration)
    this.nordvpn = {
      enabled: options.nordvpnEnabled !== false,
      autoConnect: options.autoConnectVPN || false,
      defaultCountry: options.vpnCountry || 'ca',
      timeout: options.vpnTimeout || 30000
    };

    // Configuration ADB
    this.adb = {
      timeout: options.adbTimeout || 30000,
      retryCount: options.adbRetryCount || 3,
      devices: options.adbDevices || []
    };

    // Configuration de monitoring
    this.monitoring = {
      enabled: options.monitoring !== false,
      interval: options.monitorInterval || 10000, // 10 secondes
      alertThresholds: {
        memory: options.memoryThreshold || 90, // % mémoire émulateur
        cpu: options.cpuThreshold || 80,       // % CPU
        battery: options.batteryThreshold || 20, // % batterie
        storage: options.storageThreshold || 95  // % stockage
      },
      logToFile: options.logToFile || false,
      logDirectory: options.logDirectory || './logs/android-studio'
    };

    // Configuration des performances
    this.performance = {
      enableKVM: options.enableKVM !== false, // Linux
      enableHAXM: options.enableHAXM !== false, // macOS
      gpuAcceleration: options.gpuAcceleration !== false,
      snapshotCompression: options.snapshotCompression || true,
      lowMemoryMode: options.lowMemoryMode || true
    };

    // Configuration avancée
    this.advanced = {
      customEmulatorConfig: options.customEmulatorConfig || {},
      environmentVariables: options.environmentVariables || {},
      startupScripts: options.startupScripts || [],
      cleanupOnExit: options.cleanupOnExit !== false,
      backupEmulators: options.backupEmulators || false,
      restoreEmulators: options.restoreEmulators || false
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
          emulators: {
            ...baseConfig.emulators,
            headless: false,
            noAudio: true,
            lowMemory: true,
            autoStart: true
          },
          whatsapp: {
            ...baseConfig.whatsapp,
            enabled: true,
            autoInstall: true,
            configureDevice: true
          }
        };

      case 'testing':
        return {
          ...baseConfig,
          emulators: {
            ...baseConfig.emulators,
            headless: true,
            noAudio: true,
            lowMemory: true,
            maxConcurrent: 5
          },
          monitoring: {
            ...baseConfig.monitoring,
            enabled: true,
            interval: 5000
          }
        };

      case 'development':
        return {
          ...baseConfig,
          emulators: {
            ...baseConfig.emulators,
            headless: false,
            noAudio: false,
            lowMemory: false,
            maxConcurrent: 2
          },
          monitoring: {
            ...baseConfig.monitoring,
            enabled: true,
            interval: 15000
          }
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

    // Vérifier les chemins
    if (!this.workspace) {
      errors.push('Workspace non défini');
    }

    // Vérifier les configurations d'émulateur
    if (this.emulators.defaultMemory < 512) {
      errors.push('Mémoire émulateur insuffisante (512MB minimum)');
    }

    if (this.emulators.defaultStorage < 1024) {
      errors.push('Stockage émulateur insuffisant (1GB minimum)');
    }

    // Vérifier les seuils de monitoring
    if (this.monitoring.alertThresholds.memory > 100) {
      errors.push('Seuil mémoire monitoring invalide');
    }

    // Vérifier les configurations WhatsApp
    if (this.whatsapp.enabled && !this.whatsapp.apkPath) {
      errors.push('APK WhatsApp requis si WhatsApp activé');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Obtenir la configuration d'émulateur optimisée
   */
  getOptimizedEmulatorConfig(purpose = 'whatsapp') {
    const configs = {
      whatsapp: {
        apiLevel: 29,
        device: 'pixel_4',
        memory: 2048,
        storage: 4096,
        width: 1080,
        height: 1920,
        density: 420,
        noAudio: true,
        noWindow: false,
        noSnapshotLoad: true,
        lowMemory: true
      },
      gaming: {
        apiLevel: 31,
        device: 'pixel_6_pro',
        memory: 4096,
        storage: 8192,
        width: 1440,
        height: 3120,
        density: 560,
        noAudio: false,
        noWindow: false,
        noSnapshotLoad: false,
        lowMemory: false
      },
      testing: {
        apiLevel: 28,
        device: 'pixel_2',
        memory: 1536,
        storage: 2048,
        width: 1080,
        height: 1920,
        density: 420,
        noAudio: true,
        noWindow: true,
        noSnapshotLoad: true,
        lowMemory: true,
        headless: true
      }
    };

    return configs[purpose] || configs.testing;
  }

  /**
   * Obtenir les variables d'environnement recommandées
   */
  getRecommendedEnvironmentVariables() {
    const env = {};

    // Variables Android de base
    if (this.sdk && this.sdk.path) {
      env.ANDROID_HOME = this.sdk.path;
      env.ANDROID_SDK_ROOT = this.sdk.path;
      env.ANDROID_AVD_HOME = path.join(this.workspace, 'avd');
    }

    // Variables d'émulateur
    if (this.emulators) {
      env.ANDROID_EMULATOR_USE_SYSTEM_LIBS = '1';
      if (this.emulators.headless) {
        env.ANDROID_EMULATOR_HEADLESS = '1';
      }
    }

    // Variables de performance
    if (this.performance) {
      if (this.performance.enableKVM) {
        env.ANDROID_EMULATOR_USE_KVM = '1';
      }
      if (this.performance.enableHAXM) {
        env.ANDROID_EMULATOR_USE_HAXM = '1';
      }
    }

    // Variables personnalisées
    Object.assign(env, this.advanced.environmentVariables || {});

    return env;
  }

  /**
   * Obtenir les arguments d'émulateur recommandés
   */
  getRecommendedEmulatorArgs() {
    const args = [
      '-no-boot-anim',
      '-no-snapshot-save',
      '-wipe-data'
    ];

    if (this.emulators.noAudio) {
      args.push('-no-audio');
    }

    if (this.emulators.noWindow) {
      args.push('-no-window');
    }

    if (this.emulators.lowMemory) {
      args.push('-memory 1024');
      args.push('-gpu off');
    }

    if (this.emulators.enableSnapshots) {
      args.push('-snapshot default');
    }

    return args;
  }

  /**
   * Obtenir la configuration pour un pays spécifique
   */
  getCountrySpecificConfig(country) {
    const countryConfigs = {
      'fr': {
        language: 'fr-FR',
        timezone: 'Europe/Paris',
        locale: 'fr'
      },
      'ca': {
        language: 'en-CA',
        timezone: 'America/Toronto',
        locale: 'en_CA'
      },
      'us': {
        language: 'en-US',
        timezone: 'America/New_York',
        locale: 'en_US'
      },
      'uk': {
        language: 'en-GB',
        timezone: 'Europe/London',
        locale: 'en_GB'
      },
      'de': {
        language: 'de-DE',
        timezone: 'Europe/Berlin',
        locale: 'de_DE'
      }
    };

    return countryConfigs[country.toLowerCase()] || countryConfigs['us'];
  }

  /**
   * Obtenir la configuration ADB optimisée
   */
  getOptimizedADBConfig() {
    return {
      timeout: this.adb.timeout,
      retryCount: this.adb.retryCount,
      serverPort: 5037,
      deviceTimeout: 30000,
      shellTimeout: 10000
    };
  }

  /**
   * Obtenir la configuration de monitoring optimisée
   */
  getOptimizedMonitoringConfig() {
    return {
      ...this.monitoring,
      metrics: [
        'cpu',
        'memory',
        'battery',
        'network',
        'storage',
        'processes'
      ],
      alerts: {
        highMemory: this.monitoring.alertThresholds.memory,
        highCPU: this.monitoring.alertThresholds.cpu,
        lowBattery: this.monitoring.alertThresholds.battery,
        lowStorage: this.monitoring.alertThresholds.storage
      }
    };
  }

  /**
   * Obtenir une configuration par défaut optimisée
   */
  static getDefault() {
    return new AndroidStudioConfig({
      debug: false,
      timeout: 120000,
      autoInstallSDK: true,
      acceptLicenses: true,
      updateSDK: false,
      defaultApiLevel: 29,
      defaultDevice: 'pixel_4',
      defaultMemory: 2048,
      defaultStorage: 4096,
      defaultResolution: '1080x1920',
      defaultDensity: 420,
      maxConcurrentEmulators: 3,
      autoStartEmulators: false,
      headlessMode: false,
      noAudio: true,
      lowMemory: true,
      enableSnapshots: false,
      monitoring: true,
      monitorInterval: 10000,
      whatsappEnabled: true,
      autoInstallWhatsApp: true,
      configureDevice: true,
      defaultCountry: 'ca',
      integrateNordVPN: true,
      cleanupOnExit: true
    });
  }

  /**
   * Obtenir une configuration optimisée pour WhatsApp
   */
  static getWhatsAppOptimized() {
    return new AndroidStudioConfig({
      debug: false,
      timeout: 180000,
      autoInstallSDK: true,
      acceptLicenses: true,
      defaultApiLevel: 29,
      defaultDevice: 'pixel_4',
      defaultMemory: 2048,
      defaultStorage: 4096,
      maxConcurrentEmulators: 2,
      headlessMode: false,
      noAudio: true,
      lowMemory: true,
      whatsappEnabled: true,
      whatsappApkPath: './assets/apk/whatsapp.apk',
      autoInstallWhatsApp: true,
      configureDevice: true,
      defaultCountry: 'ca',
      integrateNordVPN: true,
      monitoring: true,
      monitorInterval: 15000,
      enableKVM: true,
      enableHAXM: true,
      gpuAcceleration: false,
      cleanupOnExit: true
    });
  }

  /**
   * Obtenir une configuration pour les tests
   */
  static getTestingOptimized() {
    return new AndroidStudioConfig({
      debug: true,
      timeout: 300000,
      defaultApiLevel: 28,
      defaultDevice: 'pixel_2',
      defaultMemory: 1536,
      defaultStorage: 2048,
      maxConcurrentEmulators: 5,
      headlessMode: true,
      noAudio: true,
      lowMemory: true,
      monitoring: true,
      monitorInterval: 5000,
      whatsappEnabled: false,
      integrateNordVPN: false,
      cleanupOnExit: true
    });
  }
}

// Configuration par défaut exportée
export const defaultConfig = AndroidStudioConfig.getDefault();

// Configuration optimisée WhatsApp exportée
export const whatsappConfig = AndroidStudioConfig.getWhatsAppOptimized();

// Configuration optimisée pour les tests exportée
export const testingConfig = AndroidStudioConfig.getTestingOptimized();
