// Workflow d'extraction de la session What's App

import { whatsappService } from '../../tools/whatsapp/app-service.js';
import { deviceService } from '../../tools/whatsapp/device-service.js';
import { ocrService } from '../../tools/whatsapp/ocr-service.js';
import { sessionService } from '../../tools/whatsapp/session-service.js';


// Workflow pour extraire la session What's App
async function extractWorkflow(device, phoneNumber = null) {

    // Connexion au device source
    await deviceService.connectDevice(device);

    let finalPhone = phoneNumber;

    if (!finalPhone) {
        // Obtenir le numéro du compte via OCR
        await whatsappService.goToSettings(device);
        const res = await ocrService.extractPhoneFromProfile(device);
        if (!res?.success || !res?.phoneNumber) {
            throw new Error('Numéro introuvable dans le profil, extraction session impossible');
        }
        finalPhone = res.phoneNumber;
    }

    // Fermer l'application WhatsApp
    await whatsappService.closeApp(device);

    // Extraire la session
    const sessionPath = await sessionService.extractSession(device, finalPhone);
    console.log("Session extraite: " + sessionPath);

    // Retourner le chemin de la session
    return sessionPath;
}

export { extractWorkflow };