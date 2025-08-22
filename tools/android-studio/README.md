# 🤖 Service Android Studio - Architecture Modulaire

Un service Android Studio complet pour Linux et macOS, optimisé pour l'automatisation WhatsApp avec intégration NordVPN.

## ✨ Fonctionnalités

- 🖥️ **Support multi-plateforme** - Linux et macOS
- 📱 **Gestion d'émulateurs** - Création, configuration, monitoring
- 🔧 **Gestion SDK** - Installation et configuration automatique
- 📊 **Monitoring temps réel** - Performance et alertes
- 📱 **Intégration WhatsApp** - Workflow complet automatisé
- 🌍 **Intégration NordVPN** - Rotation d'IP automatique
- ⚙️ **Configuration flexible** - Adaptable à tous les besoins
- 🎯 **Vision long terme** - Architecture extensible

## 📦 Architecture Modulaire

```
Android Studio Service
├── android-studio-service.js    # Service principal orchestrateur
├── emulator-manager.js          # Gestion des émulateurs
├── sdk-manager.js              # Gestion du SDK Android
├── platform-manager.js         # Détection et configuration plateforme
├── monitor.js                  # Monitoring temps réel
├── config.js                   # Configuration centralisée
├── index.js                    # Interface unifiée
└── example-whatsapp-nordvpn.js # Exemple complet
```

## 🚀 Installation & Prérequis

### 1. Android Studio
```bash
# Télécharger depuis: https://developer.android.com/studio

# Linux
sudo snap install android-studio --classic
# ou
wget https://dl.google.com/dl/android/studio/ide-zips/2023.1.1.28/android-studio-2023.1.1.28-linux.tar.gz
sudo tar -xzf android-studio-*-linux.tar.gz -C /opt/

# macOS
# Télécharger .dmg depuis le site officiel
```

### 2. Android SDK
```bash
# Le SDK sera installé automatiquement par le service
# Ou manuellement:
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/tools:$ANDROID_HOME/platform-tools
```

### 3. Dépendances système

#### Linux
```bash
sudo apt update
sudo apt install -y qemu-kvm libvirt-daemon-system bridge-utils cpu-checker
sudo adduser $USER kvm
sudo apt install -y openjdk-11-jdk
```

#### macOS
```bash
# HAXM sera installé automatiquement par Android Studio
# Ou via Homebrew:
brew install --cask android-studio
```

## ⚡ Utilisation Rapide

### Démarrage Simple (3 lignes)
```javascript
import { AndroidStudioService } from './tools/android-studio/index.js';

const service = new AndroidStudioService();
await service.initialize();
await service.createOptimizedEmulator({ name: 'whatsapp-ca' });
```

### Workflow WhatsApp Complet
```javascript
import { AndroidStudioService } from './tools/android-studio/index.js';

const service = new AndroidStudioService();
await service.initialize();

const workflow = await service.createWhatsAppWorkflow({
  emulatorName: 'whatsapp-vpn-ca',
  country: 'ca',
  useNordVPN: true,
  installWhatsApp: true,
  configureDevice: true
});
```

### Avec Intégration NordVPN
```javascript
import { AndroidStudioService } from './tools/android-studio/index.js';
import { nordVPNService } from '../nordvpn/index.js';

const androidService = new AndroidStudioService();
const vpnService = nordVPNService;

await androidService.initialize();
await vpnService.initialize();

const workflow = await androidService.createWhatsAppWorkflow({
  emulatorName: 'whatsapp-nordvpn-ca',
  country: 'ca',
  useNordVPN: true
});
```

## 🏗️ Services Principaux

### 1. Service Principal (`AndroidStudioService`)
- ✅ **Orchestrateur complet** de tous les modules
- ✅ **Gestion du cycle de vie** (init/cleanup)
- ✅ **Interface unifiée** pour toutes les opérations
- ✅ **Workflow WhatsApp intégré**

### 2. Gestionnaire d'Émulateurs (`AndroidStudioEmulatorManager`)
- ✅ **Création d'émulateurs optimisés** pour WhatsApp
- ✅ **Configuration automatique** (mémoire, résolution, API)
- ✅ **Gestion du cycle de vie** (start/stop/delete)
- ✅ **Templates prédéfinis** (WhatsApp, Gaming, Testing)

### 3. Gestionnaire de SDK (`AndroidStudioSDKManager`)
- ✅ **Détection automatique** du SDK Android
- ✅ **Installation des composants** requis
- ✅ **Validation des outils** (ADB, emulator, etc.)
- ✅ **Gestion des licences** Android

### 4. Gestionnaire de Plateforme (`AndroidStudioPlatformManager`)
- ✅ **Détection automatique** Linux/macOS
- ✅ **Configuration optimisée** par plateforme
- ✅ **Variables d'environnement** recommandées
- ✅ **Instructions d'installation** spécifiques

### 5. Service de Monitoring (`AndroidStudioMonitor`)
- ✅ **Surveillance temps réel** CPU/mémoire/disque
- ✅ **Monitoring des émulateurs** individuels
- ✅ **Alertes automatiques** (seuils configurables)
- ✅ **Rapports de santé** détaillés

