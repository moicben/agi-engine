# 🐳 Intégration Docker + Android Studio + NordVPN + WhatsApp

Système d'automatisation complet intégrant Docker, Android Studio, NordVPN et WhatsApp pour une automatisation robuste et scalable.

## 🏗️ Architecture

```
🌐 Environnement Docker (Kasm)
├── 🐳 Docker Integration Service
│   ├── 📱 Android Studio Service (émulateurs, SDK)
│   ├── 🌍 NordVPN Service (rotation IP)
│   ├── 📱 WhatsApp Workflows (automatisation)
│   └── 📊 Monitoring (métriques temps réel)
└── 🔄 Orchestration Automatique
```

## 🚀 Démarrage Rapide

### 1. Préparation de l'Environnement
```bash
# Vérifier l'environnement
./check-docker-environment.sh

# Démarrer l'environnement de base
./start-sync.sh
```

### 2. Lancement du Workflow Complet
```bash
# Workflow automatisé complet (recommandé)
./start-docker-workflow.sh

# Ou lancer manuellement
node tools/docker-integration/docker-android-workflow.js
```

### 3. Arrêt Propre
```bash
# Arrêt complet avec nettoyage
./stop-docker-workflow.sh
```

## ⚙️ Configuration

### Variables d'Environnement
```bash
# Configuration des pays (par défaut: ca,us,fr)
export WORKFLOW_COUNTRIES="ca,us,fr,uk"

# Nombre maximum de workflows concurrents
export MAX_CONCURRENT_WORKFLOWS=3

# Durée de chaque workflow en millisecondes
export WORKFLOW_DURATION=300000  # 5 minutes

# Redémarrage automatique après limite atteinte
export AUTO_RESTART=false
```

### Configuration Avancée
```javascript
// Dans tools/docker-integration/docker-android-workflow.js
const options = {
  countries: ['ca', 'us', 'fr'],        // Pays à utiliser
  maxConcurrent: 2,                     // Workflows simultanés
  workflowDuration: 300000,            // Durée par workflow
  autoRestart: false                    // Redémarrage automatique
};
```

## 📊 Monitoring et Diagnostics

### État de l'Environnement
```bash
# Diagnostic complet
./check-docker-environment.sh

# Logs en temps réel
docker compose logs -f

# État des processus
docker exec kasm-desktop ps aux | grep -E "(node|emulator|adb|nordvpn)"
```

### Métriques Temps Réel
```javascript
// Accès aux métriques depuis le code
const stats = await dockerIntegrationService.getDockerStats();
console.log('📊 Stats Docker:', stats);

const health = await dockerIntegrationService.getDockerAndroidStats();
console.log('🤖 État Android:', health);
```

## 🛠️ Services Principaux

### 1. Docker Integration Service
```javascript
import { DockerIntegrationService } from './tools/docker-integration/docker-integration-service.js';

const dockerService = new DockerIntegrationService();
await dockerService.initialize();

// Créer un workflow WhatsApp complet
const workflow = await dockerService.createDockerWhatsAppWorkflow({
  emulatorName: 'whatsapp-ca',
  country: 'ca',
  useNordVPN: true,
  installWhatsApp: true,
  configureDevice: true
});
```

### 2. Workflow Orchestrateur
```javascript
import { DockerAndroidWorkflow } from './tools/docker-integration/docker-android-workflow.js';

const workflow = new DockerAndroidWorkflow();
await workflow.start({
  countries: ['ca', 'us', 'fr'],
  maxConcurrent: 2,
  workflowDuration: 300000
});
```

## 🔧 Dépannage

### Problèmes Courants

#### "Container kasm-desktop non trouvé"
```bash
# Vérifier l'état
docker ps -a

# Démarrer l'environnement de base
./start-sync.sh

# Vérifier les logs
docker compose logs
```

#### "Android SDK non installé"
```bash
# Installation automatique via le script
./start-docker-workflow.sh

# Ou manuellement dans le container
docker exec -u 0 kasm-desktop bash -c "
apt update && apt install -y openjdk-11-jdk
# Installation Android SDK...
"
```

