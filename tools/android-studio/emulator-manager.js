/**
 * Gestionnaire d'Émulateurs Android
 * Crée, configure et gère les émulateurs Android optimisés
 */

import { execAsync, sleep } from '../whatsapp/helpers.js';
import path from 'path';
import fs from 'fs';

export class AndroidStudioEmulatorManager {
  constructor(config) {
    this.config = config;
    this.emulators = new Map();
    this.templates = this.getDefaultTemplates();
    this.isInitialized = false;
  }

  /**
   * Initialisation du gestionnaire
   */
  async initialize() {
    console.log('📱 Initialisation du gestionnaire d\'émulateurs...');

    try {
      // Vérifier AVD Manager
      await this.checkAVDManager();

      // Lister les émulateurs existants
      await this.listEmulators();

      this.isInitialized = true;
      console.log('✅ Gestionnaire d\'émulateurs initialisé');
    } catch (error) {
      console.error('❌ Erreur initialisation:', error.message);
      throw error;
    }
  }

  /**
   * Vérifier AVD Manager
   */
  async checkAVDManager() {
    try {
      const { stdout } = await execAsync('avdmanager --version');
      console.log('✅ AVD Manager trouvé');
      return true;
    } catch (error) {
      throw new Error('AVD Manager non trouvé. Installez Android SDK Command Line Tools');
    }
  }

  /**
   * Lister tous les émulateurs disponibles
   */
  async listEmulators() {
    try {
      const { stdout } = await execAsync('emulator -list-avds');
      const avds = stdout.trim().split('\n').filter(name => name.trim());

      console.log(`📋 Émulateurs disponibles: ${avds.length}`);
      avds.forEach((avd, index) => {
        console.log(`   ${index + 1}. ${avd}`);
      });

      return avds;
    } catch (error) {
      console.log('⚠️ Aucun émulateur trouvé ou erreur de listage');
      return [];
    }
  }

  /**
   * Créer un émulateur avec configuration
   */
  async createEmulator(config) {
    const {
      name,
      apiLevel = 29,
      device = 'pixel_4',
      memory = 2048,
      storage = 4096,
      width = 1080,
      height = 1920,
      density = 420,
      noAudio = true,
      noWindow = false,
      noSnapshotLoad = true,
      lowMemory = true,
      headless = false
    } = config;

    console.log(`🔨 Création de l'émulateur: ${name}`);

    try {
      // Construire la commande AVD Manager
      let cmd = `avdmanager create avd -n ${name} -k "system-images;android-${apiLevel};google_apis;x86_64"`;

      if (device !== 'default') {
        cmd += ` -d ${device}`;
      }

      // Exécuter la commande (elle peut demander une confirmation interactive)
      const { stdout } = await execAsync(cmd);

      // Attendre que l'AVD soit créé
      await sleep(2000);

      // Configurer l'émulateur
      await this.configureEmulator(name, {
        memory,
        storage,
        width,
        height,
        density,
        noAudio,
        noWindow,
        noSnapshotLoad,
        lowMemory,
        headless
      });

      const emulator = {
        id: name,
        name,
        apiLevel,
        device,
        memory,
        storage,
        resolution: `${width}x${height}`,
        density,
        status: 'stopped',
        createdAt: new Date(),
        config: config
      };

      this.emulators.set(name, emulator);
      console.log(`✅ Émulateur créé: ${name}`);

      return emulator;

    } catch (error) {
      console.error('❌ Erreur création émulateur:', error.message);
      throw error;
    }
  }

