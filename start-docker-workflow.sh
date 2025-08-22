#!/bin/bash

# Script to start the complete Docker + Android + NordVPN + WhatsApp workflow
# This script orchestrates the entire automated environment

echo "🚀 DÉMARRAGE ENVIRONNEMENT COMPLET DOCKER + ANDROID + WHATSAPP"
echo "================================================================"

# Configuration
WORKFLOW_COUNTRIES="${WORKFLOW_COUNTRIES:-ca,us,fr}"
MAX_CONCURRENT_WORKFLOWS="${MAX_CONCURRENT_WORKFLOWS:-2}"
WORKFLOW_DURATION="${WORKFLOW_DURATION:-300000}"
AUTO_RESTART="${AUTO_RESTART:-false}"

echo "🔧 Configuration:"
echo "   • Pays: $WORKFLOW_COUNTRIES"
echo "   • Workflows concurrents: $MAX_CONCURRENT_WORKFLOWS"
echo "   • Durée par workflow: $((WORKFLOW_DURATION / 1000)) secondes"
echo "   • Redémarrage automatique: $AUTO_RESTART"
echo ""

# Vérifier si Docker est en cours d'exécution
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker n'est pas en cours d'exécution"
    echo "💡 Démarrez Docker Desktop ou le service Docker"
    exit 1
fi

# Vérifier si le container kasm-desktop existe
if ! docker ps -a --filter name=kasm-desktop | grep -q kasm-desktop; then
    echo "🐳 Container kasm-desktop non trouvé"
    echo "💡 Démarrez l'environnement avec: ./start-sync.sh"
    exit 1
fi

# Vérifier si le container est en cours d'exécution
if ! docker ps --filter name=kasm-desktop | grep -q kasm-desktop; then
    echo "🔄 Container kasm-desktop trouvé mais arrêté"
    echo "💡 Démarrage du container..."
    docker compose up -d

    # Attendre que le container démarre
    echo "⏳ Attente du démarrage du container..."
    sleep 15

    if ! docker ps --filter name=kasm-desktop | grep -q kasm-desktop; then
        echo "❌ Échec du démarrage du container"
        echo "💡 Vérifiez les logs: docker compose logs"
        exit 1
    fi
fi

echo "✅ Container Docker prêt"
echo ""

# Vérifier si les services sont disponibles
echo "🔍 Vérification des services..."

# Vérifier Node.js
if ! docker exec kasm-desktop which node > /dev/null 2>&1; then
    echo "⚠️ Node.js non trouvé dans le container"
    echo "📦 Installation de Node.js..."
    docker exec kasm-desktop bash -c "curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - && sudo apt-get install -y nodejs"
fi

# Vérifier les outils de développement
docker exec kasm-desktop bash -c "
if ! which git > /dev/null 2>&1; then
    echo '📦 Installation de git...'
    sudo apt update && sudo apt install -y git
fi
"

echo "✅ Services vérifiés"
echo ""

# Créer le répertoire de logs
mkdir -p logs

# Démarrer le workflow avec les variables d'environnement
echo "🎯 Démarrage du workflow automatisé..."
echo "   Appuyez sur Ctrl+C pour arrêter proprement"
echo ""

export WORKFLOW_COUNTRIES="$WORKFLOW_COUNTRIES"
export MAX_CONCURRENT_WORKFLOWS="$MAX_CONCURRENT_WORKFLOWS"
export WORKFLOW_DURATION="$WORKFLOW_DURATION"
export AUTO_RESTART="$AUTO_RESTART"

# Démarrer le workflow
node tools/docker-integration/docker-android-workflow.js

# Code de sortie
exit_code=$?

if [ $exit_code -eq 0 ]; then
    echo "✅ Workflow terminé avec succès"
else
    echo "❌ Workflow terminé avec erreur (code: $exit_code)"
fi

echo ""
echo "📊 Logs disponibles dans le répertoire ./logs/"
echo "📋 Rapport final généré automatiquement"

exit $exit_code
