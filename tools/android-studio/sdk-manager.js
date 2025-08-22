/**
 * Gestionnaire de SDK Android
 * Gère l'installation et la configuration du SDK Android
 */

import { execAsync, sleep } from '../whatsapp/helpers.js';
import path from 'path';
import fs from 'fs';

export class AndroidStudioSDKManager {
  constructor(config) {
    this.config = config;
    this.sdkPath = null;
    this.sdkVersion = null;
    this.isInitialized = false;
  }

  /**
   * Initialisation du gestionnaire SDK
   */
  async initialize() {
    console.log('🔧 Initialisation du gestionnaire SDK...');

    try {
      this.sdkPath = await this.findSDK();
      if (this.sdkPath) {
        this.sdkVersion = await this.getSDKVersion();
        console.log(`✅ SDK Android trouvé: ${this.sdkPath}`);
        console.log(`📦 Version: ${this.sdkVersion || 'inconnue'}`);
      } else {
        throw new Error('SDK Android non trouvé');
      }

      this.isInitialized = true;
      console.log('✅ Gestionnaire SDK initialisé');
    } catch (error) {
      console.error('❌ Erreur initialisation SDK:', error.message);
      throw error;
    }
  }

  /**
   * Trouver le SDK Android
   */
  async findSDK() {
    // Chemins possibles selon la plateforme
    const possiblePaths = this.getSDKSearchPaths();

    // Vérifier les chemins existants
    for (const sdkPath of possiblePaths) {
      if (await this.isValidSDKPath(sdkPath)) {
        return sdkPath;
      }
    }

    // Recherche automatique
    return await this.searchSDKAutomatically();
  }

  /**
   * Obtenir les chemins de recherche du SDK
   */
  getSDKSearchPaths() {
    const homeDir = require('os').homedir();
    const paths = [];

    // Variables d'environnement
    if (process.env.ANDROID_HOME) paths.push(process.env.ANDROID_HOME);
    if (process.env.ANDROID_SDK_ROOT) paths.push(process.env.ANDROID_SDK_ROOT);

    // Chemins par défaut selon la plateforme
    const platform = require('os').platform();
    if (platform === 'linux') {
      paths.push(
        path.join(homeDir, 'Android', 'Sdk'),
        path.join(homeDir, 'android-sdk'),
        '/opt/android-sdk',
        '/usr/local/android-sdk'
      );
    } else if (platform === 'darwin') {
      paths.push(
        path.join(homeDir, 'Library', 'Android', 'sdk'),
        path.join(homeDir, 'android-sdk'),
        '/opt/android-sdk',
        '/usr/local/android-sdk'
      );
    }

    return [...new Set(paths)]; // Éliminer les doublons
  }

  /**
   * Vérifier si un chemin est un SDK Android valide
   */
  async isValidSDKPath(sdkPath) {
    if (!sdkPath || !fs.existsSync(sdkPath)) {
      return false;
    }

    // Vérifier les dossiers essentiels
    const essentialDirs = [
      'platform-tools',
      'tools',
      'build-tools'
    ];

    for (const dir of essentialDirs) {
      const fullPath = path.join(sdkPath, dir);
      if (!fs.existsSync(fullPath)) {
        return false;
      }
    }

    // Vérifier adb
    const adbPath = path.join(sdkPath, 'platform-tools', 'adb');
    const adbExists = fs.existsSync(adbPath) || fs.existsSync(adbPath + '.exe');

    return adbExists;
  }

