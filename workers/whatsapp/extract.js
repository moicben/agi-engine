// Workflow d'extraction de la session What's App

import { whatsappService } from '../../tools/whatsapp/app-service.js';
import { deviceService } from '../../tools/whatsapp/device-service.js';
import { ocrService } from '../../tools/whatsapp/ocr-service.js';
import { sessionService } from '../../tools/whatsapp/session-service.js';


// Workflow pour extraire la session What's App
async function extractWorkflow(device) {

    // Connexion au device source
    await deviceService.connectDevice(device);

    // Obtenir le numéro du compte
    await whatsappService.goToSettings(device);

    // Analyser le numéro de téléphone via OCR
    const phoneNumber = (await ocrService.extractPhoneFromProfile(device)).phoneNumber;   

    // Fermer l'application WhatsApp
    await whatsappService.closeApp(device);

    // Extraire la session
    const sessionPath = await sessionService.extractSession(device, phoneNumber);
    console.log("Session extraite: " + sessionPath);

    // Retourner le chemin de la session
    return sessionPath;
    
}

export { extractWorkflow };