// Utilitaires pour les commandes ADB

import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

const execAsync = promisify(exec);

// Exécuter une commande ADB
async function executeCommand(device, command) {
    try {
        const fullCommand = `adb -s ${device} ${command}`;
        const { stdout, stderr } = await execAsync(fullCommand);
        
        if (stderr && !stderr.includes('Warning')) {
            //console.warn(`⚠️ ADB Warning: ${stderr}`);
        }
        
        return stdout.trim();
    } catch (error) {
        console.error(`❌ Erreur ADB: ${error.message}`);
        throw error;
    }
}


// Prendre un screenshot
async function takeScreenshot(device, filename) {
    try {
        const screenshotPath = path.join(__dirname, '..', 'screenshots');
        //const filename = `screenshot_${Date.now()}.png`;
        //const filename = `screenshot.png`;

        // Créer le dossier screenshots s'il n'existe pas
        if (!fs.existsSync(screenshotPath)) {
            fs.mkdirSync(screenshotPath, { recursive: true });
        }
        
        const fullPath = path.join(screenshotPath, filename);
        
        // Prendre le screenshot sur le device
        await executeCommand(device, `root`);
        await executeCommand(device, `shell screencap -p /sdcard/${filename}`);
        
        // Télécharger le screenshot
        await executeCommand(device, `pull /sdcard/${filename} "${fullPath}"`);
        
        // Nettoyer le screenshot sur le device
        await executeCommand(device, `shell rm /sdcard/${filename}`);
        
        //console.log(`📸 Screenshot sauvegardé: ${filename}`);
        return fullPath;
    } catch (error) {
        console.error(`❌ Erreur lors du screenshot:`, error.message);
        throw error;
    }
}

// Taper du texte
async function inputText(device, text) {
    try {
        // Échapper les caractères spéciaux pour ADB
        const escapedText = text
            .replace(/\\/g, '\\\\')
            .replace(/"/g, '\\"')
            .replace(/'/g, "\\'")
            .replace(/\(/g, '\\(')
            .replace(/\)/g, '\\)')
            .replace(/ /g, '\\ ');
        
        await executeCommand(device, `shell input text "${escapedText}"`);
    } catch (error) {
        console.error(`❌ Erreur lors de la saisie de texte:`, error.message);
        throw error;
    }
}

// Appuyer sur une touche
async function keyEvent(device, keyCode) {
    try {
        await executeCommand(device, `shell input keyevent ${keyCode}`);
    } catch (error) {
        console.error(`❌ Erreur lors de l'appui sur la touche ${keyCode}:`, error.message);
        throw error;
    }
}

// Taper aux coordonnées
async function tap(device, x, y) {
    try {
        await executeCommand(device, `shell input tap ${x} ${y}`);
    } catch (error) {
        console.error(`❌ Erreur lors du tap (${x}, ${y}):`, error.message);
        throw error;
    }
}

// Swipe
async function swipe(device, x1, y1, x2, y2, duration = 300) {
    try {
        await executeCommand(device, `shell input swipe ${x1} ${y1} ${x2} ${y2} ${duration}`);
    } catch (error) {
        console.error(`❌ Erreur lors du swipe:`, error.message);
        throw error;
    }
}

// Ouvrir une application
async function openApp(device, packageName) {
    try {
        await executeCommand(device, `shell monkey -p ${packageName} -c android.intent.category.LAUNCHER 1`);
    } catch (error) {
        console.error(`❌ Erreur lors de l'ouverture de l'app ${packageName}:`, error.message);
        throw error;
    }
}

// Fermer une application
async function closeApp(device, packageName) {
    try {
        await executeCommand(device, `shell am force-stop ${packageName}`);
    } catch (error) {
        console.error(`❌ Erreur lors de la fermeture de l'app ${packageName}:`, error.message);
        throw error;
    }
}

// Vérifier si une application est installée
async function isAppInstalled(device, packageName) {
    try {
        const result = await executeCommand(device, `shell pm list packages ${packageName}`);
        return result.includes(packageName);
    } catch (error) {
        console.error(`❌ Erreur lors de la vérification de l'app ${packageName}:`, error.message);
        return false;
    }
}

// Installer une APK
async function installApk(device, apkPath) {
    try {
        console.log(`📦 Installation de ${apkPath}...`);
        await executeCommand(device, `install "${apkPath}"`);
        console.log(`✅ APK installée: ${apkPath}`);
    } catch (error) {
        console.error(`❌ Erreur lors de l'installation de ${apkPath}:`, error.message);
        throw error;
    }
}

// Obtenir les informations du device
async function getDeviceInfo(device) {
    try {
        const model = await executeCommand(device, 'shell getprop ro.product.model');
        const version = await executeCommand(device, 'shell getprop ro.build.version.release');
        const sdk = await executeCommand(device, 'shell getprop ro.build.version.sdk');
        
        return {
            model: model.trim(),
            version: version.trim(),
            sdk: sdk.trim()
        };
    } catch (error) {
        console.error(`❌ Erreur lors de la récupération des infos du device:`, error.message);
        return null;
    }
}

// Lister les devices connectés
async function listDevices() {
    try {
        const result = await execAsync('adb devices');
        const lines = result.stdout.split('\n');
        const devices = [];
        
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line && line.includes('device')) {
                const deviceId = line.split('\t')[0];
                devices.push(deviceId);
            }
        }
        
        return devices;
    } catch (error) {
        console.error(`❌ Erreur lors de la liste des devices:`, error.message);
        return [];
    }
}

// Redémarrer ADB server
async function restartAdbServer() {
    try {
        console.log('🔄 Redémarrage du serveur ADB...');
        await execAsync('adb kill-server');
        await execAsync('adb start-server');
        console.log('✅ Serveur ADB redémarré');
    } catch (error) {
        console.error(`❌ Erreur lors du redémarrage ADB:`, error.message);
        throw error;
    }
}

export {
    executeCommand,
    listDevices,
    takeScreenshot,
    inputText,
    keyEvent,
    tap,
    swipe,
    openApp,
    closeApp,
    isAppInstalled,
    installApk,
    getDeviceInfo,
    restartAdbServer
};
