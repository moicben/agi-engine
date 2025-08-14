// Service pour gérer le VPN iOS avec clics automatisé sur l'écran
let robot;
try {
  // Optional native dependency; not required on serverless builds
  // eslint-disable-next-line global-require
  robot = require('robotjs');
} catch (e) {
  robot = null;
}
const { sleep } = require('../utils/helpers');
const { clickScreen, writeText, pressKey } = require('../utils/robot');

// === VPN UNIQUE ===
let isChangingVPN = false;
let vpnChanged = false; // Flag pour savoir si le VPN a déjà été changé



// Fonction pour changer de VPN (une seule fois dans toute la session)
async function changeVPN(country) {
    // Si le VPN a déjà été changé dans cette session, on skip
    if (vpnChanged) {
        console.log(`⚡ [VPN] Déjà changé, skip...`);
        return;
    }
    
    // Si quelqu'un est en train de changer, ou a récemment changé, attendre
    while (isChangingVPN) {
        console.log(`⏳ [VPN] Changement en cours, attente...`);
        await sleep(15000);
    }
    
    // Double-check après l'attente
    if (vpnChanged) {
        console.log(`⚡ [VPN] Déjà changé pendant l'attente, skip...`);
        return;
    }
    
    // Essayer de prendre le verrou
    if (!isChangingVPN) {
        isChangingVPN = true;
        
        try {
            const server = await getRandomServer(country);
            console.log(`🔌 [VPN] Connexion: ${server}`);

            // 0. Focus sur l'app VPN iOS
            await clickScreen(2400, 975, 1500);
            await clickScreen(2400, 975, 500);

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
            
            vpnChanged = true; // Marquer comme changé
            // console.log(`✅ [VPN] Changé pour ${country} - Fini pour cette session`);
        } finally {
            isChangingVPN = false;
        }
    }
}

// Fonction pour reset le VPN au début d'un nouveau cycle
async function resetVPNCycle() {
    vpnChanged = false;
    console.log(`🔄 [VPN] Reset pour nouveau cycle`);
}

const vpnIosService = {
    changeVPN,
    getRandomServer,
    resetVPNCycle
};

module.exports = { vpnIosService };