/**
 * Service d'Intégration Docker + Android Studio + NordVPN + WhatsApp
 * Orchestrateur complet pour l'environnement automatisé
 */

import { execAsync, sleep } from '../whatsapp/helpers.js';
import path from 'path';
import fs from 'fs';

export class DockerIntegrationService {
  constructor() {
    this.isInitialized = false;
    this.containerName = 'kasm-desktop';
    this.androidStudioService = null;
    this.nordVPNService = null;
    this.whatsappWorkflows = new Map();
    this.containerInfo = null;
  }

  /**
   * Initialisation complète du service d'intégration
   */
  async initialize() {
    console.log('🔗 Initialisation du service d\'intégration Docker...');

    try {
      // Vérifier l'état du container
      await this.checkContainerStatus();

      // Initialiser les services internes
      await this.initializeAndroidStudioService();
      await this.initializeNordVPNService();

      // Configurer l'environnement Android dans Docker
      await this.setupDockerAndroidEnvironment();

      this.isInitialized = true;
      console.log('✅ Service d\'intégration Docker initialisé');

      return true;

    } catch (error) {
      console.error('❌ Erreur initialisation Docker integration:', error.message);
      throw error;
    }
  }

  /**
   * Vérifier l'état du container Docker
   */
  async checkContainerStatus() {
    try {
      // Vérifier d'abord si le container existe
      const psOutput = await execAsync('docker ps --filter name=kasm-desktop');
      if (!psOutput || !psOutput.trim()) {
        throw new Error('Aucune sortie de docker ps ou container non trouvé');
      }
      const lines = psOutput.trim().split('\n');

      if (lines.length <= 1) {
        // Container pas en cours d'exécution, vérifier s'il existe
        const psAllOutput = await execAsync('docker ps -a --filter name=kasm-desktop');
        if (!psAllOutput || !psAllOutput.trim()) {
          throw new Error('Container kasm-desktop non trouvé. Démarrez-le avec ./start-sync.sh');
        }
        const allLines = psAllOutput.trim().split('\n');

        if (allLines.length <= 1) {
          throw new Error('Container kasm-desktop non trouvé. Démarrez-le avec ./start-sync.sh');
        } else {
          throw new Error('Container kasm-desktop trouvé mais arrêté. Démarrez-le avec: docker compose up -d');
        }
      }

      // Parser les informations du container
      const headerLine = lines[0];
      const dataLine = lines[1];

      if (!dataLine || !dataLine.includes('kasm-desktop')) {
        throw new Error('Impossible de parser les informations du container');
      }

      // Parser correctement les colonnes avec format Docker
      const parseContainerInfo = async () => {
        const stdout = await execAsync(`docker ps --filter name=kasm-desktop --format "{{.ID}}|{{.Image}}|{{.Command}}|{{.CreatedAt}}|{{.Status}}|{{.Ports}}|{{.Names}}"`);
        const parts = stdout.trim().split('|');
        return {
          id: parts[0],
          image: parts[1],
          command: parts[2],
          created: parts[3],
          status: parts[4],
          ports: parts[5],
          name: parts[6]
        };
      };

      this.containerInfo = await parseContainerInfo();

      console.log('✅ Container Docker trouvé:', this.containerInfo.name);
      console.log('   📦 Status:', this.containerInfo.status);
      console.log('   🖼️ Image:', this.containerInfo.image);
      console.log('   🔗 Ports:', this.containerInfo.ports);

      return this.containerInfo;

    } catch (error) {
      console.error('❌ Erreur vérification container:', error.message);
      throw error;
    }
  }

  /**
   * Initialiser le service Android Studio
   */
  async initializeAndroidStudioService() {
    try {
      const { AndroidStudioService } = await import('../android-studio/index.js');
      this.androidStudioService = new AndroidStudioService();
      console.log('✅ Service Android Studio chargé');
    } catch (error) {
      console.log('⚠️ Service Android Studio non disponible:', error.message);
    }
  }

  /**
   * Initialiser le service NordVPN
   */
  async initializeNordVPNService() {
    try {
      const { nordVPNService } = await import('../nordvpn/index.js');
      this.nordVPNService = nordVPNService;
      console.log('✅ Service NordVPN chargé');
    } catch (error) {
      console.log('⚠️ Service NordVPN non disponible:', error.message);
    }
  }