#### "Échec création émulateur"
```bash
# Vérifier l'espace disque
df -h /opt/android-sdk

# Vérifier les permissions KVM
docker exec kasm-desktop ls -la /dev/kvm

# Redémarrer le container
docker compose restart
```

#### "NordVPN non disponible"
```bash
# Vérifier l'installation
docker exec kasm-desktop which nordvpn

# Le système fonctionne sans NordVPN
# mais avec des limitations géographiques
```

### Logs et Debug

#### Logs du Container
```bash
# Logs en temps réel
docker compose logs -f

# Logs des 100 dernières lignes
docker compose logs --tail=100

# Logs d'un service spécifique
docker compose logs desktop
```

#### Logs de l'Application
```bash
# Dans le container
docker exec kasm-desktop ls -la /home/kasm-user/project/logs/

# Logs locaux
ls -la ./logs/

# Dernier rapport de workflow
ls -la ./logs/docker-workflow-report-*.json | tail -1
```

#### Debug Interactif
```bash
# Shell dans le container
docker exec -it kasm-desktop bash

# Variables d'environnement Android
docker exec kasm-desktop env | grep ANDROID

# Processus en cours
docker exec kasm-desktop ps aux | grep -E "(node|emulator|adb)"

# État des devices
docker exec kasm-desktop adb devices
```

## 📈 Performance et Optimisation

### Configuration Optimisée
```javascript
// Configuration pour performance maximale
const config = {
  emulators: {
    maxConcurrent: 2,              // Limiter la concurrence
    headless: false,               // Interface pour debug
    memory: 2048,                  // 2GB par émulateur
    noAudio: true,                 // Économiser CPU
    lowMemory: true               // Mode économie
  },
  monitoring: {
    interval: 5000,               // Monitoring fréquent
    alertThresholds: {
      memory: 85,                 // Alerte à 85%
      cpu: 75                     // Alerte à 75%
    }
  }
};
```

### Métriques de Performance
```bash
# Utilisation CPU du container
docker stats kasm-desktop

# Utilisation mémoire
docker exec kasm-desktop free -h

# Espace disque
docker exec kasm-desktop df -h /opt/android-sdk

# Processus Android
docker exec kasm-desktop ps aux | grep emulator | wc -l
```

## 🔄 Workflows Disponibles

### 1. Workflow WhatsApp Simple
```javascript
const workflow = await dockerService.createDockerWhatsAppWorkflow({
  emulatorName: 'whatsapp-simple',
  country: 'ca',
  useNordVPN: false,
  installWhatsApp: true,
  configureDevice: true
});
```

### 2. Workflow WhatsApp + NordVPN
```javascript
const workflow = await dockerService.createDockerWhatsAppWorkflow({
  emulatorName: 'whatsapp-nordvpn-ca',
  country: 'ca',
  useNordVPN: true,              // Rotation IP automatique
  installWhatsApp: true,
  configureDevice: true
});
```

### 3. Workflow Personnalisé
```javascript
const workflow = await dockerService.createDockerWhatsAppWorkflow({
  emulatorName: 'custom-workflow',
  country: 'us',
  useNordVPN: true,
  installWhatsApp: true,
  configureDevice: true,
  customConfig: {
    memory: 3072,                // Plus de RAM
    storage: 8192,               // Plus de stockage
    width: 1440,                 // Résolution HD
    height: 3120
  }
});
```

## 📊 Statistiques et Rapports

### Rapport de Session
```bash
# Rapport généré automatiquement à la fin
ls -la ./logs/docker-workflow-report-*.json

# Structure du rapport
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "stats": {
    "workflowsStarted": 25,
    "workflowsCompleted": 23,
    "errors": 2,
    "startTime": "...",
    "activeWorkflows": [...]
  },
  "dockerInfo": {
    "name": "kasm-desktop",
    "status": "running"
  }
}
```

### Métriques Temps Réel
```javascript
// Écouter les événements de monitoring
dockerService.on('workflow:created', (workflow) => {
  console.log('🎉 Nouveau workflow:', workflow.name);
});

// Obtenir les statistiques actuelles
const stats = await dockerService.getDockerStats();
console.log('📊 Stats:', stats);
```