  /**
   * Configurer un émulateur
   */
  async configureEmulator(name, config) {
    const avdPath = path.join(
      process.env.ANDROID_AVD_HOME || path.join(os.homedir(), '.android', 'avd'),
      `${name}.avd`
    );

    const configPath = path.join(avdPath, 'config.ini');

    if (!fs.existsSync(configPath)) {
      console.log(`⚠️ Fichier config non trouvé: ${configPath}`);
      return;
    }

    let configContent = fs.readFileSync(configPath, 'utf8');
    const lines = configContent.split('\n');

    // Configuration mémoire
    if (config.memory) {
      this.updateConfigLine(lines, 'hw.ramSize', `${config.memory}`);
    }

    // Configuration stockage
    if (config.storage) {
      this.updateConfigLine(lines, 'hw.disk.dataPartition.size', `${config.storage}m`);
    }

    // Configuration résolution
    if (config.width && config.height) {
      this.updateConfigLine(lines, 'hw.lcd.width', config.width.toString());
      this.updateConfigLine(lines, 'hw.lcd.height', config.height.toString());
    }

    // Configuration densité
    if (config.density) {
      this.updateConfigLine(lines, 'hw.lcd.density', config.density.toString());
    }

    // Optimisations
    if (config.noAudio) {
      this.updateConfigLine(lines, 'hw.audioInput', 'no');
      this.updateConfigLine(lines, 'hw.audioOutput', 'no');
    }

    if (config.noWindow) {
      this.updateConfigLine(lines, 'hw.lcd.width', '0');
      this.updateConfigLine(lines, 'hw.lcd.height', '0');
    }

    if (config.noSnapshotLoad) {
      this.updateConfigLine(lines, 'snapshot.present', 'no');
    }

    if (config.lowMemory) {
      this.updateConfigLine(lines, 'hw.gpu.enabled', 'no');
      this.updateConfigLine(lines, 'hw.gpu.mode', 'off');
    }

    if (config.headless) {
      this.updateConfigLine(lines, 'hw.headless', 'yes');
    }

    // Écrire la configuration mise à jour
    configContent = lines.join('\n');
    fs.writeFileSync(configPath, configContent);

    console.log(`✅ Configuration appliquée: ${name}`);
  }

