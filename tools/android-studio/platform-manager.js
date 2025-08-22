/**
 * Gestionnaire de Plateformes Android Studio
 * Détecte et configure Android Studio pour Linux et macOS
 */

import { execAsync } from '../whatsapp/helpers.js';
import path from 'path';
import os from 'os';
import fs from 'fs';

export class AndroidStudioPlatformManager {
  constructor(config) {
    this.config = config;
    this.platform = this.detectCurrentPlatform();
    this.paths = this.getPlatformPaths();
  }

  /**
   * Détecter la plateforme actuelle
   */
  detectCurrentPlatform() {
    const platform = os.platform();
    const arch = os.arch();
    const release = os.release();

    const platformInfo = {
      os: platform,
      arch,
      release,
      isLinux: platform === 'linux',
      isMacOS: platform === 'darwin',
      isWindows: platform === 'win32',
      name: this.getPlatformName(platform)
    };

    return platformInfo;
  }

  /**
   * Obtenir le nom lisible de la plateforme
   */
  getPlatformName(platform) {
    switch (platform) {
      case 'linux': return 'Linux';
      case 'darwin': return 'macOS';
      case 'win32': return 'Windows';
      default: return 'Unknown';
    }
  }

  /**
   * Obtenir les chemins spécifiques à la plateforme
   */
  getPlatformPaths() {
    const homeDir = os.homedir();

    if (this.platform.isLinux) {
      return {
        androidStudio: [
          '/opt/android-studio/bin/studio.sh',
          '/usr/local/android-studio/bin/studio.sh',
          path.join(homeDir, 'android-studio/bin/studio.sh')
        ],
        androidSdk: [
          process.env.ANDROID_HOME,
          process.env.ANDROID_SDK_ROOT,
          path.join(homeDir, 'Android/Sdk'),
          '/opt/android-sdk',
          '/usr/local/android-sdk'
        ].filter(Boolean),
        avdHome: process.env.ANDROID_AVD_HOME || path.join(homeDir, '.android/avd'),
        tools: [
          'avdmanager',
          'sdkmanager',
          'emulator',
          'adb'
        ]
      };
    } else if (this.platform.isMacOS) {
      return {
        androidStudio: [
          '/Applications/Android Studio.app/Contents/MacOS/studio',
          path.join(homeDir, 'Applications/Android Studio.app/Contents/MacOS/studio')
        ],
        androidSdk: [
          process.env.ANDROID_HOME,
          process.env.ANDROID_SDK_ROOT,
          path.join(homeDir, 'Library/Android/sdk'),
          '/opt/android-sdk',
          '/usr/local/android-sdk'
        ].filter(Boolean),
        avdHome: process.env.ANDROID_AVD_HOME || path.join(homeDir, 'Library/Android/sdk/avd'),
        tools: [
          'avdmanager',
          'sdkmanager',
          'emulator',
          'adb'
        ]
      };
    } else {
      throw new Error(`Plateforme non supportée: ${this.platform.os}`);
    }
  }

  /**
   * Détecter la plateforme de manière asynchrone
   */
  async detectPlatform() {
    const platformInfo = this.detectCurrentPlatform();

    try {
      // Informations système détaillées
      const { stdout: cpuInfo } = await execAsync('uname -a');
      platformInfo.kernel = cpuInfo.trim();

      // Version de l'OS
      if (platformInfo.isLinux) {
        try {
          const { stdout: osRelease } = await execAsync('cat /etc/os-release');
          const nameMatch = osRelease.match(/^PRETTY_NAME="(.+)"$/m);
          if (nameMatch) {
            platformInfo.distro = nameMatch[1];
          }
        } catch (error) {
          platformInfo.distro = 'Linux (unknown distro)';
        }
      } else if (platformInfo.isMacOS) {
        try {
          const { stdout: macVersion } = await execAsync('sw_vers -productVersion');
          platformInfo.version = macVersion.trim();
        } catch (error) {
          platformInfo.version = 'macOS (unknown version)';
        }
      }

      // Mémoire disponible
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      platformInfo.memory = {
        total: Math.round(totalMem / 1024 / 1024), // MB
        free: Math.round(freeMem / 1024 / 1024),   // MB
        used: Math.round((totalMem - freeMem) / 1024 / 1024)
      };

      // CPU
      platformInfo.cpu = {
        cores: os.cpus().length,
        model: os.cpus()[0]?.model || 'Unknown'
      };

    } catch (error) {
      console.log('⚠️ Impossible d\'obtenir toutes les informations système');
    }

    return platformInfo;
  }

