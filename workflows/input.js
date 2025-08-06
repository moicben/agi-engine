// Workflow pour entrer un numéro de téléphone

const { whatsappService } = require('../services/whatsapp-service');
const { deviceService } = require('../services/device-service');
const { vpnIosService } = require('../services/vpnios-service');
const { smsService } = require('../services/sms-service');
const { ocrService } = require('../services/ocr-service');
const { randomSleep, sleep } = require('../utils/helpers');

/**
 * Orchestrateur léger pour gérer les cas de soumission
 */
async function orchestrator(submissionResult, device, country, recurse) {
    const status = submissionResult.status;
    let result;

    if (status === 'to confirm') {
        console.log('📝 Compte à confirmer...');
        await vpnIosService.changeVPN(country);
        await whatsappService.confirmAccount(device);
        const newResult = await ocrService.checkSubmission(device);
        const newStatus = newResult.status;

        switch (newStatus) {
            case 'success':
                result = await handleSuccess('✅ Numéro accepté après confirmation...');
                break;
            case 'rejected':
                result = await handleRejected(device, '❌ Numéro refusé après confirmation...', recurse);
                break;
            case 'frozen':
                result = await handleFrozen(device, '⚙️  Erreur de connexion...', recurse);
                break;
            default:
                result = await handleRejected(device, '❌ Numéro refusé...', recurse);
                break;
        }
    } else if (status === 'success') {
        result = await handleSuccess('✅ Numéro accepté directement...');
    } else if (status === 'frozen') {
        result = await handleFrozen(device, '⚙️  Erreur de connexion...', recurse);
    } else {
        result = await handleRejected(device, '❌ Numéro refusé...', recurse);
    }

    if (result.action === 'recurse') {
        await recurse(device, country);
    }
    // Pour 'return', on laisse simplement la fonction se terminer
}

// Fonctions d'actions légères
async function handleSuccess(message) {
    console.log(message);
    return { action: 'return' };
}
async function handleRejected(device, message, recurse) {
    console.log(message);
    await whatsappService.rejectNumber(device);
    return { action: 'recurse' };
}
async function handleFrozen(device, message, recurse) {
    console.log(message);
    await whatsappService.setupApp(device);
    return { action: 'return' };
}

// Workflow pour entrer un numéro de téléphone
async function inputWorkflow(device, country) {
    // Convertir le pays en code pays
    let countryCode = country.toUpperCase();
    if (countryCode === 'CANADA') {
        countryCode = 'CA';
    } 
    else if (countryCode === 'uk') {
        countryCode = 'UK';
    }

    // Connexion au device
    //console.log(`🔌 Connexion au device ${device}...`);
    await deviceService.connectDevice(device);

    // Obtenir un numéro WhatsApp du pays spécifié  
    //console.log(`🔍 Récupération du numéro WhatsApp pour le pays ${country} (code: ${countryCode})...`);
    const phoneNumber = await smsService.getPhoneNumber(countryCode, 25);
    await randomSleep(100, 1000);

    // Changer de VPN IOS
    // await vpnIosService.changeVPN(country);
    // await randomSleep(3000, 6000);
    
    // Lancement de WhatsApp
    // console.log(`🔍 Lancement de WhatsApp...`);
    // await launchApp(device);

    // Entrer le numéro de téléphone et le pays
    await whatsappService.inputNewNumber(device, phoneNumber, country);
    
    // Changer de VPN IOS
    await vpnIosService.changeVPN(country);

    // Confimer le numéro / demander le SMS
    await whatsappService.confirmNumber(device);

    // === ANALYSE ET TRAITEMENT DU RÉSULTAT ===
    const submissionResult = await ocrService.checkSubmission(device);
    
    // Déléguer la gestion des cas à l'orchestrateur
    await orchestrator(submissionResult, device, country, inputWorkflow);
}

module.exports = { inputWorkflow };