  /**
   * Mettre à jour une ligne de configuration
   */
  updateConfigLine(lines, key, value) {
    let found = false;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith(`${key}=`)) {
        lines[i] = `${key}=${value}`;
        found = true;
        break;
      }
    }

    if (!found) {
      lines.push(`${key}=${value}`);
    }
  }

  /**
   * Démarrer un émulateur
   */
  async startEmulator(emulatorId, options = {}) {
    const {
      timeout = 120000,
      noWindow = false,
      noAudio = true,
      noSnapshotLoad = true,
      lowMemory = true
    } = options;

    console.log(`🚀 Démarrage de l'émulateur: ${emulatorId}`);

    try {
      // Construire la commande emulator
      let cmd = `emulator -avd ${emulatorId}`;

      if (noWindow) cmd += ' -no-window';
      if (noAudio) cmd += ' -no-audio';
      if (noSnapshotLoad) cmd += ' -no-snapshot-load';
      if (lowMemory) cmd += ' -memory 1024';

      // Ajouter les options de performance
      cmd += ' -gpu off -camera-back none -camera-front none';
      cmd += ' -qemu -enable-kvm 2>/dev/null || true';

      console.log(`📝 Commande: ${cmd}`);

      // Démarrer en arrière-plan
      const childProcess = await this.spawnEmulator(cmd);

      const emulator = this.emulators.get(emulatorId);
      if (emulator) {
        emulator.status = 'starting';
        emulator.process = childProcess;
        emulator.startedAt = new Date();
      }

      // Attendre que l'émulateur soit prêt
      await this.waitForEmulatorReady(emulatorId, timeout);

      return {
        emulatorId,
        process: childProcess,
        startedAt: new Date()
      };

    } catch (error) {
      console.error('❌ Erreur démarrage émulateur:', error.message);
      throw error;
    }
  }

  /**
   * Spawn l'émulateur en arrière-plan
   */
  async spawnEmulator(cmd) {
    return new Promise((resolve, reject) => {
      const { spawn } = require('child_process');
      const child = spawn(cmd, {
        shell: true,
        detached: true,
        stdio: 'ignore'
      });

      child.on('error', (error) => {
        reject(error);
      });

      // Résoudre immédiatement après le spawn
      setTimeout(() => {
        resolve(child);
      }, 1000);

      // Détacher le processus pour qu'il continue à tourner
      child.unref();
    });
  }

  /**
   * Attendre qu'un émulateur soit prêt
   */
  async waitForEmulatorReady(emulatorId, timeout) {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      try {
        const { stdout } = await execAsync(`adb devices`);
        const lines = stdout.split('\n');

        for (const line of lines) {
          if (line.includes(emulatorId) && line.includes('device')) {
            console.log(`✅ Émulateur prêt: ${emulatorId}`);
            return true;
          }
        }
      } catch (error) {
        // ADB pas encore prêt
      }

      await sleep(2000);
    }

    throw new Error(`Timeout: Émulateur ${emulatorId} pas prêt après ${timeout}ms`);
  }

  /**
   * Arrêter un émulateur
   */
  async stopEmulator(emulatorId) {
    console.log(`⏹️ Arrêt de l'émulateur: ${emulatorId}`);

    try {
      // Méthode 1: ADB emu kill
      try {
        await execAsync(`adb -s ${emulatorId} emu kill`);
        await sleep(3000);
      } catch (error) {
        // Méthode 2: Kill le processus
        try {
          await execAsync(`pkill -f "emulator.*${emulatorId}"`);
          await sleep(2000);
        } catch (error2) {
          console.log(`⚠️ Impossible d'arrêter proprement: ${emulatorId}`);
        }
      }

      const emulator = this.emulators.get(emulatorId);
      if (emulator) {
        emulator.status = 'stopped';
        emulator.stoppedAt = new Date();
      }

      console.log(`✅ Émulateur arrêté: ${emulatorId}`);
      return true;

    } catch (error) {
      console.error('❌ Erreur arrêt émulateur:', error.message);
      return false;
    }
  }

  /**
   * Supprimer un émulateur
   */
  async deleteEmulator(emulatorId) {
    console.log(`🗑️ Suppression de l'émulateur: ${emulatorId}`);

    try {
      // Arrêter d'abord si en cours
      if (this.emulators.get(emulatorId)?.status === 'running') {
        await this.stopEmulator(emulatorId);
      }

      // Supprimer avec AVD Manager
      await execAsync(`avdmanager delete avd -n ${emulatorId}`);

      this.emulators.delete(emulatorId);
      console.log(`✅ Émulateur supprimé: ${emulatorId}`);

      return true;

    } catch (error) {
      console.error('❌ Erreur suppression émulateur:', error.message);
      return false;
    }
  }

  /**
   * Obtenir les templates d'émulateurs par défaut
   */
  getDefaultTemplates() {
    return {
      whatsapp: {
        name: 'whatsapp-optimized',
        apiLevel: 29,
        device: 'pixel_4',
        memory: 2048,
        storage: 4096,
        width: 1080,
        height: 1920,
        density: 420,
        noAudio: true,
        lowMemory: true
      },
      gaming: {
        name: 'gaming-optimized',
        apiLevel: 31,
        device: 'pixel_6_pro',
        memory: 4096,
        storage: 8192,
        width: 1440,
        height: 3120,
        density: 560,
        noAudio: false,
        lowMemory: false
      },
      testing: {
        name: 'testing-minimal',
        apiLevel: 28,
        device: 'pixel_2',
        memory: 1536,
        storage: 2048,
        width: 1080,
        height: 1920,
        density: 420,
        noAudio: true,
        lowMemory: true,
        headless: true
      }
    };
  }

  /**
   * Créer un émulateur depuis un template
   */
  async createFromTemplate(templateName, customName = null) {
    const template = this.templates[templateName];

    if (!template) {
      throw new Error(`Template non trouvé: ${templateName}`);
    }

    const config = {
      ...template,
      name: customName || `${template.name}-${Date.now()}`
    };

    return await this.createEmulator(config);
  }

  /**
   * Obtenir les statistiques des émulateurs
   */
  getStats() {
    const stats = {
      total: this.emulators.size,
      running: 0,
      stopped: 0,
      templates: Object.keys(this.templates).length
    };

    for (const emulator of this.emulators.values()) {
      if (emulator.status === 'running') {
        stats.running++;
      } else {
        stats.stopped++;
      }
    }

    return stats;
  }

  /**
   * Lister les émulateurs actifs
   */
  getActiveEmulators() {
    return Array.from(this.emulators.values()).filter(emu => emu.status === 'running');
  }

  /**
   * Nettoyer tous les émulateurs
   */
  async cleanup() {
    console.log('🧹 Nettoyage des émulateurs...');

    const promises = [];
    for (const [id, emulator] of this.emulators) {
      if (emulator.status === 'running') {
        promises.push(this.stopEmulator(id));
      }
    }

    await Promise.allSettled(promises);
    this.emulators.clear();

    console.log('✅ Émulateurs nettoyés');
  }
}