  /**
   * Trouver Android Studio
   */
  async findAndroidStudio() {
    for (const studioPath of this.paths.androidStudio) {
      if (fs.existsSync(studioPath)) {
        console.log(`📍 Android Studio trouvé: ${studioPath}`);
        return studioPath;
      }
    }

    // Recherche automatique
    try {
      if (this.platform.isLinux) {
        const { stdout } = await execAsync('which studio.sh 2>/dev/null || find /opt /usr/local -name "studio.sh" 2>/dev/null | head -1');
        if (stdout.trim()) {
          return stdout.trim();
        }
      } else if (this.platform.isMacOS) {
        const { stdout } = await execAsync('find /Applications -name "studio" 2>/dev/null | head -1');
        if (stdout.trim()) {
          return stdout.trim();
        }
      }
    } catch (error) {
      // Recherche échouée
    }

    return null;
  }

  /**
   * Obtenir la configuration recommandée pour la plateforme
   */
  getRecommendedConfig() {
    const baseConfig = {
      platform: this.platform,
      paths: this.paths
    };

    if (this.platform.isLinux) {
      return {
        ...baseConfig,
        recommended: {
          emulatorMemory: 2048, // 2GB
          emulatorStorage: 4096, // 4GB
          maxConcurrentEmulators: Math.min(3, Math.floor(this.platform.memory.total / 2048)),
          headlessMode: true,
          useKVM: true
        },
        optimizations: [
          'Utiliser KVM pour de meilleures performances',
          'Mode headless recommandé pour les serveurs',
          'Limiter la mémoire GPU',
          'Désactiver l\'audio'
        ]
      };
    } else if (this.platform.isMacOS) {
      return {
        ...baseConfig,
        recommended: {
          emulatorMemory: 1536, // 1.5GB
          emulatorStorage: 3072, // 3GB
          maxConcurrentEmulators: 2,
          headlessMode: false,
          useHAXM: true
        },
        optimizations: [
          'Utiliser HAXM pour l\'accélération',
          'Interface graphique disponible',
          'Optimiser pour les ressources limitées',
          'Surveiller la température'
        ]
      };
    }

    return baseConfig;
  }

  /**
   * Vérifier les prérequis système
   */
  async checkSystemRequirements() {
    const requirements = {
      memory: this.platform.memory.total >= 4096, // 4GB minimum
      cores: this.platform.cpu.cores >= 2,
      storage: await this.checkStorageSpace(),
      virtualization: await this.checkVirtualizationSupport()
    };

    const issues = [];

    if (!requirements.memory) {
      issues.push('Mémoire insuffisante (4GB minimum recommandé)');
    }
    if (!requirements.cores) {
      issues.push('CPU avec au moins 2 cœurs requis');
    }
    if (!requirements.storage) {
      issues.push('Espace disque insuffisant (10GB minimum)');
    }
    if (!requirements.virtualization) {
      issues.push('Support de virtualisation non activé');
    }

    return {
      requirements,
      issues,
      compatible: issues.length === 0
    };
  }

  /**
   * Vérifier l'espace disque
   */
  async checkStorageSpace() {
    try {
      const { stdout } = await execAsync('df -BG / | tail -1 | awk \'{print $4}\'');
      const freeSpaceGB = parseInt(stdout.trim().replace('G', ''));
      return freeSpaceGB >= 10; // 10GB minimum
    } catch (error) {
      return false;
    }
  }

  /**
   * Vérifier le support de virtualisation
   */
  async checkVirtualizationSupport() {
    try {
      if (this.platform.isLinux) {
        const { stdout } = await execAsync('grep -E "vmx|svm" /proc/cpuinfo');
        return stdout.includes('vmx') || stdout.includes('svm');
      } else if (this.platform.isMacOS) {
        const { stdout } = await execAsync('sysctl -n machdep.cpu.features');
        return stdout.includes('VMX');
      }
    } catch (error) {
      return false;
    }
    return false;
  }