  /**
   * Configurer l'environnement Android dans Docker
   */
  async setupDockerAndroidEnvironment() {
    console.log('🔧 Configuration de l\'environnement Android dans Docker...');

    try {
      // Vérifier si Android Studio est installé dans le container
      const isAndroidInstalled = await this.checkDockerAndroidInstallation();

      if (!isAndroidInstalled) {
        console.log('📦 Installation d\'Android Studio dans le container...');
        await this.installAndroidStudioInDocker();
      }

      // Configurer les variables d'environnement
      await this.configureDockerEnvironment();

      // Vérifier les outils Android
      await this.verifyDockerAndroidTools();

      console.log('✅ Environnement Android configuré dans Docker');

    } catch (error) {
      console.error('❌ Erreur configuration Android Docker:', error.message);
      throw error;
    }
  }

  /**
   * Vérifier l'installation d'Android Studio dans Docker
   */
  async checkDockerAndroidInstallation() {
    try {
      const { stdout } = await execAsync(`docker exec ${this.containerName} which android 2>/dev/null || echo "not found"`);
      const hasAndroid = !stdout.includes('not found');

      const { stdout: sdkOutput } = await execAsync(`docker exec ${this.containerName} ls -la /opt/android-sdk 2>/dev/null || echo "not found"`);
      const hasSDK = !sdkOutput.includes('not found');

      return hasAndroid || hasSDK;
    } catch (error) {
      return false;
    }
  }

  /**
   * Installer Android Studio dans Docker
   */
  async installAndroidStudioInDocker() {
    const installScript = `
#!/bin/bash
set -e

echo "📦 Installation Android Studio dans Docker..."

# Mettre à jour les packages
apt update && apt upgrade -y

# Installer les dépendances
apt install -y wget unzip openjdk-11-jdk qemu-kvm libvirt-daemon-system bridge-utils

# Télécharger Android Studio
echo "📥 Téléchargement Android Studio..."
wget -q https://dl.google.com/dl/android/studio/ide-zips/2023.1.1.28/android-studio-2023.1.1.28-linux.tar.gz -O /tmp/android-studio.tar.gz

# Extraire Android Studio
echo "📦 Extraction Android Studio..."
tar -xzf /tmp/android-studio.tar.gz -C /opt/
mv /opt/android-studio /opt/android-studio-latest

# Télécharger Android SDK Command Line Tools
echo "📥 Téléchargement Android SDK..."
wget -q https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip -O /tmp/cmdline-tools.zip

# Créer la structure SDK
mkdir -p /opt/android-sdk/cmdline-tools
unzip -q /tmp/cmdline-tools.zip -d /opt/android-sdk/cmdline-tools/
mv /opt/android-sdk/cmdline-tools/cmdline-tools /opt/android-sdk/cmdline-tools/latest

# Configurer les variables d'environnement
echo 'export ANDROID_HOME=/opt/android-sdk' >> ~/.bashrc
echo 'export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools' >> ~/.bashrc

# Variables d'environnement pour la session actuelle
export ANDROID_HOME=/opt/android-sdk
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools

# Accepter les licences
echo "📝 Configuration SDK..."
yes | sdkmanager --licenses || true

# Installer les composants de base
echo "🔧 Installation composants SDK..."
sdkmanager "platform-tools" "emulator" "platforms;android-29" "build-tools;33.0.2" "system-images;android-29;google_apis;x86_64"

# Créer un AVD par défaut
echo "📱 Création AVD par défaut..."
echo "no" | avdmanager create avd -n "docker-default" -k "system-images;android-29;google_apis;x86_64" || true

# Nettoyer
rm -f /tmp/android-studio.tar.gz /tmp/cmdline-tools.zip

echo "✅ Installation Android Studio terminée!"
`;

    const dockerCommand = `docker exec -u 0 ${this.containerName} bash -c '${installScript}'`;

    try {
      console.log('🔄 Exécution de l\'installation Android Studio...');
      const { stdout, stderr } = await execAsync(dockerCommand);
      console.log('📋 Sortie installation:', stdout);
      if (stderr) console.log('⚠️ Erreurs installation:', stderr);

      // Attendre que l'installation soit complète
      await sleep(5000);

      console.log('✅ Android Studio installé dans Docker');
    } catch (error) {
      console.error('❌ Erreur installation Android Studio:', error.message);
      throw error;
    }
  }

