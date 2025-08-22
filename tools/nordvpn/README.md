# 🌐 Service NordVPN Modulaire

Un service NordVPN complet et modulaire pour Node.js, optimisé pour l'automatisation WhatsApp et autres applications nécessitant des rotations d'IP intelligentes.

## ✨ Fonctionnalités

- 🚀 **Architecture modulaire** - Services indépendants et réutilisables
- 🎯 **Rotation intelligente** - Sélection optimale des serveurs
- 📊 **Monitoring temps réel** - Surveillance de la connexion et alertes
- 🤖 **Optimisé WhatsApp** - Configuration spéciale pour éviter la détection
- 🌍 **Multi-pays** - Support de 352+ serveurs Canada + autres pays
- 🔧 **Configuration flexible** - Adaptable à tous les besoins
- 📈 **Statistiques détaillées** - Métriques et historique complet

## 📦 Installation & Prérequis

### 1. Installer NordVPN CLI
```bash
# Ubuntu/Debian
sudo wget -O /usr/share/keyrings/nordvpn-keyring.gpg https://repo.nordvpn.com/gpg/nordvpn_public.asc
echo "deb [signed-by=/usr/share/keyrings/nordvpn-keyring.gpg] https://repo.nordvpn.com/deb/nordvpn/debian stable main" | sudo tee /etc/apt/sources.list.d/nordvpn.list
sudo apt update && sudo apt install nordvpn

# Autres systèmes: https://nordvpn.com/download/
```

### 2. Connexion NordVPN
```bash
nordvpn login
nordvpn connect
```

## 🚀 Utilisation Rapide

### Démarrage Simple
```javascript
import { initNordVPN, connect, rotateForWhatsApp } from './tools/nordvpn/index.js';

// Initialisation
await initNordVPN();

// Connexion simple
await connect('ca');

// Rotation pour WhatsApp
await rotateForWhatsApp('ca');
```

### Configuration WhatsApp Optimisée
```javascript
import { NordVPNService } from './tools/nordvpn/index.js';
import { whatsappConfig } from './tools/nordvpn/config.js';

// Service avec configuration optimisée
const service = new NordVPNService(whatsappConfig);
await service.initialize();

// Rotation toutes les 10 minutes
setInterval(async () => {
  await service.rotator.rotateForWhatsApp({
    country: 'ca',
    minInterval: 600000,
    verifyConnection: true
  });
}, 600000);
```

## 🏗️ Architecture Modulaire

```
NordVPN Service
├── nordvpn-service.js      # Service principal
├── server-manager.js       # Gestion des serveurs
├── monitor.js              # Monitoring temps réel
├── rotator.js              # Rotation d'IP
├── config.js               # Configuration
└── index.js                # Interface unifiée
```

### Service Principal (`nordvpn-service.js`)
- Interface unifiée pour tous les services
- Gestion du cycle de vie
- Coordination entre les modules

### Gestionnaire de Serveurs (`server-manager.js`)
- 352+ serveurs Canada disponibles
- Sélection intelligente (smart/random/fastest)
- Cache et statistiques d'utilisation

### Monitoring (`monitor.js`)
- Surveillance temps réel de la connexion
- Alertes automatiques
- Métriques de performance

### Rotateur (`rotator.js`)
- Rotation intelligente pour WhatsApp
- Évitement des patterns détectables
- Retry automatique en cas d'échec

## ⚙️ Configuration

### Configuration WhatsApp Optimisée
```javascript
import { NordVPNConfig } from './tools/nordvpn/config.js';

const config = new NordVPNConfig({
  protocol: 'tcp',           // Plus stable
  cyberSec: true,            // Protection supplémentaire
  whatsapp: {
    rotationInterval: 600000, // 10 minutes
    countries: ['CA', 'US'],
    verifyConnection: true,
    maxRetries: 5
  }
});
```

