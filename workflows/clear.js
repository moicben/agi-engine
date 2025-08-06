// Workflow de nettoyage d'un device

const { sleep } = require('../utils/helpers');
const { deviceService } = require('../services/device-service');
const { executeCommand } = require('../utils/adb');

// Fonction principale du workflow
async function clearWorkflow(device) {
    try {
        console.log(`⚙️  Initialisation du workflow clear...`);
        console.log(`📱 Device: ${device}`);

        // Étape 1 : Connexion adb au device
        console.log(`⚙️ Connexion adb au device...`);
        await deviceService.connectDevice(device);

        // Si application non installée, l'installer  
        const installedAppsRaw = await executeCommand(device, 'shell pm list packages');
        
        if (installedAppsRaw.includes('com.whatsapp')) {

            // Étape 2 : Arrêter WhatsApp
            console.log(`🛑 Arrêt de WhatsApp...`);
            await executeCommand(device, 'shell am force-stop com.whatsapp');
            await sleep(2000);

            // Étape 3 : Vider le cache de WhatsApp
            console.log(`🗑️ Vidage du cache WhatsApp...`);
            await executeCommand(device, 'shell pm clear com.whatsapp');
            await sleep(3000);

            // Étape 4 : Supprimer les données temporaires
            console.log(`🧹 Suppression des données temporaires...`);
            await executeCommand(device, 'shell rm -rf /sdcard/WhatsApp/');
            await executeCommand(device, 'shell rm -rf /sdcard/Android/data/com.whatsapp/');
            await sleep(2000);

        }
        else {
            // Installation de WhatsApp
            console.log('📦 Installation de WhatsApp...');
            const apkPath = './apk/whatsapp.apk';
            await executeCommand(device, `install ${apkPath}`);
            await sleep(3000);

        }

        // Étape 5 : Nettoyer les screenshots
        console.log(`📸 Nettoyage des screenshots...`);
        await executeCommand(device, 'shell rm -f /sdcard/*.png');
        await executeCommand(device, 'shell rm -f /sdcard/DCIM/Screenshots/*.png');
        await sleep(1000);
    
        console.log(`\n✅ Préaration terminée avec succès\n`);
        return { success: true };

    } catch (error) {
        console.error('❌ Erreur dans le workflow clear:', error.message);
        throw error;
    }
}

// Exporter la fonction principale
module.exports = { clearWorkflow };