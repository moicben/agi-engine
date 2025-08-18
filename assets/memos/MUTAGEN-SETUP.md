# Configuration Mutagen pour agi-engine

## 🎯 Objectif
Remplacer le montage de volume Docker direct par une synchronisation Mutagen optimisée pour :
- Réduire l'espace disque utilisé
- Améliorer les performances
- Exclure les gros fichiers inutiles

## 📦 Installation

### 1. Installer Mutagen
```bash
brew install mutagen-io/mutagen/mutagen
```

### 2. Vérifier l'installation
```bash
mutagen version
```

## 🚀 Utilisation

### Démarrer l'environnement complet
```bash
./start-sync.sh
```

### Arrêter l'environnement
```bash
./stop-sync.sh
```

### Commandes Mutagen utiles
```bash
# Voir le statut de synchronisation
mutagen sync list

# Forcer une synchronisation
mutagen sync flush agi-engine-sync

# Voir les logs de synchronisation
mutagen sync logs agi-engine-sync

# Arrêter la synchronisation
mutagen sync terminate agi-engine-sync
```

## 📁 Fichiers exclus de la synchronisation

Les dossiers suivants sont exclus pour optimiser l'espace :
- `node_modules/` (510MB)
- `screenshots/` (540MB)
- `assets/medias/`, `assets/apk/`, `assets/passports/`
- `kasm-data/`, `kasm-home/`
- `.git/`, `*.log`, `*.tmp`
- `dist/`, `build/`, `.next/`
- `*.zip`, `*.tar.gz`, `*.iso`, `*.img`

## 🔧 Configuration

### Fichier mutagen.yml
Contient la configuration complète de synchronisation avec :
- Mode bidirectionnel avec résolution de conflits
- Exclusion des gros fichiers
- Optimisations de performance
- Surveillance des fichiers

### Scripts
- `start-sync.sh` : Démarre Docker + Mutagen sync
- `stop-sync.sh` : Arrête proprement l'environnement

## 📊 Avantages

1. **Espace disque** : Économie de ~2GB (exclusion des gros dossiers)
2. **Performance** : Synchronisation intelligente et optimisée
3. **Fiabilité** : Gestion des conflits et résolution automatique
4. **Flexibilité** : Configuration fine des exclusions

## 🌐 Accès

- **Bureau virtuel** : https://localhost:6901
- **Mot de passe** : `secret`
- **Projet** : `/home/kasm-user/project` dans le conteneur

## 🔍 Dépannage

### Problèmes de synchronisation
```bash
# Vérifier le statut
mutagen sync list

# Redémarrer la synchronisation
mutagen sync terminate agi-engine-sync
./start-sync.sh
```

### Problèmes de conteneur
```bash
# Voir les logs
docker compose logs

# Redémarrer le conteneur
docker compose restart
```

### Nettoyer l'environnement
```bash
# Arrêter tout
./stop-sync.sh

# Nettoyer Docker
docker system prune -a

# Redémarrer
./start-sync.sh
```
