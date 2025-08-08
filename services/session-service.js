// Service pour gérer la session What's App


const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const { executeCommand } = require('../utils/adb');
const { sleep } = require('../utils/helpers');
const { deviceService } = require('./device-service');

async function extractSession(device, phoneNumber) {
  // Copier la session dans le dossier sessions local
  const sessionPath = `./sessions/${phoneNumber}/`;
  await executeCommand(device, `root`);
  await executeCommand(device, `shell mount -o rw,remount /data`);
  await sleep(2000);
  await execSync(`mkdir -p ${sessionPath}`);
  await executeCommand(device, `pull /data/data/com.whatsapp ${sessionPath}`);

  // Retourner le chemin de la session
  return sessionPath;
}


// Fonction pour importer la session dans un device
async function importSession(device, sessionPath) {
  // Fermer l'application WhatsApp
  await executeCommand(device, `shell am force-stop com.whatsapp`);

  await executeCommand(device, ` root`);
  await executeCommand(device, `shell mount -o rw,remount /data`);
  await executeCommand(device, `shell rm -rf /data/data/com.whatsapp/`);
  await executeCommand(device, `push "${sessionPath}/com.whatsapp" /data/data/`);
  await sleep(2000);

  const uidRaw = await executeCommand(device, `shell dumpsys package com.whatsapp | grep userId=`);
  const uidNum = uidRaw.match(/userId=(\d+)/)[1];
  const unixUser = `u0_a${parseInt(uidNum) - 10000}`;

  const user = unixUser;
  await executeCommand(device, `shell chown -R ${user}:${user} /data/data/com.whatsapp`);
  await executeCommand(device, `shell chmod -R 771 /data/data/com.whatsapp`);

  // Disable SELinux temporarily
  await executeCommand(device, `shell setenforce 0`);

  // Launch WhatsApp
  //await executeCommand(device, `shell monkey -p com.whatsapp -c android.intent.category.LAUNCHER 1`);
}


const sessionService = {
    extractSession,
    importSession   
}

module.exports = { sessionService };