### Configuration Avancée
```javascript
const advancedConfig = {
  // Réseau
  protocol: 'tcp',           // auto, tcp, udp
  killSwitch: true,
  cyberSec: false,
  obfuscate: false,

  // Rotation
  rotation: {
    minInterval: 300000,    // 5 minutes
    maxInterval: 1800000,   // 30 minutes
    randomDelay: 60000,     // 1 minute aléatoire
    strategies: {
      whatsapp: 'smart',
      general: 'random'
    }
  },

  // Monitoring
  monitoring: {
    enabled: true,
    interval: 30000,        // 30 secondes
    alertThresholds: {
      stability: 50,        // % stabilité minimum
      latency: 500         // ms latence maximum
    }
  },

  // Serveurs
  servers: {
    preferredCountries: ['CA', 'US', 'UK', 'FR'],
    maxLoad: 80          // % charge maximum
  }
};
```

## 🎯 Utilisation Avancée

### 1. Service Complet
```javascript
import { NordVPNService } from './tools/nordvpn/index.js';

const service = new NordVPNService();
await service.initialize();

// Événements de monitoring
service.monitor.on('health:healthy', (status) => {
  console.log('✅ NordVPN sain');
});

service.monitor.on('alert:disconnected', () => {
  console.log('🔴 NordVPN déconnecté!');
});

// Rotation automatique
await service.rotator.rotateForWhatsApp({
  country: 'ca',
  strategy: 'smart',
  minInterval: 300000
});
```

### 2. Gestionnaire de Serveurs
```javascript
import { NordVPNServerManager } from './tools/nordvpn/index.js';

const manager = new NordVPNServerManager(config);

// Sélection intelligente
const server = await manager.selectOptimalServer('CA', 'smart');
console.log('Serveur sélectionné:', server);

// Statistiques
const stats = manager.getCountryStats('CA');
console.log('Stats Canada:', stats);
```

### 3. Monitoring Personnalisé
```javascript
import { NordVPNMonitor } from './tools/nordvpn/index.js';

const monitor = new NordVPNMonitor(config);
monitor.startMonitoring(15000); // 15 secondes

// Alertes personnalisées
monitor.on('health:degraded', (status) => {
  console.log('⚠️ Performance dégradée');
  // Action corrective
});

monitor.on('alert:low_stability', (data) => {
  console.log('📉 Stabilité basse:', data.score);
  // Notification ou action
});
```

## 📊 Métriques & Statistiques

### Statistiques de Service
```javascript
const stats = service.getStats();
console.log('Statistiques:', {
  isConnected: stats.isConnected,
  currentServer: stats.currentServer,
  currentIP: stats.currentIP,
  totalConnections: stats.totalConnections,
  stabilityScore: stats.stabilityScore
});
```

### Statistiques de Rotation
```javascript
const rotationStats = service.rotator.getRotationStats();
console.log('Rotation:', {
  totalRotations: rotationStats.totalRotations,
  successRate: rotationStats.successRate,
  recentRotations: rotationStats.recentRotations,
  countriesUsed: rotationStats.countriesUsed
});
```

## 🌍 Pays Disponibles

- 🇨🇦 **Canada**: 352+ serveurs disponibles
- 🇺🇸 **États-Unis**: Support complet
- 🇬🇧 **Royaume-Uni**: Support complet
- 🇫🇷 **France**: Support complet
- 🇩🇪 **Allemagne**: Support complet

## 🛠️ Dépannage

### Problèmes Courants

#### "NordVPN CLI non installé"
```bash
# Vérifier l'installation
nordvpn --version

# Réinstaller si nécessaire
sudo apt remove nordvpn && sudo apt install nordvpn
```

#### "Impossible de se connecter"
```javascript
// Vérifier les logs
const logs = service.connectionHistory.slice(-5);
console.log('Historique:', logs);

// Changer de serveur
await service.connectToCountry('us', { serverType: 'random' });
```