  /**
   * Configurer les variables d'environnement dans Docker
   */
  async configureDockerEnvironment() {
    const envScript = `
#!/bin/bash
export ANDROID_HOME=/opt/android-sdk
export ANDROID_SDK_ROOT=/opt/android-sdk
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator
export ANDROID_AVD_HOME=/home/kasm-user/.android/avd

# Créer les répertoires nécessaires
mkdir -p /home/kasm-user/.android/avd
mkdir -p /opt/android-sdk

# Permissions pour KVM
usermod -aG kvm kasm-user 2>/dev/null || true

echo "✅ Variables d'environnement configurées"
`;

    try {
      await execAsync(`docker exec ${this.containerName} bash -c '${envScript}'`);
      console.log('✅ Variables d\'environnement Docker configurées');
    } catch (error) {
      console.log('⚠️ Erreur configuration environnement:', error.message);
    }
  }

  /**
   * Vérifier les outils Android dans Docker
   */
  async verifyDockerAndroidTools() {
    const tools = ['adb', 'emulator', 'avdmanager', 'sdkmanager'];
    const results = {};

    for (const tool of tools) {
      try {
        const { stdout } = await execAsync(`docker exec ${this.containerName} which ${tool} 2>/dev/null || echo "not found"`);
        results[tool] = !stdout.includes('not found');
      } catch (error) {
        results[tool] = false;
      }
    }

    console.log('🔧 Vérification outils Android:');
    Object.entries(results).forEach(([tool, available]) => {
      console.log(`   ${available ? '✅' : '❌'} ${tool}`);
    });

    const allAvailable = Object.values(results).every(Boolean);
    if (!allAvailable) {
      console.log('⚠️ Certains outils Android ne sont pas disponibles');
    }

    return results;
  }

  /**
   * Créer un workflow WhatsApp complet dans Docker
   */
  async createDockerWhatsAppWorkflow(options = {}) {
    const {
      emulatorName = `docker-whatsapp-${Date.now()}`,
      country = 'ca',
      useNordVPN = true,
      installWhatsApp = true,
      configureDevice = true
    } = options;

    console.log(`🚀 Création workflow WhatsApp Docker: ${emulatorName} (${country})`);

    try {
      // Démarrer Android Studio service dans Docker
      await this.startDockerAndroidStudioService();

      // Configurer NordVPN si demandé
      if (useNordVPN && this.nordVPNService) {
        await this.configureDockerNordVPN(country);
      }

      // Créer l'émulateur dans Docker
      const emulator = await this.createDockerEmulator({
        name: emulatorName,
        apiLevel: 29,
        memory: 2048,
        storage: 4096,
        width: 1080,
        height: 1920
      });

      // Démarrer l'émulateur
      await this.startDockerEmulator(emulator.id);

      // Attendre que l'émulateur soit prêt
      await this.waitForDockerEmulator(emulator.id);

      // Installer WhatsApp si demandé
      if (installWhatsApp) {
        await this.installWhatsAppInDocker(emulator.id);
      }

      // Configurer le device
      if (configureDevice) {
        await this.configureDockerDevice(emulator.id, country);
      }

      const workflow = {
        id: emulator.id,
        name: emulatorName,
        emulator,
        country,
        useNordVPN,
        installWhatsApp,
        configureDevice,
        status: 'ready',
        createdAt: new Date(),
        container: this.containerName
      };

      this.whatsappWorkflows.set(emulator.id, workflow);

      console.log(`✅ Workflow WhatsApp Docker créé: ${emulatorName}`);
      this.emit('workflow:created', workflow);

      return workflow;

    } catch (error) {
      console.error('❌ Erreur création workflow Docker:', error.message);
      throw error;
    }
  }

  /**
   * Démarrer le service Android Studio dans Docker
   */
  async startDockerAndroidStudioService() {
    if (!this.androidStudioService) {
      throw new Error('Service Android Studio non disponible');
    }

    // Démarrer le service avec configuration Docker
    await this.androidStudioService.initialize();
    console.log('✅ Service Android Studio démarré dans Docker');
  }

