// Workflow de nettoyage/reset d'un device WhatsApp

const { whatsappService } = require('../services/whatsapp-service');
const { deviceService } = require('../services/device-service');

/**
 * Workflow de nettoyage d'un device
 * Reset WhatsApp et nettoie les données
 */
async function clearWorkflow(device) {
    try {
        console.log(`🧹 Démarrage du nettoyage pour device ${device}...`);

        // Étape 1 : Connexion au device
        console.log(`🔌 Connexion au device...`);
        await deviceService.connectDevice(device);

        // Étape 2 : Reset de WhatsApp (clear des données, désinstallation, nettoyage)
        console.log(`🧹 Nettoyage de WhatsApp...`);
        await whatsappService.setupApp(device);

        console.log(`✅ Nettoyage terminé pour device ${device}`);
        return { success: true };

    } catch (error) {
        console.error(`❌ Erreur lors du nettoyage:`, error.message);
        throw error;
    }
}

module.exports = { clearWorkflow };
