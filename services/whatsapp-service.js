/**
 * WhatsApp Service minimaliste
 * Gère les interactions avec l'application WhatsApp
 */

const { executeCommand, takeScreenshot } = require('../utils/adb');
const { sleep, tap, press, writeContent, randomName } = require('../utils/helpers');
const { ocrService } = require('./ocr-service');
const { logger } = require('../utils/logger');

// Coordonnées UI par défaut pour WhatsApp
const UI_ELEMENTS = {
  cornerButton: { x: 1000, y: 1840 },
  agreeButton: { x: 540, y: 1660 },
  threeDotButton: { x: 1040, y: 105 },
  notificationsButton: { x: 540, y: 1050 },
  // Input Number
  countrySelector: { x: 380, y: 430 },
  searchInput: { x: 1030, y: 100 },
  countryFirstResult: { x: 540, y: 200 },
  indicatifInput: { x: 380, y: 500 },
  phoneInput: { x: 540, y: 500 },
  nextButton: { x: 540, y: 1850 },
  failedAccept: { x: 820, y: 1040 },
  wrongNumber: { x: 755, y: 340 },
  smsOptionsButton: { x: 540, y: 1550 },
  confirmSMSButton: { x: 540, y: 1805 },
  confirmButton: { x: 805, y: 1070 },
  codeInput: { x: 540, y: 415 },
  permissionsButton: { x: 655, y: 1240 },
  backupButton: { x: 655, y: 1200 },
  continueButton: { x: 540, y: 800 },
  skipButton: { x: 540, y: 1000 },
  confirmNameButton: { x: 540, y: 1730 },
  // Link Devices
  settingsButton: { x: 1040, y: 656 },
  profileButton: { x: 540, y: 250 },
  linkedDevicesOption: { x: 1040, y: 420 },
  linkDeviceButton: { x: 540, y: 630 },
  notificationBox: { x: 540, y: 150 },
  //  Branding 
  receivedImage: { x: 540, y: 1200 },
  editImageButton: { x: 540, y: 600 },
  galleryMode: { x: 350, y: 1800 },
  firstImage: { x: 120, y: 300 },
  confirmImage: { x: 900, y: 1870 },
  nameInput: { x: 540, y: 720 },
  descriptionInput: { x: 540, y: 850 },
  editDescription: { x: 540, y: 320 },
  saveEditButton: { x: 1000, y: 1840 },
  backButton: { x: 50, y: 100 }
};

/**
 * (Re ou) Setup l'application WhatsApp
 */
async function setupApp(device) {

  console.log('🔄 Setup de l\'application WhatsApp...');

  // Si application non installée, l'installer  
  const installedAppsResult = await executeCommand(device, 'shell pm list packages');
  const installedAppsRaw = installedAppsResult.stdout || installedAppsResult;
  
  if (installedAppsRaw.includes('com.whatsapp')) {
    //console.log('📦 WhatsApp déjà installé. clear des données...');

    // Forcer la fermeture de l'application
    await executeCommand(device, 'shell am force-stop com.whatsapp');
    await sleep(3000);

    // Effacer les données pour un compte propre
    await executeCommand(device, 'shell pm clear com.whatsapp');
    await sleep(3000);

    // Désinstaller l'application
    //console.log('📦 Désinstallation de WhatsApp...');
    await executeCommand(device, `uninstall com.whatsapp`);
    await sleep(3000);

  }

  // Installation de WhatsApp
  //console.log('📦 Installation de WhatsApp...');
  const apkPath = './apk/whatsapp.apk';
  await executeCommand(device, `install ${apkPath}`);
  await sleep(3000);

  // (Optionel) Choisir la langue (FR)
  // await press(device, 20, 2, 2); // TAB 2 fois
  // awai sleep(500);
  // await press(device, 66); // ESPACE
  // await sleep(5000);
  

  return true;
}

/**
 * Lancer WhatsApp sur le device
 */
