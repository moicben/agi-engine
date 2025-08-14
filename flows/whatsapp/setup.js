// Workflow de configuration d'un compte WhatsApp

const { whatsappService } = require('../../services/whatsapp/app-service');
const { deviceService } = require('../../services/device-service');
const { inputWorkflow } = require('./input');

// Fonction principale du workflow
async function setupWorkflow(device) {
    try {
        console.log(`⚙️  Initialisation du workflow setup...`);
        // console.log(`📱 Device: ${device}`);

        // Étape 1 : Connexion adb au device
        // console.log(`⚙️ Connexion adb au device...`);
        await deviceService.connectDevice(device);

        // Étape 2 : Reset WhatsApp
        // console.log(`⚙️ Reset WhatsApp...`);
        await whatsappService.setupApp(device);

        // Étape 3 : Ouvrir WhatsApp et commencer la configuration
        //console.log(`📱 Ouverture de WhatsApp...`);
        await whatsappService.launchApp(device);

        //  console.log(`\n✅ Setup terminé avec succès\n`);
        return { success: true };

    } catch (error) {
        console.error('❌ Erreur dans le workflow setup:', error.message);
        throw error;
    }
}

// Exporter la fonction principale
module.exports = { setupWorkflow };