  /**
   * Configurer NordVPN dans Docker
   */
  async configureDockerNordVPN(country) {
    try {
      // Vérifier si NordVPN est installé dans le container
      const { stdout } = await execAsync(`docker exec ${this.containerName} which nordvpn 2>/dev/null || echo "not found"`);

      if (stdout.includes('not found')) {
        console.log('⚠️ NordVPN non installé dans le container');
        return false;
      }

      // Configurer et connecter NordVPN
      const vpnScript = `
#!/bin/bash
# Démarrer NordVPN service
sudo systemctl start nordvpn 2>/dev/null || sudo /etc/init.d/nordvpn start 2>/dev/null || echo "Service NordVPN non disponible"

# Attendre que le service soit prêt
sleep 3

# Se connecter au pays demandé
nordvpn connect ${country}

# Vérifier la connexion
sleep 2
nordvpn status
`;

      await execAsync(`docker exec -u 0 ${this.containerName} bash -c '${vpnScript}'`);

      console.log(`✅ NordVPN configuré pour ${country} dans Docker`);
      return true;

    } catch (error) {
      console.log('⚠️ Erreur configuration NordVPN Docker:', error.message);
      return false;
    }
  }

  /**
   * Créer un émulateur dans Docker
   */
  async createDockerEmulator(config) {
    const createScript = `
#!/bin/bash
export ANDROID_HOME=/opt/android-sdk
export ANDROID_SDK_ROOT=/opt/android-sdk
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator

# Créer l'AVD
echo "no" | avdmanager create avd -n "${config.name}" -k "system-images;android-${config.apiLevel};google_apis;x86_64"

# Configurer l'AVD
AVD_CONFIG="$ANDROID_AVD_HOME/${config.name}.avd/config.ini"

if [ -f "$AVD_CONFIG" ]; then
  # Configuration mémoire
  sed -i "s/hw.ramSize=.*/hw.ramSize=${config.memory}/" "$AVD_CONFIG"
  # Configuration stockage
  sed -i "s/hw.disk.dataPartition.size=.*/hw.disk.dataPartition.size=${config.storage}m/" "$AVD_CONFIG"
  # Configuration résolution
  sed -i "s/hw.lcd.width=.*/hw.lcd.width=${config.width}/" "$AVD_CONFIG"
  sed -i "s/hw.lcd.height=.*/hw.lcd.height=${config.height}/" "$AVD_CONFIG"
  # Optimisations
  echo "hw.gpu.enabled=no" >> "$AVD_CONFIG"
  echo "hw.gpu.mode=off" >> "$AVD_CONFIG"
  echo "snapshot.present=no" >> "$AVD_CONFIG"
  echo "hw.audioInput=no" >> "$AVD_CONFIG"
  echo "hw.audioOutput=no" >> "$AVD_CONFIG"
fi

echo "✅ Émulateur ${config.name} créé"
`;

    const dockerCommand = `docker exec ${this.containerName} bash -c '${createScript}'`;

    try {
      await execAsync(dockerCommand);

      const emulator = {
        id: config.name,
        name: config.name,
        apiLevel: config.apiLevel,
        memory: config.memory,
        storage: config.storage,
        resolution: `${config.width}x${config.height}`,
        status: 'stopped',
        createdAt: new Date()
      };

      console.log(`✅ Émulateur Docker créé: ${config.name}`);
      return emulator;

    } catch (error) {
      console.error('❌ Erreur création émulateur Docker:', error.message);
      throw error;
    }
  }

  /**
   * Démarrer un émulateur dans Docker
   */
  async startDockerEmulator(emulatorId) {
    const startScript = `
#!/bin/bash
export ANDROID_HOME=/opt/android-sdk
export ANDROID_SDK_ROOT=/opt/android-sdk
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator

# Démarrer l'émulateur en arrière-plan
emulator -avd ${emulatorId} \\
  -no-window \\
  -no-audio \\
  -memory 1024 \\
  -gpu off \\
  -camera-back none \\
  -camera-front none \\
  -qemu -enable-kvm 2>/dev/null || true &

echo "✅ Émulateur ${emulatorId} démarré"
`;

    const dockerCommand = `docker exec -d ${this.containerName} bash -c '${startScript}'`;

    try {
      await execAsync(dockerCommand);

      // Attendre que l'émulateur démarre
      await sleep(5000);

      console.log(`✅ Émulateur Docker démarré: ${emulatorId}`);
      return true;

    } catch (error) {
      console.error('❌ Erreur démarrage émulateur Docker:', error.message);
      throw error;
    }
  }

