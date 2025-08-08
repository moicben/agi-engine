// Workflow pour entrer un numéro de téléphone


const { whatsappService } = require('../services/whatsapp-service');
const { deviceService } = require('../services/device-service');
const { vpnIosService } = require('../services/vpnios-service');
const { smsService } = require('../services/sms-service');
const { ocrService } = require('../services/ocr-service');
const { randomSleep, sleep } = require('../utils/helpers');


// Workflow pour transférer un numéro de téléphone
async function transferWorkflow(device, country) {

    
    // Convertir le pays en code pays
    let countryCode = country.toUpperCase();
    if (countryCode === 'CANADA') {
        countryCode = 'CA';
    } 
    else if (countryCode === 'uk') {
        countryCode = 'UK';
    }

    // [Bluestacks] Connexion au device source
    await deviceService.connectDevice(device);

    // [Bluestacks] Obtenir le numéro du device source
    await whatsappService.goToSettings(device);

    // [Bluestacks] Analyser le numéro de téléphone via OCR
    const phoneNumber = (await ocrService.extractPhoneFromProfile(device)).phoneNumber;   

    // [Bluestacks] Ouvrir le menu des notifications
    await whatsappService.openPhoneNotifs(device);

    // [Studio Emulator] Démarrer le device
    const deviceStudio = await deviceService.launchStudioDevice('MASTER2'); 

    // [Studio Emulator] Connexion au device
    await deviceService.connectDevice(deviceStudio);

    // [Studio Emulator] Setup WhatsApp
    await whatsappService.setupApp(deviceStudio);

    // [Studio Emulator] Lancer WhatsApp
    await whatsappService.launchApp(deviceStudio);

    // [Studio Emulator] Entrer le numéro + pays
    await whatsappService.inputNewNumber(deviceStudio, phoneNumber, country);

    // [Studio Emulator] Confimer le numéro / demander le SMS
    await whatsappService.confirmNumber(deviceStudio);

    // [Bluestacks] Obtenir le code de transfert
    const transferCode = await whatsappService.getTransferCode(device);

    // [Studio Emulator] Entrer le code de transfert
    await whatsappService.inputTransferCode(deviceStudio, transferCode.code);

    // [Studio Emulator] Finaliser le compte
    await whatsappService.finalizeAccount(deviceStudio);
    
}

module.exports = { transferWorkflow };