async function launchApp(device) {

  // Lancer WhatsApp
  //console.log('📱 Lancement de WhatsApp...');
  await executeCommand(device, 'shell monkey -p com.whatsapp -c android.intent.category.LAUNCHER 1');
  await sleep(4000);

  // Accepter la langue par défaut
  await tap(device, UI_ELEMENTS.cornerButton.x, UI_ELEMENTS.cornerButton.y);
  await sleep(2000);
  
  // Accepter les conditions si nécessaire
  await tap(device, UI_ELEMENTS.agreeButton.x, UI_ELEMENTS.agreeButton.y);
  await sleep(2000);

  // REMOVE MODE LINKED DEVICES (OPTIONAL)
  // await tap(device, UI_ELEMENTS.threeDotButton.x, UI_ELEMENTS.threeDotButton.y);
  // await sleep(2000);

  // // Cliquer sur "Créer un nouveau compte"
  // await press(device, 20, 2); // TAB
  // await sleep(500);
  // await press(device, 66); // ESPACE
  // await sleep(2000);

  // Accepter les notifications What's App
  await tap(device, UI_ELEMENTS.notificationsButton.x, UI_ELEMENTS.notificationsButton.y);
  await sleep(2000);

  return true;
}

// Specific inputNumber per country
async function inputNewNumber(device, phoneNumber, country) {

  let cleanNumber;
  let countryName = country.toUpperCase();
  
  if (countryName === 'CANADA' || countryName === 'CA') {
    cleanNumber = phoneNumber.replace('+', '').replace(/^1/, ''); // sans le + et le premier chiffre : 1
    countryName = 'Canada';
  }
  else if (countryName === 'UK') {
    cleanNumber = phoneNumber.replace('+', '').replace(/^44/, ''); // sans le + et les 2 premiers chiffres : 44
    countryName = 'united k';
  }
  else if (countryName === 'FRANCE' || countryName === 'FR') {
    cleanNumber = phoneNumber.replace('+', '').replace(/^33/, ''); // sans le + et les 2 premiers chiffres : 33
    countryName = 'france';
  }

  // Cliquer sur le champ de sélection du pays
  await tap(device, UI_ELEMENTS.countrySelector.x, UI_ELEMENTS.countrySelector.y);
  await sleep(2000);

  // Appuyer sur l'icone de recherche
  await tap(device, UI_ELEMENTS.searchInput.x, UI_ELEMENTS.searchInput.y);
  await sleep(1500);

  // Rechercher le pays
  //console.log(`🔍 Recherche du pays: ${countryName}`);
  await executeCommand(device, `shell input text "${countryName}"`);
  await sleep(2000);

  // Sélectionner le premier résultat
  await tap(device, UI_ELEMENTS.countryFirstResult.x, UI_ELEMENTS.countryFirstResult.y);
  await sleep(2000);

  // Double clics sur le champ de saisie du numéro
  await tap(device, UI_ELEMENTS.phoneInput.x, UI_ELEMENTS.phoneInput.y);
  await sleep(250);
  await tap(device, UI_ELEMENTS.phoneInput.x, UI_ELEMENTS.phoneInput.y);
  await tap(device, UI_ELEMENTS.phoneInput.x, UI_ELEMENTS.phoneInput.y);
  await sleep(1500);

  // Saisir le numéro
  //console.log(`🔍 Saisi du numéro nettoyé: ${cleanNumber}`);
  await executeCommand(device, `shell input text "${cleanNumber}"`);
  await sleep(2000);

  // Appuyer sur "Next"
  await tap(device, UI_ELEMENTS.nextButton.x, UI_ELEMENTS.nextButton.y);
  await sleep(2000);
}

async function confirmNumber(device) {
  console.log(`📨 Demande du code SMS...`);
  // Confirmer que c'est le bon numéro
  await tap(device, UI_ELEMENTS.confirmButton.x, UI_ELEMENTS.confirmButton.y);
  await sleep(14000);
}


    /**
 * Entrer un numéro de téléphone
     */