  /**
   * Attendre qu'un émulateur soit prêt dans Docker
   */
  async waitForDockerEmulator(emulatorId, timeout = 120000) {
    const startTime = Date.now();

    console.log(`⏳ Attente de l'émulateur Docker: ${emulatorId}`);

    while (Date.now() - startTime < timeout) {
      try {
        const { stdout } = await execAsync(`docker exec ${this.containerName} adb devices`);
        if (stdout.includes(emulatorId) && stdout.includes('device')) {
          console.log(`✅ Émulateur Docker prêt: ${emulatorId}`);
          return true;
        }
      } catch (error) {
        // Émulateur pas encore prêt
      }

      await sleep(2000);
    }

    throw new Error(`Timeout: Émulateur Docker ${emulatorId} pas prêt après ${timeout}ms`);
  }

  /**
   * Installer WhatsApp dans Docker
   */
  async installWhatsAppInDocker(deviceId) {
    try {
      console.log(`📦 Installation WhatsApp sur ${deviceId} (Docker)`);

      // Copier l'APK dans le container
      const apkPath = path.join(process.cwd(), 'assets/apk/whatsapp.apk');
      if (fs.existsSync(apkPath)) {
        await execAsync(`docker cp "${apkPath}" ${this.containerName}:/tmp/whatsapp.apk`);
      } else {
        console.log('⚠️ APK WhatsApp non trouvé, téléchargement...');
        // Télécharger WhatsApp APK
        const downloadScript = `
wget -q https://www.apkmirror.com/wp-content/uploads/2023/12/WhatsApp_v2.24.11.15.apk -O /tmp/whatsapp.apk || echo "Download failed"
`;
        await execAsync(`docker exec ${this.containerName} bash -c '${downloadScript}'`);
      }

      // Installer l'APK
      const installScript = `
adb -s ${deviceId} install -r /tmp/whatsapp.apk
`;
      await execAsync(`docker exec ${this.containerName} bash -c '${installScript}'`);

      console.log(`✅ WhatsApp installé sur ${deviceId} (Docker)`);
      return true;

    } catch (error) {
      console.error('❌ Erreur installation WhatsApp Docker:', error.message);
      return false;
    }
  }

  /**
   * Configurer un device dans Docker
   */
  async configureDockerDevice(deviceId, country) {
    try {
      console.log(`⚙️ Configuration device Docker ${deviceId} pour ${country}`);

      const countryConfig = this.getCountryConfig(country);
      const configScript = `
# Désactiver les animations
adb -s ${deviceId} shell settings put global window_animation_scale 0
adb -s ${deviceId} shell settings put global transition_animation_scale 0
adb -s ${deviceId} shell settings put global animator_duration_scale 0

# Configurer la langue et timezone
adb -s ${deviceId} shell setprop persist.sys.locale ${countryConfig.language}
adb -s ${deviceId} shell setprop persist.sys.timezone ${countryConfig.timezone}

# Autoriser les permissions WhatsApp
adb -s ${deviceId} shell pm grant com.whatsapp android.permission.READ_EXTERNAL_STORAGE
adb -s ${deviceId} shell pm grant com.whatsapp android.permission.WRITE_EXTERNAL_STORAGE
adb -s ${deviceId} shell pm grant com.whatsapp android.permission.CAMERA
adb -s ${deviceId} shell pm grant com.whatsapp android.permission.READ_CONTACTS
adb -s ${deviceId} shell pm grant com.whatsapp android.permission.WRITE_CONTACTS
`;

      await execAsync(`docker exec ${this.containerName} bash -c '${configScript}'`);

      console.log(`✅ Device Docker ${deviceId} configuré pour ${country}`);
      return true;

    } catch (error) {
      console.error('❌ Erreur configuration device Docker:', error.message);
      return false;
    }
  }

