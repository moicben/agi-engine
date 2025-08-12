#!/bin/bash

# Script unifié pour gérer les VPN sur macOS
# Compatible avec votre configuration IKEv2 existante

# UUID de votre VPN IKEv2 (détecté automatiquement)
VPN_UUID="CEAA0559-2ED1-4904-86DF-289AA59D43DE"
VPN_NAME="NordVPN NordLynx"

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonction pour afficher avec couleur
echo_color() {
    echo -e "${2}${1}${NC}"
}

# Fonction pour se connecter au VPN
connect_vpn() {
    echo_color "🔌 Connexion au VPN..." $BLUE
    
    # Vérifier si NordVPN est en cours d'exécution
    if ! pgrep -f "NordVPN" > /dev/null; then
        echo_color "⚠️  NordVPN n'est pas en cours d'exécution" $YELLOW
        echo_color "   Lancez l'application NordVPN d'abord" $YELLOW
    fi
    
    if scutil --nc start "$VPN_UUID"; then
        echo_color "✅ Commande de connexion envoyée" $GREEN
        echo_color "⏳ Attente de la connexion..." $YELLOW
        
        # Attendre jusqu'à 15 secondes pour la connexion
        for i in {1..15}; do
            sleep 1
            local status=$(scutil --nc status "$VPN_UUID" | head -1)
            case "$status" in
                "Connected")
                    echo_color "✅ VPN connecté avec succès!" $GREEN
                    check_status
                    return 0
                    ;;
                "Connecting")
                    echo -n "."
                    ;;
                "Disconnected")
                    if [ $i -gt 5 ]; then
                        echo ""
                        echo_color "❌ Connexion échouée - VPN déconnecté" $RED
                        diagnose_connection_failure
                        return 1
                    fi
                    ;;
            esac
        done
        
        echo ""
        echo_color "⏰ Timeout - Vérification du statut final..." $YELLOW
        check_status
    else
        echo_color "❌ Échec de l'envoi de la commande de connexion" $RED
        return 1
    fi
}

# Fonction pour se déconnecter
disconnect_vpn() {
    echo_color "🔌 Déconnexion du VPN..." $BLUE
    
    if scutil --nc stop "$VPN_UUID"; then
        echo_color "✅ VPN déconnecté" $GREEN
    else
        echo_color "❌ Échec de la déconnexion" $RED
        return 1
    fi
}

# Fonction pour vérifier le statut
check_status() {
    echo_color "📊 Statut du VPN:" $BLUE
    
    local status=$(scutil --nc status "$VPN_UUID" | head -1)
    echo "Status: $status"
    
    case "$status" in
        "Connected")
            echo_color "✅ VPN connecté" $GREEN
            ;;
        "Disconnected")
            echo_color "❌ VPN déconnecté" $RED
            ;;
        "Connecting")
            echo_color "🔄 Connexion en cours..." $YELLOW
            ;;
        *)
            echo_color "⚠️  Statut inconnu: $status" $YELLOW
            ;;
    esac
    
    echo ""
    echo_color "🌐 Vérification de l'IP publique:" $BLUE
    local ip=$(curl -s --max-time 5 ifconfig.me 2>/dev/null)
    if [ -n "$ip" ]; then
        echo "IP actuelle: $ip"
    else
        echo_color "❌ Impossible de récupérer l'IP publique" $RED
    fi
}

# Fonction pour afficher les détails du VPN
show_details() {
    echo_color "📋 Détails de la configuration VPN:" $BLUE
    echo "UUID: $VPN_UUID"
    echo "Nom: $VPN_NAME"
    echo ""
    scutil --nc show "$VPN_UUID"
}

# Fonction pour lister tous les VPN
list_all_vpns() {
    echo_color "📋 Tous les VPN disponibles:" $BLUE
    scutil --nc list
}

