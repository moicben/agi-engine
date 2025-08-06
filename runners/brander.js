// Runner du workflow brand.js

const { brandWorkflow } = require('../workflows/brand');
const config = require('../config');
const { sleep, parseArgs } = require('../utils/helpers');


// Récupérer les devices et le brand
const args = parseArgs();

if (!args.device) {
    console.error('❌ Erreur: Device non spécifié, utiliser --device=<device1,device2,device3> et --brand=<brand_id>');
    process.exit(1);
}

if (!args.brand) {
    console.error('❌ Erreur: Brand non spécifié, utiliser --device=<device1,device2,device3> et --brand=<brand_id>');
    process.exit(1);
}

// Parser les devices (séparés par des virgules)
const deviceIds = args.device.split(',').map(id => parseInt(id.trim()));
const devices = [];

// Valider chaque device et construire la liste
for (const deviceId of deviceIds) {
    const deviceConfig = config.devicePorts.find(d => d.id === deviceId);
    if (!deviceConfig) {
        console.error(`❌ Erreur: Device ${deviceId} non trouvé dans la configuration`);
        process.exit(1);
    }
    devices.push(`127.0.0.1:${deviceConfig.port}`);
}

// Trouver le brand
const brandConfig = config.brand.find(brand => brand.id === parseInt(args.brand));

if (!brandConfig) {
    console.error('❌ Erreur: Brand non trouvé, utiliser --brand=<brand_id>');
    process.exit(1);
}

console.log(`📱 Démarrage du branding avec ${devices.length} device(s): ${devices.join(', ')}`);
console.log(`👤 Brand: ${brandConfig.name}`);
console.log(`⏱️ Décalage entre chaque lancement: 20 secondes\n`);

// Fonction pour lancer le branding d'un device avec délai
async function launchBrandingWithDelay(device, delaySeconds) {
    if (delaySeconds > 0) {
        console.log(`⏳ Device ${device}: Attente de ${delaySeconds} secondes avant démarrage...`);
        await sleep(delaySeconds * 1000);
    }
    
    console.log(`🚀 Lancement du branding pour ${device}...`);
    try {
        await brandWorkflow(brandConfig, device);
        console.log(`✅ Branding terminé avec succès pour ${device}`);
    } catch (error) {
        console.error(`❌ Erreur fatale sur ${device}: ${error.message}`);
        throw error;
    }
}

// Lancer tous les workflows en parallèle avec décalage
(async () => {
    try {
        const promises = devices.map((device, index) => {
            const delaySeconds = index * 20; // 20 secondes de décalage entre chaque device
            return launchBrandingWithDelay(device, delaySeconds);
        });

        // Attendre que tous les workflows terminent
        await Promise.all(promises);
        console.log(`\n🎉 Tous les brandings sont terminés !`);
        
    } catch (error) {
        console.error('❌ Erreur fatale:', error.message);
        process.exit(1);
    }
})();