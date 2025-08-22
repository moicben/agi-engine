// Workflow de paramètres des informations du compte WhatsApp

import { whatsappService } from './app-service.js';
import { deviceService } from './device-service.js';
import { config } from './config.js';
import { senderService } from './sender-service.js';
import { sleep } from './helpers.js';

export async function brandWorkflow(brandConfig, device, style, masterDevice) {

    //adb -s emulator-5554 push avocate-enfant /sdcard/avocate-enfant
    
    try {
        // Étape 0 : Initialiser les informations du workflow
        console.log(`⚙️ Initialisation du workflow...`);
        console.log(`⚙️ Device: ${device}`);
        console.log(`⚙️ Brand: ${brandConfig.name}`);
        console.log(`⚙️ Style: ${style}`);
        console.log(`\n`);

        // Étape 1 : Connexion adb au device (préventive)
        console.log(`⚙️ Connexion adb au device...`);
        await deviceService.connectDevice(device);
        await deviceService.connectDevice(masterDevice);

        if (style === 'full') {

        // Étape 2 : Récupérer le numéro WhatsApp du compte actif
        console.log(`⚙️ Récupération du numéro WhatsApp...`);
        const phoneNumber = await whatsappService.getPhoneNumber(device);
        
        if (!phoneNumber) {
            throw new Error('Impossible de récupérer le numéro WhatsApp');
        }

        // Étape 3 : Envoyer une image à ce numéro depuis le device "Master"
        console.log(`⚙️ Envoi image Master -> ${phoneNumber}`);
        await senderService.sendImage(masterDevice, phoneNumber);

        // Étape 4 : Utiliser cette image + brander le compte WhatsApp
        console.log(`⚙️ Re-branding du compte WhatsApp...`);
        await whatsappService.brandAccount(device, brandConfig);

        console.log(`✅ Branding terminé pour ${device}`);
    }
    else if (style === 'simple') {
        await whatsappService.brandAccount(device, brandConfig, style);
        console.log(`✅ Branding terminé pour ${device}`);
    }

    } catch (error) {
        console.error(`❌ Erreur fatale sur ${device}: ${error.message}`);
        throw error;
    }
}