## ⚙️ Configuration

### Configuration WhatsApp Optimisée
```javascript
import { AndroidStudioConfig } from './tools/android-studio/config.js';

const config = new AndroidStudioConfig({
  // Émulateurs
  emulators: {
    defaultApiLevel: 29,           // Android 10
    defaultMemory: 2048,           // 2GB
    defaultStorage: 4096,          // 4GB
    maxConcurrent: 2,              // 2 émulateurs max
    headlessMode: false,           // Interface graphique
    noAudio: true,                 // Optimisation
    lowMemory: true               // Mode économie
  },

  // WhatsApp
  whatsapp: {
    enabled: true,
    apkPath: './assets/apk/whatsapp.apk',
    autoInstall: true,
    configureDevice: true,
    country: 'ca'
  },

  // NordVPN
  nordvpn: {
    enabled: true,
    autoConnect: false,
    defaultCountry: 'ca'
  },

  // Monitoring
  monitoring: {
    enabled: true,
    interval: 10000,              // 10 secondes
    alertThresholds: {
      memory: 90,                 // % mémoire
      cpu: 80,                    // % CPU
      battery: 20                 // % batterie
    }
  }
});
```

### Configuration pour Tests
```javascript
const testConfig = AndroidStudioConfig.getTestingOptimized();
// Mode headless, monitoring fréquent, émulateurs multiples
```

## 🎯 Exemples d'Utilisation

### Exemple 1: Émulateur Simple
```javascript
import { AndroidStudioService } from './tools/android-studio/index.js';

const service = new AndroidStudioService();
await service.initialize();

const emulator = await service.createOptimizedEmulator({
  name: 'test-app',
  apiLevel: 31,
  memory: 3072
});

await service.startEmulator(emulator.id);
```

### Exemple 2: Workflow WhatsApp Complet
```javascript
import { AndroidStudioService } from './tools/android-studio/index.js';
import { whatsappConfig } from './tools/android-studio/config.js';

const service = new AndroidStudioService(whatsappConfig);
await service.initialize();

const workflow = await service.createWhatsAppWorkflow({
  emulatorName: 'whatsapp-production',
  country: 'ca',
  useNordVPN: true,
  installWhatsApp: true,
  configureDevice: true
});

console.log('🎉 Workflow WhatsApp créé:', workflow);
```

### Exemple 3: Monitoring Avancé
```javascript
import { AndroidStudioService } from './tools/android-studio/index.js';

const service = new AndroidStudioService();
await service.initialize();

// Écouter les alertes
service.monitor.on('alert:high_memory', (alert) => {
  console.log('🚨 Mémoire élevée:', alert.value + '%');
});

// Écouter les événements d'émulateur
service.on('emulator:created', (data) => {
  console.log('✅ Émulateur créé:', data.emulator.name);
});

// Obtenir le rapport de santé
const report = await service.monitor.generateHealthReport();
console.log('📊 Recommandations:', report.recommendations);
```

## 🌍 Intégration NordVPN

### Workflow WhatsApp + NordVPN
```javascript
import { AndroidStudioService } from './tools/android-studio/index.js';
import { nordVPNService } from '../nordvpn/index.js';

const androidService = new AndroidStudioService();
const vpnService = nordVPNService;

await androidService.initialize();
await vpnService.initialize();

// Rotation NordVPN automatique
vpnService.rotator.on('rotation:success', (result) => {
  console.log('🌍 NordVPN changé:', result.newIP);
});

// Créer workflow avec VPN
const workflow = await androidService.createWhatsAppWorkflow({
  emulatorName: 'whatsapp-vpn-ca',
  country: 'ca',
  useNordVPN: true
});
```

## 📊 Monitoring et Alertes

### Métriques Disponibles
```javascript
const metrics = service.monitor.getCurrentMetrics();
console.log('📈 Métriques système:', metrics.system);
console.log('📱 Métriques émulateurs:', metrics.emulators);
```

### Alertes Configurables
```javascript
// Alertes système
service.monitor.on('alert:high_cpu', (alert) => {
  console.log('🚨 CPU élevé:', alert.value + '%');
});

service.monitor.on('alert:high_memory', (alert) => {
  console.log('🚨 Mémoire élevée:', alert.value + '%');
});

// Alertes émulateur
service.on('emulator:started', (data) => {
  console.log('🚀 Émulateur démarré:', data.emulatorId);
});
```

## 🔧 Dépannage

### Problèmes Courants

#### "Android SDK non trouvé"
```bash
# Vérifier les variables d'environnement
echo $ANDROID_HOME
echo $ANDROID_SDK_ROOT

# Installer via Android Studio ou:
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/tools:$ANDROID_HOME/platform-tools
```

#### "Échec création émulateur"
```javascript
// Vérifier les outils disponibles
const health = await service.sdk.checkHealth();
console.log('🔧 État SDK:', health);

// Vérifier les permissions KVM (Linux)
ls -la /dev/kvm
```

