// Workflow d'importation de la session What's App

import { whatsappService } from '../../tools/whatsapp/app-service.js';
import { deviceService } from '../../tools/whatsapp/device-service.js';
import { ocrService } from '../../tools/whatsapp/ocr-service.js';
import { sessionService } from '../../tools/whatsapp/session-service.js';


// Workflow pour importer la session What's App
async function importWorkflow(device, sessionPath) {

    // Connexion au device source
    await deviceService.connectDevice(device);

    // Fermer l'application WhatsApp
    await whatsappService.closeApp(device);

    // Importer la session
    await sessionService.importSession(device, sessionPath);

    // Retourner le chemin de la session
    return sessionPath;
    
}

export { importWorkflow };