## 🌐 Intégration Cloud

### Déploiement sur RunPod
```bash
# Build de l'image avec les services intégrés
docker build -t moicben/agi-engine:automated .

# Push vers Docker Hub
docker push moicben/agi-engine:automated

# Déploiement sur RunPod avec configuration optimisée
# Image: moicben/agi-engine:automated
# Args: --shm-size=4g (pour les émulateurs)
```

### Variables d'Environnement Cloud
```bash
# Configuration pour l'environnement cloud
export WORKFLOW_COUNTRIES="ca,us,fr,uk,de"
export MAX_CONCURRENT_WORKFLOWS=5
export WORKFLOW_DURATION=600000
export AUTO_RESTART=true
```

## 🛡️ Sécurité et Bonnes Pratiques

### Gestion des Secrets
```bash
# Variables sensibles (NE PAS committer)
export DOCKER_PASSWORD="secret"
export NORDVPN_TOKEN="your-token"

# Utiliser des fichiers .env
echo "DOCKER_PASSWORD=secret" > .env
echo "NORDVPN_TOKEN=your-token" >> .env
```

### Nettoyage Automatique
```bash
# Nettoyage après chaque session
./stop-docker-workflow.sh

# Nettoyage manuel des ressources
docker system prune -a
docker volume prune
```

### Sauvegardes
```bash
# Sauvegarde de la configuration
tar -czf backup-config.tar.gz \
  tools/docker-integration/ \
  tools/android-studio/ \
  tools/nordvpn/ \
  docker-compose.yml \
  start-docker-workflow.sh

# Sauvegarde des logs
tar -czf logs-$(date +%Y%m%d).tar.gz logs/
```

## 📈 Évolution et Scalabilité

### Architecture Modulaire
```javascript
// Extension facile avec de nouveaux services
class CustomService extends DockerIntegrationService {
  async customWorkflow() {
    // Logique personnalisée
  }
}

// Intégration de nouveaux pays
const newCountries = ['au', 'nz', 'mx'];
const workflow = new DockerAndroidWorkflow();
await workflow.start({ countries: newCountries });
```

### Monitoring Avancé
```javascript
// Intégration Prometheus/Grafana
const monitoring = {
  metrics: {
    workflows_total: stats.workflowsStarted,
    workflows_success: stats.workflowsCompleted,
    android_emulators: stats.android.emulators?.length || 0
  }
};
```

## 🎯 Cas d'Usage

### 1. Automatisation WhatsApp
- ✅ **Création de comptes automatisée**
- ✅ **Rotation d'IP avec NordVPN**
- ✅ **Configuration multi-pays**
- ✅ **Monitoring et alertes**

### 2. Tests d'Applications
- ✅ **Pool d'émulateurs configurables**
- ✅ **Tests parallèles**
- ✅ **Rapports automatiques**
- ✅ **Intégration CI/CD**

### 3. Recherche et Développement
- ✅ **Environnement de développement intégré**
- ✅ **Debugging avancé**
- ✅ **Tests de performance**
- ✅ **Analyse de comportement**

## 📖 Documentation Complémentaire

- 📚 **[Android Studio Service](../android-studio/README.md)** - Gestion des émulateurs
- 🌍 **[NordVPN Service](../nordvpn/README.md)** - Rotation d'IP
- 📱 **[WhatsApp Workflows](../../whatsapp/)** - Automatisation WhatsApp
- 🐳 **[Docker Commands](../../assets/memos/docker-commands.md)** - Commandes Docker

---

**🎉 Résultat : Environnement d'automatisation WhatsApp complet et production-ready !**

Cette intégration Docker vous permet de :
- ✅ **Déployer facilement** sur n'importe quelle machine
- ✅ **Automatiser complètement** la création de workflows WhatsApp
- ✅ **Monitorer et optimiser** les performances
- ✅ **Scaler horizontalement** avec plusieurs containers
- ✅ **Maintenir et mettre à jour** facilement
