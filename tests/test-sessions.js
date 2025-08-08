// Test du service de session

const { sessionService } = require('../services/session-service');
const { deviceService } = require('../services/device-service');
const { sleep } = require('../utils/helpers');

const device = 'emulator-5554';
const phoneNumber = '+12362061930';
const sessionPath = `./sessions/${phoneNumber}/`;

async function testSessions() {

  // Connexion au device
  // await deviceService.connectDevice(device);
  // await sleep(2000);

  // // Extraire la session
  // const sessionPath = await sessionService.extractSession(device, phoneNumber);
  // console.log(sessionPath);

  // Importer la session dans le device
  await sessionService.importSession(device, sessionPath);
  await sleep(2000);

  // Retourner le chemin de la session
  return sessionPath;

  // Fermer l'application WhatsApp
}

testSessions();