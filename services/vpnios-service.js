// Service pour gérer le VPN iOS avec clics automatisé sur l'écran
const robot = require('robotjs');  
const { sleep } = require('../utils/helpers');
const { clickScreen, writeText, pressKey } = require('../utils/robot');

// Choisir un aléatoirement un serveur 
async function getRandomServer(country) {
    const servers = require(`../vpn/${country}-nordvpn-servers.json`);
    return servers[Math.floor(Math.random() * servers.length)];
}

// Fonction pour changer de VPN
async function changeVPN(country) {
    const server = await getRandomServer(country);
    console.log(`🔌 Connexion VPN: ${server}`);

    // 0. Focus sur l'app VPN iOS
    await clickScreen(2400, 975, 1000);

    // 1. Cliquer sur le bouton "i"
    await clickScreen(2520, 975, 2000);

    // 2. Remplacer  "server"
    await pressKey("Tab", 500);
    await pressKey("Tab", 1000);
    await writeText(server, 1000);

    // 3. Remplacer "Remote ID"
    await pressKey("Tab", 500);
    await writeText(server, 2000);

    // 4. Valider avec "Enter"
    await pressKey("Enter", 2000);

    // 5. Activer le VPN à jour
    await clickScreen(2480, 980, 1000);
    await sleep(4500);
}

const vpnIosService = {
    changeVPN,
    getRandomServer
};

module.exports = { vpnIosService };