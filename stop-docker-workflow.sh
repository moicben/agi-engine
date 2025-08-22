#!/bin/bash

# Script to stop the Docker + Android + NordVPN + WhatsApp workflow cleanly
# Ensures proper cleanup of all resources

echo "⏹️ ARRÊT ENVIRONNEMENT DOCKER + ANDROID + WHATSAPP"
echo "================================================"

# Vérifier si le container existe
if ! docker ps -a --filter name=kasm-desktop | grep -q kasm-desktop; then
    echo "ℹ️ Container kasm-desktop non trouvé"
    echo "✅ Aucun environnement à arrêter"
    exit 0
fi

# Vérifier si le container est en cours d'exécution
if docker ps --filter name=kasm-desktop | grep -q kasm-desktop; then
    echo "🔄 Container en cours d'exécution"
    echo "💡 Envoi du signal d'arrêt aux processus..."

    # Tenter un arrêt gracieux via les scripts du container
    docker exec kasm-desktop bash -c "
        # Arrêter les processus Node.js
        pkill -f 'node.*docker-android-workflow.js' 2>/dev/null || true
        pkill -f 'node.*docker-integration' 2>/dev/null || true

        # Arrêter les émulateurs Android
        if which adb > /dev/null 2>&1; then
            adb devices | grep emulator | cut -f1 | while read -r device; do
                echo \"Arrêt de l'émulateur: \$device\"
                adb -s \"\$device\" emu kill 2>/dev/null || true
            done
        fi

        # Arrêter NordVPN si en cours
        if which nordvpn > /dev/null 2>&1; then
            nordvpn disconnect 2>/dev/null || true
        fi

        echo '✅ Processus arrêtés dans le container'
    " 2>/dev/null || echo "⚠️ Impossible d'accéder au container pour arrêt gracieux"

    # Attendre quelques secondes
    sleep 5

    echo "🔄 Arrêt du container Docker..."
    docker compose down
else
    echo "ℹ️ Container déjà arrêté"
    docker compose down
fi

# Nettoyer les ressources Docker
echo "🧹 Nettoyage des ressources Docker..."

# Arrêter et supprimer les conteneurs
docker compose down -v

# Nettoyer les images et volumes non utilisés (optionnel, commenté par défaut)
# docker system prune -f
# docker volume prune -f

# Arrêter Mutagen si en cours
if command -v mutagen &> /dev/null; then
    echo "📡 Arrêt des sessions Mutagen..."
    mutagen sync terminate agi-engine-sync 2>/dev/null || true
    mutagen sync list
fi

echo "✅ Environnement arrêté proprement"
echo ""
echo "📊 État final:"
echo "   • Container: Arrêté"
echo "   • Mutagen: Terminé"
echo "   • Ressources: Nettoyées"
echo ""
echo "🚀 Pour redémarrer: ./start-docker-workflow.sh"
