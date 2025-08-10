const { deviceService } = require('../services/device-service');
const { ocrService } = require('../services/ocr-service');
const { whatsappService } = require('../services/whatsapp-service');
const { sleep } = require('../utils/helpers');
const { executeCommand } = require('../utils/adb');
const device = 'emulator-5554';



async function testStudio() {

// commande adb revenir au bureau du téléphone
    // await executeCommand(device, 'shell input keyevent KEYCODE_HOME');
    // await sleep(2000);

    // const code = await ocrService.extractTransferCode(device);
    // console.log(code);

    const deviceStudio = await deviceService.launchStudioDevice(device);
    console.log(deviceStudio);

    // await whatsappService.finalizeAccount(device);

}

testStudio();