  /**
   * Obtenir la configuration par pays
   */
  getCountryConfig(country) {
    const configs = {
      'fr': { language: 'fr-FR', timezone: 'Europe/Paris' },
      'ca': { language: 'en-CA', timezone: 'America/Toronto' },
      'us': { language: 'en-US', timezone: 'America/New_York' },
      'uk': { language: 'en-GB', timezone: 'Europe/London' },
      'de': { language: 'de-DE', timezone: 'Europe/Berlin' }
    };
    return configs[country.toLowerCase()] || configs['us'];
  }

  /**
   * Obtenir les statistiques de l'environnement Docker
   */
  async getDockerStats() {
    try {
      const stats = {
        container: this.containerInfo,
        workflows: {
          total: this.whatsappWorkflows.size,
          active: Array.from(this.whatsappWorkflows.values()).filter(w => w.status === 'ready').length
        },
        services: {
          androidStudio: !!this.androidStudioService,
          nordVPN: !!this.nordVPNService
        },
        android: await this.getDockerAndroidStats()
      };

      return stats;
    } catch (error) {
      console.error('❌ Erreur récupération stats Docker:', error.message);
      return null;
    }
  }

  /**
   * Obtenir les statistiques Android dans Docker
   */
  async getDockerAndroidStats() {
    try {
      const statsScript = `
export ANDROID_HOME=/opt/android-sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools

echo "=== DEVICES ==="
adb devices

echo "=== AVD LIST ==="
avdmanager list avd 2>/dev/null || echo "No AVDs found"

echo "=== STORAGE ==="
df -h /opt/android-sdk 2>/dev/null || echo "SDK not found"
`;

      const { stdout } = await execAsync(`docker exec ${this.containerName} bash -c '${statsScript}'`);
      return this.parseAndroidStats(stdout);

    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Parser les statistiques Android
   */
  parseAndroidStats(output) {
    const stats = {
      devices: [],
      avds: [],
      storage: null
    };

    const sections = output.split('===');
    let currentSection = '';

    for (const section of sections) {
      if (section.includes('DEVICES')) {
        currentSection = 'devices';
      } else if (section.includes('AVD LIST')) {
        currentSection = 'avds';
      } else if (section.includes('STORAGE')) {
        currentSection = 'storage';
      } else if (currentSection === 'devices') {
        const lines = section.trim().split('\n').slice(1);
        stats.devices = lines.filter(line => line.includes('device') && !line.includes('List'));
      } else if (currentSection === 'avds') {
        const lines = section.trim().split('\n');
        stats.avds = lines.filter(line => line.includes('Name:'));
      } else if (currentSection === 'storage') {
        const lines = section.trim().split('\n');
        stats.storage = lines[1] || null;
      }
    }

    return stats;
  }

  /**
   * Nettoyer l'environnement Docker
   */
  async cleanup() {
    console.log('🧹 Nettoyage de l\'environnement Docker...');

    try {
      // Arrêter tous les workflows
      for (const [id, workflow] of this.whatsappWorkflows) {
        try {
          await this.stopDockerEmulator(id);
        } catch (error) {
          console.log(`⚠️ Erreur arrêt émulateur ${id}:`, error.message);
        }
      }

      // Nettoyer les services
      if (this.androidStudioService) {
        await this.androidStudioService.cleanup();
      }

      this.whatsappWorkflows.clear();
      this.isInitialized = false;

      console.log('✅ Environnement Docker nettoyé');
    } catch (error) {
      console.error('❌ Erreur nettoyage Docker:', error.message);
    }
  }

  /**
   * Arrêter un émulateur dans Docker
   */
  async stopDockerEmulator(emulatorId) {
    try {
      const stopScript = `
export ANDROID_HOME=/opt/android-sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools

adb -s ${emulatorId} emu kill 2>/dev/null || true
pkill -f "emulator.*${emulatorId}" 2>/dev/null || true
`;
      await execAsync(`docker exec ${this.containerName} bash -c '${stopScript}'`);

      const workflow = this.whatsappWorkflows.get(emulatorId);
      if (workflow) {
        workflow.status = 'stopped';
        workflow.stoppedAt = new Date();
      }

      console.log(`✅ Émulateur Docker arrêté: ${emulatorId}`);
      return true;

    } catch (error) {
      console.error('❌ Erreur arrêt émulateur Docker:', error.message);
      return false;
    }
  }
}

// Instance singleton
export const dockerIntegrationService = new DockerIntegrationService();