# Fonction pour diagnostiquer les problèmes de connexion
diagnose_connection_failure() {
    echo_color "🔍 Diagnostic des problèmes de connexion..." $BLUE
    
    echo "1. Vérification de l'application NordVPN:"
    if pgrep -f "NordVPN" > /dev/null; then
        echo_color "   ✅ NordVPN est en cours d'exécution" $GREEN
    else
        echo_color "   ❌ NordVPN n'est pas en cours d'exécution" $RED
        echo_color "   → Lancez l'application NordVPN" $YELLOW
    fi
    
    echo ""
    echo "2. Vérification de l'authentification:"
    if scutil --nc show "$VPN_UUID" | grep -q "AuthName"; then
        echo_color "   ✅ Informations d'authentification trouvées" $GREEN
    else
        echo_color "   ❌ Problème d'authentification" $RED
        echo_color "   → Reconnectez-vous dans l'app NordVPN" $YELLOW
    fi
    
    echo ""
    echo "3. Vérification du serveur:"
    local server=$(scutil --nc show "$VPN_UUID" | grep "RemoteAddress" | cut -d: -f2 | xargs)
    if [ -n "$server" ]; then
        echo "   Serveur configuré: $server"
        if ping -c 1 -W 3000 "$server" > /dev/null 2>&1; then
            echo_color "   ✅ Serveur accessible" $GREEN
        else
            echo_color "   ❌ Serveur inaccessible" $RED
            echo_color "   → Vérifiez votre connexion Internet" $YELLOW
        fi
    fi
    
    echo ""
    echo "4. Suggestions de résolution:"
    echo_color "   • Redémarrez l'application NordVPN" $YELLOW
    echo_color "   • Essayez un autre serveur dans l'app" $YELLOW
    echo_color "   • Vérifiez votre connexion Internet" $YELLOW
    echo_color "   • Redémarrez votre Mac si nécessaire" $YELLOW
}

# Fonction pour surveiller la connexion
monitor_vpn() {
    echo_color "👁️  Surveillance du VPN (Ctrl+C pour arrêter)..." $BLUE
    
    while true; do
        local status=$(scutil --nc status "$VPN_UUID" | head -1)
        local timestamp=$(date "+%H:%M:%S")
        
        case "$status" in
            "Connected")
                echo_color "[$timestamp] ✅ Connecté" $GREEN
                ;;
            "Disconnected")
                echo_color "[$timestamp] ❌ Déconnecté" $RED
                ;;
            "Connecting")
                echo_color "[$timestamp] 🔄 Connexion..." $YELLOW
                ;;
        esac
        
        sleep 5
    done
}

# Fonction d'aide
show_help() {
    echo_color "🔧 Gestionnaire VPN pour macOS" $BLUE
    echo ""
    echo "Usage: $0 [commande]"
    echo ""
    echo "Commandes disponibles:"
    echo "  connect     - Se connecter au VPN"
    echo "  disconnect  - Se déconnecter du VPN"
    echo "  status      - Vérifier le statut"
    echo "  details     - Afficher les détails de configuration"
    echo "  list        - Lister tous les VPN"
    echo "  monitor     - Surveiller l'état du VPN"
    echo "  diagnose    - Diagnostiquer les problèmes de connexion"
    echo "  help        - Afficher cette aide"
    echo ""
    echo "Exemples:"
    echo "  $0 connect"
    echo "  $0 status"
    echo "  $0 monitor"
}

# Menu principal
case "$1" in
    "connect"|"c")
        connect_vpn
        ;;
    "disconnect"|"d")
        disconnect_vpn
        ;;
    "status"|"s")
        check_status
        ;;
    "details")
        show_details
        ;;
    "list"|"l")
        list_all_vpns
        ;;
    "monitor"|"m")
        monitor_vpn
        ;;
    "diagnose"|"diag")
        diagnose_connection_failure
        ;;
    "help"|"h"|"")
        show_help
        ;;
    *)
        echo_color "❌ Commande inconnue: $1" $RED
        show_help
        exit 1
        ;;
esac