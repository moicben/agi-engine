### Mémo Docker/Mutagen pour agi-engine

---

### Conteneurs et synchronisation

```bash
# Voir les conteneurs du projet
docker compose ps

# Voir les sessions Mutagen actives
mutagen sync list

# Démarrer l'environnement + sync
./start-sync.sh

# Arrêter l'environnement + sync
./stop-sync.sh
```

### Shell dans le conteneur

```bash
# classic
docker exec -it kasm-desktop bash
# mode root
docker exec -it -u 0 kasm-desktop bash
# ou
docker exec -it <ID> sh

```

---

### Images et exécution

```bash
# Lister toutes les images locales
docker images

# Démarrer en arrière-plan (compose)
docker compose up -d

# Logs en direct
docker compose logs -f

# Redémarrer le service desktop
docker compose restart desktop

# Arrêter et supprimer
docker compose down

# Supprimer une image spécifique
docker rmi ID_IMAGE

```


---

### Ressources et tailles

```bash
# Vue globale de l'espace Docker
docker system df -v

# Taille du conteneur en cours (diff only)
docker ps -s

# Détails d'une image précise
docker images moicben/kasm-jammy:1.14.0
```

---

### Analyse de l'espace dans le projet

```bash
# Dossiers triés par taille
du -sh * | sort -hr

# Plus gros fichiers (>100MB)
find . -type f -size +100M -exec ls -lh {} \;

# Dossiers volumineux usuels
du -sh ./assets/* ./kasm-data/* ./node_modules/* 2>/dev/null | sort -hr
```

---

### Nettoyage (attention aux données)

```bash
# Supprimer conteneurs arrêtés, réseaux inutilisés, images dangling
docker system prune -a

# Supprimer volumes non utilisés (données perdues)
docker volume prune

# Supprimer images non utilisées
docker image prune -a

# Supprimer le cache de build
docker builder prune -a
```

---

### Push de l'image vers Docker Hub

Supposons que l'image locale à pousser est `moicben/agi-engine:staged`

```bash
# Connexion Docker Hub
docker login

# (Optionnel) Créer une image à partir d'un conteneur modifié
docker commit kasm-desktop moicben/agi-engine:...

# Tag le containre à manipuler
docker tag moicben/agi-egine:...

# Push vers votre namespace
docker push moicben/agi-egine:...

# (Optionnel) Pinner par digest pour un déploiement immuable
docker pull moicben/kasm-jammy@sha256:9a4b0e5832303a7b5f371a3566a0720e422224de0391ba7f3165cdf2b90e5c2a
```

---

### Versioning des images (tags et digest)

Bonnes pratiques (SemVer) et commandes utiles:

```bash


# (1) Builder une version immuable
docker build -t moicben/agi-engine:.. .
docker push moicben/agi-engine:..

# 2) Re-tager sans réécrire la version immuable
docker tag moicben/agi-engine:.. moicben/kasm-jammy:stable
docker tag moicben/agi-engine:.. moicben/kasm-jammy:latest

# 3) Push l'image sur le Docker Hub
docker push moicben/kasm-jammy:stable
docker push moicben/kasm-jammy:latest

# 3) Récupérer le digest (pour pinner dans l'infra/RunPod)
docker inspect --format='{{index .RepoDigests 0}}' moicben/agi-engine:..
# => moicben/kasm-jammy@sha256:...
```

Règles:
- Ne jamais réécrire un tag de version (1.14.1). Utiliser `stable`/`latest` comme tags mobiles.
- Idéalement, référencer l'image par digest dans l'infra pour l'immutabilité.
- Ajouter des labels OCI (source, version, commit) au build pour tracer.

---

### Déploiement sur RunPod (Custom Image)

Depuis l'UI RunPod:
- Image: `moicben/kasm-jammy:1.14.0`
- Docker Args: `--shm-size=2g`
- Env: `VNC_PW=secret`, `TZ=Europe/Paris`
- Ports: `6901`, `3000`, `5173`
- Type: CPU (GPU non requis)
- Storage: ≥15GB (image ~11GB + marge)

Commandes de test local équivalentes:
```bash
docker run -d \
  --name kasm-desktop-test \
  --shm-size=2g \
  -p 6901:6901 -p 3000:3000 -p 5173:5173 \
  moicben/kasm-jammy:1.14.0
```

---

### Disque hôte

```bash
# Espace utilisé par le projet et le home kasm
du -sh ./
du -sh ./kasm-home

# Espace disque disponible
df -h
```