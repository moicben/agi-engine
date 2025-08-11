// Workflow d'importation de la session What's App

const { whatsappService } = require('../../services/whatsapp/app-service');
const { deviceService } = require('../../services/device-service');
const { ocrService } = require('../../services/whatsapp/ocr-service');
const { sessionService } = require('../../services/whatsapp/session-service');


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

module.exports = { importWorkflow };