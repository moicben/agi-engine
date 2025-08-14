

// Choisir un aléatoirement un serveur NordVPN
async function getRandomServer(country) {
    const servers = require(`../assets/vpn/${country}-nordvpn-servers.json`);
    return servers[Math.floor(Math.random() * servers.length)];
}