async function inputNumber(device, phoneNumber) {
  console.log(`📞 Saisie du numéro: ${phoneNumber}`);
  
  // Nettoyer le numéro et récupérer l'indicatif
  // const cleanNumber = phoneNumber.replace(/[^\d]/g, '');
  // const countryCode = cleanNumber.slice(0, 2);
  // const onlyNumber = cleanNumber.slice(2);

  //   // Cliquer sur le champ de l'indicatif
  //   await tap(device, UI_ELEMENTS.indicatifInput.x, UI_ELEMENTS.indicatifInput.y);
  //   await sleep(1000);

  //   // Suprimer l'indicatif actuel
  //   await executeCommand(device, 'shell input keyevent 67'); // DEL
  //   await sleep(500);
  //   await executeCommand(device, 'shell input keyevent 67'); // DEL
  //   await sleep(500);

  //   // Saisir l'indicatif
  //   await executeCommand(device, `shell input text ${countryCode}`);
  //   await sleep(1000);

    // Cliquer sur le champ du numéro
    await tap(device, UI_ELEMENTS.phoneInput.x, UI_ELEMENTS.phoneInput.y);
    await sleep(500);
            
    // Effacer le champ
    await executeCommand(device, 'shell input keyevent 67'); // DEL
    await sleep(500);
            
    // Saisir le numéro
    await executeCommand(device, `shell input text "${phoneNumber}"`);
    await sleep(2000);
    
    // Cliquer sur Suivant
    await tap(device, UI_ELEMENTS.nextButton.x, UI_ELEMENTS.nextButton.y);
    await sleep(6000);

    // Confirmer le numéro
    await tap(device, UI_ELEMENTS.confirmButton.x, UI_ELEMENTS.confirmButton.y);
    await sleep(3000);

    // Ouvrir le pannel des moyens de vérification
    await press(device, 20, 3); // TAB
    await sleep(500);
    await press(device, 66); // ESPACE
    await sleep(2000);

    // Choisir l'option "SMS"
    await tap(device, UI_ELEMENTS.smsOptionsButton.x, UI_ELEMENTS.smsOptionsButton.y);
    await sleep(2000);

    // Confirmer le choix
    await tap(device, UI_ELEMENTS.confirmSMSButton.x, UI_ELEMENTS.confirmSMSButton.y);
    await sleep(4000);
  
    return true;
  }

// Confirmation du compte (si besoin)
async function confirmAccount(device) {
  console.log('🔄 Confirmation du compte...');

  // Refuser les permissions (si demandé)
  await tap(device, UI_ELEMENTS.permissionsButton.x, UI_ELEMENTS.permissionsButton.y);
  await sleep(4000);

  // Écrire un nom de compte aléatoire
  const accountName = await randomName();
  console.log(`🔍 Nom aléatoire: ${accountName}`);
  await executeCommand(device, `shell input text "${accountName}"`);
  await sleep(1500);

  // Confirmer le nom
  await tap(device, UI_ELEMENTS.confirmNameButton.x, UI_ELEMENTS.confirmNameButton.y);
  await sleep(14000);
  
  return true;
}

  /**
  * Entrer le code SMS
  */
  async function inputCode(device, code) {
    console.log(`📨 Saisie du code: ${code}`);

    // Cliquer sur le champ de code
    await tap(device, UI_ELEMENTS.codeInput.x, UI_ELEMENTS.codeInput.y);
    await sleep(1000);
            
    // Saisir le code
    await executeCommand(device, `shell input text "${code}"`);
    await sleep(2000);
    
    // WhatsApp valide automatiquement généralement
    await sleep(8000);

    return true;
  }

  // Rejeter le numéro
  async function rejectNumber(device) {

    await sleep(1500);

    // Ignorer l'erreur de numéro
    await tap(device, UI_ELEMENTS.failedAccept.x, UI_ELEMENTS.failedAccept.y);
    await sleep(1500);

    // Changer le numéro via "Wrong number"
    await tap(device, UI_ELEMENTS.wrongNumber.x, UI_ELEMENTS.wrongNumber.y);
    await sleep(1500);

    return true;
  }

  /**
 * Finaliser la création du compte
  */
async function finalizeAccount(device) {
  console.log('🏁 Finalisation du compte...');

    // Passer les écrans de configuration
    await tap(device, UI_ELEMENTS.skipButton.x, UI_ELEMENTS.skipButton.y);
    await sleep(2000);
    
    // Continuer si nécessaire
    await tap(device, UI_ELEMENTS.continueButton.x, UI_ELEMENTS.continueButton.y);
    await sleep(2000);
    
    // Entrer un nom par défaut
    await tap(device, UI_ELEMENTS.nameInput.x, UI_ELEMENTS.nameInput.y);
    await sleep(500);
    await executeCommand(device, 'shell input text "User"');
    await sleep(1000);
    
    // Valider
    await tap(device, UI_ELEMENTS.nextButton.x, UI_ELEMENTS.nextButton.y);
    await sleep(2000);

    // Refuser les permissions
    await tap(device, UI_ELEMENTS.permissionsButton.x, UI_ELEMENTS.permissionsButton.y);
    await sleep(4000);

    // Refuser les sauvegardes
    await tap(device, UI_ELEMENTS.backupButton.x, UI_ELEMENTS.backupButton.y);
    await sleep(4000);

    // Écrire un nom de compte aléatoire
    const accountName = await randomName();
    await executeCommand(device, `shell input text "${accountName}"`);
    await sleep(1000);

    // Confirmer le nom
    await tap(device, UI_ELEMENTS.confirmNameButton.x, UI_ELEMENTS.confirmNameButton.y);
    await sleep(8000);
  
  //console.log('✅ Compte WhatsApp créé avec succès');
  return true;
}