#### "Problèmes de performance"
```javascript
// Obtenir les recommandations
const report = await service.monitor.generateHealthReport();
console.log('💡 Recommandations:', report.recommendations);

// Réduire le nombre d'émulateurs
config.emulators.maxConcurrent = 1;
```

#### "NordVPN non disponible"
```javascript
// Vérifier l'installation
nordvpn --version

// Tester la connexion
nordvpn connect ca
nordvpn status
```

## 📈 Métriques de Performance

| Configuration | Émulateurs | Mémoire/Émulateur | Performance |
|---------------|------------|-------------------|-------------|
| **Minimal** | 1 | 1.5GB | Excellente |
| **WhatsApp** | 1-2 | 2GB | Très bonne |
| **Gaming** | 1 | 4GB | Bonne |
| **Testing** | 3-5 | 1GB | Acceptable |

## 🛠️ Commandes Utiles

### Gestion des Émulateurs
```bash
# Lister les émulateurs
emulator -list-avds

# Supprimer un émulateur
avdmanager delete avd -n nom_emulateur

# Créer un AVD manuellement
avdmanager create avd -n test -k "system-images;android-29;google_apis;x86_64"
```

### Debugging ADB
```bash
# Lister les devices
adb devices

# Logs d'un émulateur
adb -s emulator-5554 logcat

# Shell dans l'émulateur
adb -s emulator-5554 shell
```

### Variables d'Environnement
```bash
# Pour bash/zsh
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/tools:$ANDROID_HOME/platform-tools
export ANDROID_AVD_HOME=$HOME/.android/avd

# Vérification
echo $ANDROID_HOME
which adb
which emulator
```

## 🎯 Cas d'Usage

### 1. Automatisation WhatsApp
```javascript
// Création de comptes WhatsApp automatisés
const workflows = [];
for (const country of ['ca', 'us', 'fr']) {
  const workflow = await service.createWhatsAppWorkflow({
    emulatorName: `whatsapp-${country}`,
    country,
    useNordVPN: true
  });
  workflows.push(workflow);
}
```

### 2. Tests d'Applications
```javascript
// Pool d'émulateurs pour tests
const emulators = [];
for (let i = 0; i < 3; i++) {
  const emulator = await service.createOptimizedEmulator({
    name: `test-device-${i}`,
    apiLevel: 31,
    memory: 2048
  });
  emulators.push(emulator);
}
```

### 3. Développement Mobile
```javascript
// Émulateur de développement
const devEmulator = await service.createOptimizedEmulator({
  name: 'development',
  apiLevel: 31,
  device: 'pixel_6_pro',
  memory: 4096,
  headless: false  // Interface graphique
});
```

## 📖 Documentation Avancée

### Architecture Technique
- **Service principal**: Orchestrateur de tous les modules
- **Gestionnaire d'émulateurs**: Interface avec Android SDK
- **Gestionnaire de plateforme**: Abstraction Linux/macOS
- **Service de monitoring**: Collecte de métriques temps réel
- **Configuration centralisée**: Paramètres pour tous les modules

### API Events
```javascript
// Événements Android Studio
service.on('emulator:created', callback);
service.on('emulator:started', callback);
service.on('emulator:stopped', callback);
service.on('workflow:created', callback);

// Événements monitoring
service.monitor.on('alert:high_memory', callback);
service.monitor.on('alert:high_cpu', callback);
service.monitor.on('monitoring:cycle', callback);
```

### Extensibilité
```javascript
// Ajouter un nouveau type d'émulateur
class CustomEmulatorManager extends AndroidStudioEmulatorManager {
  async createCustomEmulator(config) {
    // Logique personnalisée
  }
}

// Étendre la configuration
class CustomConfig extends AndroidStudioConfig {
  constructor(options) {
    super(options);
    this.custom = options.customOptions || {};
  }
}
```

## 🤝 Contribution

Ce service est conçu pour être modulaire et extensible. Les contributions sont bienvenues !

### Ajouter un Nouveau Service
```javascript
// tools/android-studio/your-service.js
export class YourService {
  constructor(config) {
    this.config = config;
  }

  async initialize() {
    // Logique d'initialisation
  }
}
```

## 📄 Licence

Ce projet est open-source. Utilisez-le à vos risques et périls, en respectant les termes de service d'Android et NordVPN.

## 🆘 Support

Pour des problèmes ou questions:
1. Vérifiez les logs détaillés du monitoring
2. Testez avec les configurations par défaut
3. Consultez les rapports de santé
4. Vérifiez les prérequis système

---

**🎉 Résultat : Service Android Studio modulaire et production-ready pour l'automatisation WhatsApp !**

Cette architecture vous permet de :
- ✅ **Créer des workflows WhatsApp complets** en une ligne
- ✅ **Gérer des pools d'émulateurs** automatiquement
- ✅ **Intégrer NordVPN** pour la rotation d'IP
- ✅ **Monitorer les performances** en temps réel
- ✅ **Déployer sur Linux/macOS** sans modification
- ✅ **Étendre facilement** pour de nouveaux besoins
