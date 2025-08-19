// Workflow pour entrer un numéro de téléphone

import { whatsappService } from '../../tools/whatsapp/app-service.js';
import { deviceService } from '../../tools/whatsapp/device-service.js';
import { vpnIosService } from '../../tools/whatsapp/vpnios-service.js';
import { smsService } from '../../tools/whatsapp/sms-service.js';
import { ocrService } from '../../tools/whatsapp/ocr-service.js';
import { randomSleep, sleep } from '../../tools/whatsapp/helpers.js';

/**
 * Orchestrateur léger pour gérer les cas de soumission
 */
async function orchestrator(submissionResult, device, country, phoneNumber, recurse) {
    const status = submissionResult.status;
    let result;

    if (status === 'to confirm') {
        console.log('📝 Compte à confirmer...');
        await vpnIosService.resetVPNCycle()
        //await vpnIosService.changeVPN(country);
        await whatsappService.confirmAccount(device);
        const newResult = await ocrService.checkSubmission(device);
        const newStatus = newResult.status;

        switch (newStatus) {
            case 'success':
                result = await handleSuccess('✅ Numéro accepté après confirmation...', phoneNumber, device, country);
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
        result = await handleSuccess('✅ Numéro accepté directement...', phoneNumber, device, country);
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

// Fonctions d'actions décisionnelles de l'orchestrateur
async function handleSuccess(message, phoneNumber, device, country) {
    console.log(message);
    
    // Marquer comme prêt à recevoir SMS puis attendre 
    const countryCode = country.toUpperCase() === 'CANADA' ? 'CA' : country.toUpperCase();
    
    try {
        await smsService.requestSMS(countryCode, phoneNumber);
        const codeSMS = await smsService.waitForSMS(phoneNumber);
        
        if (codeSMS) {
            // Si code SMS reçu, l'entrer et finaliser la création
            console.log(`✅ Code SMS reçu ! ${codeSMS}`);
            await whatsappService.inputSMSCode(device, codeSMS);
            await whatsappService.finalizeAccount(device);
            return { action: 'return' };
        }
    } catch (error) {
        // Timeout ou erreur SMS
        console.log(`❌ Erreur SMS: ${error.message}`);
        await whatsappService.clearApp(device);
    }
    
    // Sinon relancer l'app et recommencer le workflow
    await whatsappService.clearApp(device);
    console.log(`❌ Code SMS non reçu !`);
    return { action: 'recurse' };
}
async function handleRejected(device, message, recurse) {
    console.log(message);
    await whatsappService.clearApp(device);
    return { action: 'recurse' };
}
async function handleFrozen(device, message, recurse) {
    console.log(message);
    await whatsappService.clearApp(device);
    return { action: 'recurse' };
}


// Workflow pour entrer un numéro de téléphone
async function inputWorkflow(device, country) {
    // Reset VPN pour nouveau workflow/récursion
    await vpnIosService.resetVPNCycle();
    
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
    const phoneNumber = await smsService.getPhoneNumber(countryCode, 25);
    await randomSleep(50, 500);

    // Changer de VPN IOS
    // await vpnIosService.changeVPN(country);
    // await randomSleep(3000, 6000);
    
    // Lancement de WhatsApp
    await whatsappService.launchApp(device);

    // Entrer le numéro de téléphone et le pays
    await whatsappService.inputNewNumber(device, phoneNumber, country);
    
    // Changer de VPN IOS
    //await vpnIosService.changeVPN(country);

    // Confimer le numéro / demander le SMS
    await whatsappService.confirmNumber(device);

    // === ANALYSE ET TRAITEMENT DU RÉSULTAT ===
    const submissionResult = await ocrService.checkSubmission(device);
    
    // Déléguer la gestion des cas à l'orchestrateur
    await orchestrator(submissionResult, device, country, phoneNumber, inputWorkflow);
}

export { inputWorkflow };