// Se rendre dans les paramètres du compte
async function goToSettings(device) {
  console.log('🔄 Navigation vers les paramètres...');
  
  // Fermer l'application WhatsApp
  //console.log('🔄 Fermeture de WhatsApp...');
  await executeCommand(device, 'shell am force-stop com.whatsapp');
  await sleep(5000);

  // Ouvrir WhatsApp (sans reset)
  //console.log('📱 Lancement de WhatsApp (sans reset)...');
  await executeCommand(device, 'shell monkey -p com.whatsapp -c android.intent.category.LAUNCHER 1');
  await sleep(5000);
  
  // 1. Cliquer sur les 3 points
  //console.log('📍 Clic sur le menu (3 points)...');
  await tap(device, UI_ELEMENTS.threeDotButton.x, UI_ELEMENTS.threeDotButton.y);
  await sleep(3000);

  // 2. Cliquer sur les paramètres
  //console.log('📱 Clic sur les paramètres...');
  await tap(device, UI_ELEMENTS.settingsButton.x, UI_ELEMENTS.settingsButton.y);
  await sleep(3000);

  // 2. Afficher le profil
  console.log('📱 Afficher le profil...');
  await tap(device, UI_ELEMENTS.profileButton.x, UI_ELEMENTS.profileButton.y);
  await sleep(3000);

  return true;
}

/** 
 * Obtenir le numéro WhatsApp du compte actif
 */
async function getPhoneNumber(device) {
  
  console.log('🔄 Récupération du numéro WhatsApp...');

  // 1. Se rendre dans les paramètres du compte
  await goToSettings(device);

  // 3. Prendre une capture d'écran du profil
  //console.log('📸 Capture de l\'écran de profil...');
  const screenshotFilename = `profile-${Date.now()}.png`;
  const screenshotPath = await takeScreenshot(device, screenshotFilename);
  await sleep(2000);

  // 4. Analyser le numéro de téléphone via OCR
  //console.log('🔍 Analyse OCR pour extraire le numéro...');
  const ocrResult = await ocrService.extractPhoneFromProfile(device);
  
  if (!ocrResult.success) {
    throw new Error(`Impossible d'extraire le numéro: ${ocrResult.error}`);
  }
  
  const phoneNumber = ocrResult.phoneNumber;
  
  //console.log(`✅ Numéro extrait: ${phoneNumber}`);
  return phoneNumber;
}

// Paramètres du compte WhatsApp
async function brandAccount(device, brand) {
  console.log('🔄 Paramètres du compte...');

  // Cliquer sur la notification reçue
  await tap(device, UI_ELEMENTS.notificationBox.x, UI_ELEMENTS.notificationBox.y);
  await sleep(5000);

  // Télécharger l'image reçue
  await tap(device, UI_ELEMENTS.receivedImage.x, UI_ELEMENTS.receivedImage.y);
  await sleep(2000);
  await tap(device, UI_ELEMENTS.receivedImage.x, UI_ELEMENTS.receivedImage.y);
  await sleep(3000);

  // Se rendre dans les paramètres du compte
  await goToSettings(device);

  // Modifier l'image de profil
  await tap(device, UI_ELEMENTS.editImageButton.x, UI_ELEMENTS.editImageButton.y);
  await sleep(3000);

  // Sélectionner la galerie
  await tap(device, UI_ELEMENTS.galleryMode.x, UI_ELEMENTS.galleryMode.y);
  await sleep(3000);

  // Sélectionner la première image
  await tap(device, UI_ELEMENTS.firstImage.x, UI_ELEMENTS.firstImage.y);
  await sleep(4000);

  // Confirmer l'image
  await tap(device, UI_ELEMENTS.confirmImage.x, UI_ELEMENTS.confirmImage.y);
  await sleep(3000);

  // Modifier le nom 
  await tap(device, UI_ELEMENTS.nameInput.x, UI_ELEMENTS.nameInput.y);
  await sleep(3000);

  // Effacer le nom
  await press(device, 67, 25); // SUPPRIMER 25 FOIS
  await sleep(500);
  await writeContent(device, brand.name);
  await sleep(1000);

  // Sauvegarder le nom
  await tap(device, UI_ELEMENTS.saveEditButton.x, UI_ELEMENTS.saveEditButton.y);
  await sleep(3000);

  // Modifier la description 
  await tap(device, UI_ELEMENTS.descriptionInput.x, UI_ELEMENTS.descriptionInput.y);
  await sleep(3000);

  // Modifier la description 
  await tap(device, UI_ELEMENTS.editDescription.x, UI_ELEMENTS.editDescription.y);
  await sleep(3000);
  await writeContent(device, brand.description);
  await sleep(1000);

  // Enregistrer les modifications
  await tap(device, UI_ELEMENTS.saveEditButton.x, UI_ELEMENTS.saveEditButton.y);
  await sleep(3000);

  // Retourner au menu principal
  await tap(device, UI_ELEMENTS.backButton.x, UI_ELEMENTS.backButton.y);
  await sleep(1000);
  await tap(device, UI_ELEMENTS.backButton.x, UI_ELEMENTS.backButton.y);
  await sleep(1000);
  await tap(device, UI_ELEMENTS.backButton.x, UI_ELEMENTS.backButton.y);
  await sleep(1000);


  return true;
}

