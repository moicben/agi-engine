// Fonction de test  service OCR

const { ocrService } = require('../services/ocr-service');
const { deviceService } = require('../services/device-service');

const { sleep } = require('../utils/helpers');

async function testOcr( device) {
    await deviceService.connectDevice(device);
    await sleep(2000);
    const submissionResult = await ocrService.checkSubmission(device);
    const submissionStatus = submissionResult.status;
    if (submissionStatus === 'to confirm') {
        console.log('Compte à confirmer');
        
    } else {
        console.log('Numéro refusé');
    }
    await sleep(1000);
}

testOcr("127.0.0.1:6065");