  /**
   * Rechercher le SDK automatiquement
   */
  async searchSDKAutomatically() {
    try {
      // Essayer de trouver via 'which'
      const { stdout: whichOutput } = await execAsync('which adb 2>/dev/null');
      if (whichOutput.trim()) {
        const adbPath = whichOutput.trim();
        const sdkPath = path.dirname(path.dirname(adbPath));
        if (await this.isValidSDKPath(sdkPath)) {
          return sdkPath;
        }
      }

      // Recherche dans les répertoires communs
      const platform = require('os').platform();
      if (platform === 'linux') {
        const { stdout } = await execAsync('find /home /opt /usr/local -name "platform-tools" -type d 2>/dev/null | head -1');
        if (stdout.trim()) {
          const potentialSDK = path.dirname(stdout.trim());
          if (await this.isValidSDKPath(potentialSDK)) {
            return potentialSDK;
          }
        }
      }
    } catch (error) {
      // Recherche échouée
    }

    return null;
  }

  /**
   * Obtenir la version du SDK
   */
  async getSDKVersion() {
    try {
      const sourceProperties = path.join(this.sdkPath, 'source.properties');
      if (fs.existsSync(sourceProperties)) {
        const content = fs.readFileSync(sourceProperties, 'utf8');
        const versionMatch = content.match(/Pkg\.Revision=(\d+\.\d+\.\d+)/);
        if (versionMatch) {
          return versionMatch[1];
        }
      }

      // Fallback: version d'ADB
      const { stdout } = await execAsync('adb version');
      const adbVersionMatch = stdout.match(/version ([\d\.]+)/);
      if (adbVersionMatch) {
        return `ADB ${adbVersionMatch[1]}`;
      }
    } catch (error) {
      // Version inconnue
    }

    return null;
  }

  /**
   * Installer les composants SDK requis
   */
  async installRequiredComponents() {
    console.log('📦 Installation des composants SDK requis...');

    const requiredComponents = [
      'platform-tools',           // ADB
      'build-tools;33.0.2',       // Build tools
      'platforms;android-29',     // Android 10
      'platforms;android-31',     // Android 12
      'system-images;android-29;google_apis;x86_64', // Émulateur
      'emulator'                  // Émulateur
    ];

    for (const component of requiredComponents) {
      try {
        console.log(`📥 Installation: ${component}`);
        await execAsync(`sdkmanager "${component}"`);
        console.log(`✅ Installé: ${component}`);
      } catch (error) {
        console.log(`⚠️ Échec installation ${component}:`, error.message);
      }
    }

    console.log('✅ Installation des composants terminée');
  }

  /**
   * Mettre à jour le SDK
   */
  async updateSDK() {
    console.log('🔄 Mise à jour du SDK Android...');

    try {
      await execAsync('sdkmanager --update');
      console.log('✅ SDK mis à jour');
    } catch (error) {
      console.error('❌ Erreur mise à jour SDK:', error.message);
      throw error;
    }
  }

  /**
   * Accepter les licences Android
   */
  async acceptLicenses() {
    console.log('📝 Acceptation des licences Android...');

    try {
      await execAsync('yes | sdkmanager --licenses');
      console.log('✅ Licences acceptées');
    } catch (error) {
      console.error('❌ Erreur acceptation licences:', error.message);
      throw error;
    }
  }

  /**
   * Obtenir la liste des packages disponibles
   */
  async listAvailablePackages() {
    try {
      const { stdout } = await execAsync('sdkmanager --list');
      return this.parsePackageList(stdout);
    } catch (error) {
      console.error('❌ Erreur listage packages:', error.message);
      return [];
    }
  }

  /**
   * Parser la liste des packages
   */
  parsePackageList(output) {
    const packages = [];
    const lines = output.split('\n');
    let inPackagesSection = false;

    for (const line of lines) {
      if (line.includes('Available Packages:')) {
        inPackagesSection = true;
        continue;
      }

      if (inPackagesSection && line.trim() && !line.startsWith(' ')) {
        const packageMatch = line.match(/^([^\s]+)/);
        if (packageMatch) {
          packages.push(packageMatch[1]);
        }
      }
    }

    return packages;
  }

  /**
   * Vérifier si un package est installé
   */
  async isPackageInstalled(packageName) {
    try {
      const { stdout } = await execAsync('sdkmanager --list --installed');
      return stdout.includes(packageName);
    } catch (error) {
      return false;
    }
  }