/** 
 * Scan du QR pour ajouter un Linked Device
 */
async function linkDevice(device) {
  console.log('🔗 Navigation vers Linked Devices...');
  
  try {

    // 1. Récupérer numéro WhatsApp du compte actif
    const phoneNumber = await getPhoneNumber(device);
    const sessionId = device.port.toString();
    //console.log('📱 Session ID:', sessionId);
    await sleep(1000);
    
    // 2. Requête API locale WA Sender
    //console.log('📡 Connexion à l\'API WA Sender...');
    try {
      const response = await fetch('http://localhost:3000/api/whatsapp/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sessionId: sessionId,
          phoneNumber: phoneNumber
        })
      });

      if (!response.ok) {
        throw new Error(`Erreur API: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      //console.log('✅ Réponse API:', data);

      const code = data.verificationCode;
      //console.log('📱 Code:', code);
      
      await sleep(5000);
      await inputLinkCode(device, code);
      
      return {
        success: true,
        phoneNumber: phoneNumber,
        message: 'WhatsApp est prêt pour scanner un QR code',
        apiResponse: data
      };

    } catch (apiError) {
      console.error('❌ Erreur API WA Sender:', apiError.message);
      // Continuer même si l'API échoue
      return {
        success: false,
        phoneNumber: phoneNumber,
        message: 'Numéro extrait mais erreur API',
        error: apiError.message
      };
    }
    
  } catch (error) {
    console.error('❌ Erreur lors de la navigation vers Linked Devices:', error.message);
    throw error;
  }
}

/**
 * Entrer le code de connexion depuis la notification
 */
async function inputLinkCode(device, code) {
  console.log('🔗 Entrer le code de connexion depuis la notification...');
  
  try {

    // 1. Afficher le menu des notifs du device
    //console.log('📱 Afficher le menu des notifications...');
    
    // Presser un clic tout en haut de l'écran (x: 540, y: 100), slider de 200 pixels vers le bas et le relacher
    await executeCommand(device, 'shell input swipe 540 10 540 600 600');
    await sleep(4000);

    // 1. Cliquer sur la notification de connexion
    //console.log('📱 Clic sur la notification de connexion...');
    await tap(device, UI_ELEMENTS.notificationBox.x, UI_ELEMENTS.notificationBox.y);
    await sleep(4000);

    // 2. Confirmer la connexion
    //console.log('📱 Confirmer la connexion...');
    await tap(device, UI_ELEMENTS.nextButton.x, UI_ELEMENTS.nextButton.y);
    await sleep(4000);

    // 3. Entrer le code
    //console.log('📱 Entrer le code...');
    await executeCommand(device, `shell input text "${code}"`);
    
    //console.log('🔄 Code saisi, attendre 8 secondes...');
    await sleep(8000);
    
    
  } catch (error) {
    console.error('❌ Erreur scan QR:', error.message);
    throw error;
  }
}


const whatsappService = {
  setupApp,
  launchApp,
  inputNewNumber,
  confirmNumber,
  inputNumber,
  inputCode,
  rejectNumber,
  finalizeAccount,
  confirmAccount,
  linkDevice,     
  inputLinkCode,  
}

module.exports = { whatsappService };