#### "Stabilité basse"
```javascript
// Obtenir le rapport de santé
const report = await service.monitor.getHealthReport();
console.log('Recommandations:', report.recommendations);

// Redémarrer le service
await service.disconnect();
await service.connectToCountry('ca', { serverType: 'fastest' });
```

## 🔧 Configuration des Variables d'Environnement

```bash
# Authentification
NORDVPN_USERNAME=your_username
NORDVPN_PASSWORD=your_password
NORDVPN_API_KEY=your_api_key

# Configuration
NORDVPN_PROTOCOL=tcp
NORDVPN_KILL_SWITCH=true
NORDVPN_CYBER_SEC=false

# Monitoring
NORDVPN_MONITOR_INTERVAL=30000
NORDVPN_HEALTH_CHECK_INTERVAL=300000

# Alertes
NORDVPN_ALERT_EMAIL=your@email.com
NORDVPN_ALERT_WEBHOOK=https://your-webhook-url
```

## 📈 Intégration WhatsApp

### Exemple Complet
```javascript
import { NordVPNService } from './tools/nordvpn/index.js';
import { whatsappConfig } from './tools/nordvpn/config.js';

class WhatsAppAutomation {
  constructor() {
    this.vpnService = new NordVPNService(whatsappConfig);
    this.isRunning = false;
  }

  async start() {
    console.log('🚀 Démarrage automatisation WhatsApp...');

    // Initialisation
    await this.vpnService.initialize();

    // Configuration des événements
    this.setupEventHandlers();

    // Démarrage du cycle de rotation
    this.isRunning = true;
    this.rotationCycle();

    console.log('✅ Automatisation WhatsApp démarrée');
  }

  setupEventHandlers() {
    // Monitoring VPN
    this.vpnService.monitor.on('alert:disconnected', async () => {
      console.log('🔴 VPN déconnecté - Reconnexion...');
      await this.vpnService.connectToCountry('ca');
    });

    // Alertes de performance
    this.vpnService.monitor.on('alert:low_stability', (data) => {
      console.log(`📉 Stabilité VPN basse: ${data.score}%`);
    });
  }

  async rotationCycle() {
    while (this.isRunning) {
      try {
        // Rotation VPN toutes les 10 minutes
        await this.vpnService.rotator.rotateForWhatsApp({
          country: 'ca',
          minInterval: 600000, // 10 minutes
          verifyConnection: true
        });

        // Ici votre code WhatsApp
        await this.performWhatsAppActions();

        // Attendre avant la prochaine rotation
        await new Promise(resolve => setTimeout(resolve, 600000));

      } catch (error) {
        console.error('❌ Erreur cycle rotation:', error.message);

        // Attendre avant retry
        await new Promise(resolve => setTimeout(resolve, 30000));
      }
    }
  }

  async performWhatsAppActions() {
    // Votre logique WhatsApp ici
    console.log('📱 Actions WhatsApp avec IP:', this.vpnService.currentIP);
  }

  async stop() {
    console.log('⏹️ Arrêt automatisation WhatsApp...');
    this.isRunning = false;
    await this.vpnService.cleanup();
    console.log('✅ Automatisation arrêtée');
  }
}

// Utilisation
const automation = new WhatsAppAutomation();
await automation.start();

// Arrêt propre
process.on('SIGINT', async () => {
  await automation.stop();
  process.exit(0);
});
```

## 🤝 Contribution

Ce service est conçu pour être modulaire et extensible. Les contributions sont bienvenues !

### Ajouter un Nouveau Service
```javascript
// tools/nordvpn/your-service.js
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

Ce projet est open-source. Utilisez-le à vos risques et périls, en respectant les termes de service de NordVPN.

## 🆘 Support

Pour des problèmes ou questions:
1. Vérifiez les logs détaillés
2. Consultez les métriques de monitoring
3. Testez avec différentes configurations
4. Ouvrez une issue avec les logs et la configuration

---

**🎯 Résultat**: Un service NordVPN modulaire qui transforme vos 2-3 comptes/jour en système scalable avec rotation d'IP intelligente !
