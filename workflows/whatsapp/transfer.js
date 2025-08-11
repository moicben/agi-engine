// Workflow pour entrer un numéro de téléphone


const { whatsappService } = require('../../services/whatsapp-service');
const { deviceService } = require('../../services/device-service');
const { vpnIosService } = require('../../services/vpnios-service');
const { smsService } = require('../../services/sms-service');
const { ocrService } = require('../../services/ocr-service');
const { randomSleep, sleep } = require('../../utils/helpers');

// Workflow pour transférer un numéro de téléphone
async function transferWorkflow(device, country, target) {

    // [Bluestacks] Connexion au device source
    await deviceService.connectDevice(device);

    // [Bluestacks] Obtenir le numéro du device source
    await whatsappService.goToSettings(device);

    // [Bluestacks] Analyser le numéro de téléphone via OCR
    const phoneResult = await ocrService.extractPhoneFromProfile(device);
    if (!phoneResult.success) {
        console.error('❌ Impossible d\'extraire le numéro après 3 tentatives:', phoneResult.error);
        return;
    }
    const phoneNumber = phoneResult.phoneNumber;   

    // [Studio Emulator] Démarrer le device
    await deviceService.launchStudioDevice(target); 

    // [Studio Emulator] Connexion au device
    await deviceService.connectDevice(target);

    // [Studio Emulator] Setup WhatsApp
    await whatsappService.setupApp(target);


    // [Studio Emulator] Lancer WhatsApp
    await whatsappService.launchApp(target);

    // [Bluestacks] Ouvrir le menu des notifications
    await whatsappService.openPhoneNotifs(device);

    // [Studio Emulator] Entrer le numéro + pays
    await whatsappService.inputNewNumber(target, phoneNumber, country);

    // [Studio Emulator] Confimer le numéro / demander le SMS
    await whatsappService.confirmNumber(target);

    // [Bluestacks] Obtenir le code de transfert (avec retry automatique)
    const transferCodeResult = await whatsappService.getTransferCode(device);

    // Vérifier si l'extraction du code a réussi après les tentatives
    if (!transferCodeResult || !transferCodeResult.success) {
        console.error('❌ Erreur: Code de transfert non trouvé après 3 tentatives:', transferCodeResult?.error || 'Erreur inconnue');
        return;
    }
    const transferCode = transferCodeResult.code;

    // [Studio Emulator] Entrer le code de transfert
    await whatsappService.inputTransferCode(target, transferCode);

    // [Studio Emulator] Finaliser le compte
    await whatsappService.finalizeAccount(target);
    
}

module.exports = { transferWorkflow };