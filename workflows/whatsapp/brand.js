// Workflow de paramètres des informations du compte WhatsApp

const { getWhatsAppService } = require('../../services/whatsapp/app-service');
const { deviceService } = require('../../services/device-service');
const config = require('../../config');
const { getSenderService } = require('../../services/whatsapp/sender-service');
const { sleep } = require('../../utils/helpers');

async function brandWorkflow(brandConfig, device) {
    const whatsappService = getWhatsAppService();
    const senderService = getSenderService();
    const senderDevice = '127.0.0.1:5555'; 
    
    try {
        // Étape 0 : Initialiser les informations du workflow
        console.log(`⚙️ Initialisation du workflow...`);
        console.log(`⚙️ Device: ${device}`);
        console.log(`⚙️ Brand: ${brandConfig.name}`);
        console.log(`\n`);

        // Étape 1 : Connexion adb au device (préventive)
        console.log(`⚙️ Connexion adb au device...`);
        await deviceService.connectDevice(device);
        await deviceService.connectDevice(senderDevice);

        // Étape 2 : Récupérer le numéro WhatsApp du compte actif
        console.log(`⚙️ Récupération du numéro WhatsApp...`);
        const phoneNumber = await whatsappService.getPhoneNumber(device);
        
        if (!phoneNumber) {
            throw new Error('Impossible de récupérer le numéro WhatsApp');
        }

        // Étape 3 : Envoyer une image à ce numéro depuis le device "Master"
        console.log(`⚙️ Envoi image Master -> ${phoneNumber}`);
        await senderService.sendImage(senderDevice, phoneNumber);

        // Étape 4 : Utiliser cette image + brander le compte WhatsApp
        console.log(`⚙️ Re-branding du compte WhatsApp...`);
        await whatsappService.brandAccount(device, brandConfig);

        console.log(`✅ Branding terminé pour ${device}`);

    } catch (error) {
        console.error(`❌ Erreur fatale sur ${device}: ${error.message}`);
        throw error;
    }
}

module.exports = { brandWorkflow };