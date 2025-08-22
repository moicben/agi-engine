// Workflow pour entrer un numéro de téléphone

import { whatsappService } from './app-service.js';
import { deviceService } from './device-service.js';
import vpnIosService from '../vpnios.js';
import { ocrService } from './ocr-service.js';
import { randomSleep, sleep } from './helpers.js';
import smsCurlService from './sms-curl-service.js';
import smsService from './sms-service.js';

/**
 * Orchestrateur léger pour gérer les cas de soumission
 */
async function orchestrator(submissionResult, device, country, phoneNumber, recurse) {
    const status = submissionResult.status;

    if (status === 'to confirm') {
        console.log('📝 Compte à confirmer...');
        await vpnIosService.resetVPNCycle()
        //await vpnIosService.changeVPN(country);
        await whatsappService.confirmAccount(device);
        const newResult = await ocrService.checkSubmission(device);
        const newStatus = newResult.status;

        switch (newStatus) {
            case 'success':
                await handleSuccess('✅ Numéro accepté après confirmation...', phoneNumber, device, country);
                return phoneNumber;
            case 'rejected':
                await handleRejected(device, '❌ Numéro refusé après confirmation...', recurse);
                return await recurse(device, country);
            case 'frozen':
                await handleFrozen(device, '⚙️  Erreur de connexion...', recurse);
                return await recurse(device, country);
            default:
                await handleRejected(device, '❌ Numéro refusé...', recurse);
                return await recurse(device, country);
        }
    } else if (status === 'success') {
        await handleSuccess('✅ Numéro accepté directement...', phoneNumber, device, country);
        return phoneNumber;
    } else if (status === 'frozen') {
        await handleFrozen(device, '⚙️  Erreur de connexion...', recurse);
        return await recurse(device, country);
    } else {
        await handleRejected(device, '❌ Numéro refusé...', recurse);
        return await recurse(device, country);
    }
} 

// Fonctions d'actions décisionnelles de l'orchestrateur
async function handleSuccess(message, phoneNumber, device, country) {
    console.log(message);
    
    // Marquer comme prêt à recevoir SMS puis attendre 
    const countryCode = country.toUpperCase() === 'CANADA' ? 'CA' : country.toUpperCase();
    
    try {
        await smsCurlService.requestSMS(countryCode, phoneNumber);
        const codeSMS = await smsCurlService.waitForSMS(phoneNumber);
        
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
async function inputWorkflow(device, country, vpn = false) {

    if (vpn) {
        // Reset VPN pour nouveau workflow/récursion
        await vpnIosService.resetVPNCycle();
    }
    
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
    const phoneNumber = await smsCurlService.getPhoneNumber(countryCode, 25);
    await randomSleep(50, 500);

    if (vpn) {
        // Changer de VPN IOS
        await vpnIosService.changeVPN(country);
        await randomSleep(3000, 6000);
    }
    
    // Lancement de WhatsApp
    await whatsappService.launchApp(device);

    // Entrer le numéro de téléphone et le pays
    await whatsappService.inputNewNumber(device, phoneNumber, country);
    
    // Confimer le numéro / demander le SMS
    await whatsappService.confirmNumber(device);

    // === ANALYSE ET TRAITEMENT DU RÉSULTAT ===
    const submissionResult = await ocrService.checkSubmission(device);
    
    // Déléguer la gestion des cas à l'orchestrateur
    const acceptedNumber = await orchestrator(submissionResult, device, country, phoneNumber, inputWorkflow);
    return acceptedNumber;
}

export { inputWorkflow };