  /**
   * Obtenir les instructions d'installation
   */
  getInstallationInstructions() {
    if (this.platform.isLinux) {
      return {
        androidStudio: [
          'Télécharger Android Studio depuis: https://developer.android.com/studio',
          'Extraire dans /opt/android-studio ou ~/android-studio',
          'Ajouter au PATH: export PATH="$PATH:/opt/android-studio/bin"',
          'Installer les dépendances: sudo apt install qemu-kvm libvirt-daemon-system',
          'Ajouter l\'utilisateur au groupe: sudo adduser $USER kvm'
        ],
        androidSdk: [
          'Installer via Android Studio ou séparément',
          'Définir ANDROID_HOME: export ANDROID_HOME=~/Android/Sdk',
          'Ajouter au PATH: export PATH="$PATH:$ANDROID_HOME/tools:$ANDROID_HOME/platform-tools"'
        ]
      };
    } else if (this.platform.isMacOS) {
      return {
        androidStudio: [
          'Télécharger Android Studio depuis: https://developer.android.com/studio',
          'Installer dans /Applications',
          'Ouvrir Android Studio et installer les SDK requis'
        ],
        androidSdk: [
          'SDK installé automatiquement avec Android Studio',
          'Vérifier ANDROID_HOME: ~/Library/Android/sdk'
        ]
      };
    }

    return {};
  }

  /**
   * Obtenir les commandes de diagnostic
   */
  getDiagnosticCommands() {
    if (this.platform.isLinux) {
      return [
        'echo "=== Informations Système ==="',
        'uname -a',
        'cat /etc/os-release',
        'echo "=== Mémoire ==="',
        'free -h',
        'echo "=== CPU ==="',
        'nproc',
        'grep -E "vmx|svm" /proc/cpuinfo',
        'echo "=== Stockage ==="',
        'df -h /',
        'echo "=== Android ==="',
        'which adb || echo "ADB non trouvé"',
        'which emulator || echo "Emulator non trouvé"',
        'echo "ANDROID_HOME: $ANDROID_HOME"'
      ];
    } else if (this.platform.isMacOS) {
      return [
        'echo "=== Informations Système ==="',
        'uname -a',
        'sw_vers',
        'echo "=== Mémoire ==="',
        'vm_stat',
        'echo "=== CPU ==="',
        'sysctl -n hw.ncpu',
        'sysctl -n machdep.cpu.features',
        'echo "=== Stockage ==="',
        'df -h /',
        'echo "=== Android ==="',
        'which adb || echo "ADB non trouvé"',
        'which emulator || echo "Emulator non trouvé"',
        'echo "ANDROID_HOME: $ANDROID_HOME"'
      ];
    }

    return [];
  }

  /**
   * Exécuter un diagnostic complet
   */
  async runDiagnostic() {
    console.log('🔍 Diagnostic Android Studio...\n');

    try {
      const platform = await this.detectPlatform();
      console.log('📱 Plateforme:', platform.name);
      console.log('🖥️ OS:', platform.os);
      console.log('🏗️ Architecture:', platform.arch);

      if (platform.distro) {
        console.log('🐧 Distribution:', platform.distro);
      }

      console.log('💾 Mémoire:', `${platform.memory.total}MB total, ${platform.memory.free}MB libre`);
      console.log('⚡ CPU:', `${platform.cpu.cores} cœurs, ${platform.cpu.model}`);
      console.log('');

      // Vérifier les prérequis
      const systemCheck = await this.checkSystemRequirements();
      console.log('✅ Prérequis système:', systemCheck.compatible ? 'OK' : 'ISSUES');

      if (systemCheck.issues.length > 0) {
        console.log('⚠️ Problèmes détectés:');
        systemCheck.issues.forEach(issue => {
          console.log(`   • ${issue}`);
        });
      }

      console.log('');

      // Vérifier Android Studio
      const studioPath = await this.findAndroidStudio();
      console.log('📝 Android Studio:', studioPath ? '✅ Trouvé' : '❌ Non trouvé');

      if (studioPath) {
        console.log(`   📍 Chemin: ${studioPath}`);
      }

      // Configuration recommandée
      const config = this.getRecommendedConfig();
      console.log('\n⚙️ Configuration recommandée:');
      console.log(`   • Mémoire émulateur: ${config.recommended.emulatorMemory}MB`);
      console.log(`   • Stockage émulateur: ${config.recommended.emulatorStorage}MB`);
      console.log(`   • Émulateurs max: ${config.recommended.maxConcurrentEmulators}`);

      console.log('\n🔧 Optimisations recommandées:');
      config.optimizations.forEach(opt => {
        console.log(`   • ${opt}`);
      });

      return {
        platform,
        systemCheck,
        androidStudio: {
          found: !!studioPath,
          path: studioPath
        },
        recommendedConfig: config
      };

    } catch (error) {
      console.error('❌ Erreur diagnostic:', error.message);
      throw error;
    }
  }
}
