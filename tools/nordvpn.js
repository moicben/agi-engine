import { randomSleep } from './utils.js';


// Choisir un aléatoirement un serveur NordVPN
export async function getRandomServer(country) {
    const servers = require(`../assets/vpn/${country}-nordvpn-servers.json`);
    return servers[Math.floor(Math.random() * servers.length)];
}

export async function connectToServer(country) {
    console.log(`🔌 Connexion au serveur ${server}...`);
    await randomSleep(1000, 2000);
    const 
}

export async function disconnectFromServer() {
    console.log(`🔌 Déconnexion du serveur...`);
    await randomSleep(1000, 2000);
}