  /**
   * Installer un package spécifique
   */
  async installPackage(packageName, options = {}) {
    const { force = false, acceptLicenses = true } = options;

    console.log(`📦 Installation du package: ${packageName}`);

    try {
      let cmd = `sdkmanager "${packageName}"`;
      if (force) cmd += ' --force';
      if (acceptLicenses) cmd += ' --accept-licenses';

      await execAsync(cmd);
      console.log(`✅ Package installé: ${packageName}`);

      return true;
    } catch (error) {
      console.error(`❌ Erreur installation ${packageName}:`, error.message);
      return false;
    }
  }

  /**
   * Obtenir les informations système
   */
  getSystemInfo() {
    return {
      sdkPath: this.sdkPath,
      sdkVersion: this.sdkVersion,
      isInitialized: this.isInitialized,
      platform: require('os').platform(),
      arch: require('os').arch()
    };
  }

  /**
   * Obtenir l'espace disque utilisé par le SDK
   */
  async getSDKSize() {
    if (!this.sdkPath) return 0;

    try {
      const { stdout } = await execAsync(`du -sb "${this.sdkPath}"`);
      return parseInt(stdout.split('\t')[0]);
    } catch (error) {
      return 0;
    }
  }

  /**
   * Nettoyer le cache du SDK
   */
  async cleanCache() {
    console.log('🧹 Nettoyage du cache SDK...');

    try {
      const cacheDirs = [
        path.join(this.sdkPath, '.temp'),
        path.join(this.sdkPath, '.cache'),
        path.join(this.sdkPath, 'temp')
      ];

      for (const cacheDir of cacheDirs) {
        if (fs.existsSync(cacheDir)) {
          await execAsync(`rm -rf "${cacheDir}"`);
          console.log(`✅ Cache nettoyé: ${cacheDir}`);
        }
      }

      console.log('✅ Cache SDK nettoyé');
    } catch (error) {
      console.error('❌ Erreur nettoyage cache:', error.message);
    }
  }

  /**
   * Obtenir les variables d'environnement recommandées
   */
  getRecommendedEnvironmentVariables() {
    const env = {};

    if (this.sdkPath) {
      env.ANDROID_HOME = this.sdkPath;
      env.ANDROID_SDK_ROOT = this.sdkPath;
      env.PATH = `${this.sdkPath}/platform-tools:${this.sdkPath}/tools:${this.sdkPath}/tools/bin:${process.env.PATH || ''}`;
    }

    return env;
  }

  /**
   * Générer les variables d'environnement pour le shell
   */
  getShellEnvironmentVariables() {
    const env = this.getRecommendedEnvironmentVariables();

    const exports = [];
    for (const [key, value] of Object.entries(env)) {
      exports.push(`export ${key}="${value}"`);
    }

    return exports;
  }

  /**
   * Vérifier la santé du SDK
   */
  async checkHealth() {
    const health = {
      sdkPath: this.sdkPath,
      tools: {},
      issues: []
    };

    // Vérifier les outils essentiels
    const essentialTools = [
      'adb',
      'emulator',
      'avdmanager',
      'sdkmanager'
    ];

    for (const tool of essentialTools) {
      try {
        const { stdout } = await execAsync(`${tool} --version`);
        health.tools[tool] = { available: true, version: stdout.trim().split('\n')[0] };
      } catch (error) {
        health.tools[tool] = { available: false, error: error.message };
        health.issues.push(`Outil manquant: ${tool}`);
      }
    }

    // Vérifier l'espace disque
    const size = await this.getSDKSize();
    health.size = size;
    if (size > 10 * 1024 * 1024 * 1024) { // 10GB
      health.issues.push('SDK très volumineux (>10GB)');
    }

    health.healthy = health.issues.length === 0;
    return health;
  }
}
