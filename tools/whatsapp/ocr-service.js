// Service OCR - Configuration métier par étapes

import { extractTextFromImage, extractRawTextFromImage, cleanupTempFile, checkKeywords } from '../ocr.js';
import { takeScreenshot } from './adb.js';
import { sleep } from './helpers.js';

/**
 * Analyser une capture pour vérification SMS
 */
async function analyzeScreenshot(filename, options = {}) {
  try {
    const result = await extractTextFromImage(filename);
    
    // Vérification des différents cas de figure
    if (result === false) return { status: 'failed', text: '', reason: result.error };
    if (result.text.includes('contacts and media')) return { status: 'to confirm', text: result.text};
    if (result.text.includes('code sent')) return { status: 'success', text: result.text};
    if (result.text.includes(['can\'t receive', 'couldn\'t send', 'Wait before', 'recently.'])) return { status: 'rejected', text: result.text};
    if (result.text.includes('sending code', 'connecting...')) return { status: 'frozen', text: result.text};
    return { status: 'failed', text: result.text};
  } catch (error) {
    return { status: 'failed', text: '', reason: 'Erreur analyse' };
  } finally {
    cleanupTempFile(filename);
  }
}

/**
 * Étapes spécifiques avec capture automatique
 */
async function checkSubmission(device) {
    const filename = await takeScreenshot(device, `submission_${Date.now()}.png`);
    return analyzeScreenshot(filename);
} 

async function checkWhatsAppStatus(device) {
    let filename;
    try {
        filename = await takeScreenshot(device, `status_${Date.now()}.png`);
        const result = await extractTextFromImage(filename);
        if (!result.success) return false;
        
        // TODO: Définir KEYWORDS.whatsappStatus.reject ou utiliser une autre méthode
        // const check = checkKeywords(result.text, [], KEYWORDS.whatsappStatus.reject);
        // return check.valid; // valid = true si aucun rejet trouvé
        return true; // Retourner true par défaut pour l'instant
    } catch (error) {
        return false;
    } finally {
        if (filename) {
            cleanupTempFile(filename);
        }
    }
}

async function extractPhoneFromProfile(device, retryCount = 0) {
    let filename;
    try {
        filename = await takeScreenshot(device, `phone_${Date.now()}.png`);
        const result = await extractRawTextFromImage(filename);
        if (!result.success) return { success: false, error: result.error };
        
        // Regex CANADA améliorée pour numéros avec différents formats
        // Chercher les différents formats de numéros
        const phoneRegex = [/\+\d{1,3}[\s\-\(\)]*\d{3,4}[\s\-\(\)]*\d{3,4}[\s\-\(\)]*\d{4}/, /\+\d{10,15}/];
        
        // Chercher le numéro dans le texte
        const match = result.text.match(phoneRegex[0]);
        const simpleMatch = result.text.match(phoneRegex[1]);
        

        //console.log(result.text);
        if (match || simpleMatch) {
            // Nettoyer le numéro trouvé (enlever espaces, parenthèses, tirets)
            const cleanNumber = match ? match[0].replace(/[\s\-\(\)]/g, '') : simpleMatch[0].replace(/[\s\-\(\)]/g, '');
            console.log("Numéro trouvé: ", cleanNumber);
            return { success: true, phoneNumber: cleanNumber };
        
        } else {
            // Relancer le workflow, max 3 tentatives au total
            if (retryCount < 2) { // 2 retries = 3 tentatives au total
                console.log(`❌ Pas de numéro trouvé, tentative ${retryCount + 2}/3`);
                await sleep(1000);
                return await extractPhoneFromProfile(device, retryCount + 1);
            } else {
                console.error("❌ Pas de numéro trouvé après 3 tentatives");
                return { success: false, error: 'Pas de numéro trouvé après 3 tentatives' };
            }
        }
    } catch (error) {
        return { success: false, error: error.message };
    } finally {
        if (filename) {
            cleanupTempFile(filename);
        }
    }
}


async function extractTransferCode(device, retryCount = 0) {
    let filename;
    try {
        filename = await takeScreenshot(device, `transfer_${Date.now()}.png`);
        const result = await extractRawTextFromImage(filename);
        if (!result.success) return { success: false, error: result.error };
        
        //Regex code à 6 chiffres avec un tiret au milieu
        const match = result.text.match(/(\d{3}-\d{3})/);
        
        if (match) {
            console.log("Code de transfert trouvé:", match[0]);
            return { success: true, code: match[0] };
        } else {
            // Relancer le workflow, max 3 tentatives au total
            if (retryCount < 2) { // 2 retries = 3 tentatives au total
                console.log(`❌ Pas de code de transfert trouvé, tentative ${retryCount + 2}/3`);
                await sleep(2000); // Attendre un peu plus longtemps pour les notifications
                return await extractTransferCode(device, retryCount + 1);
            } else {
                console.error("❌ Pas de code de transfert trouvé après 3 tentatives");
                return { success: false, error: 'Pas de code de transfert trouvé après 3 tentatives' };
            }
        }
    } catch (error) {
        return { success: false, error: error.message };
    } finally {
        if (filename) {
            cleanupTempFile(filename);
        }
    }
}

async function getSettingsPosition(device) {
    let filename;
    try {
        await sleep(500);
        filename = await takeScreenshot(device, `settings_${Date.now()}.png`);
        const result = await extractRawTextFromImage(filename);
        //console.log("OCR result: ", result.text);
        // Détecter si texte "Read all"
        if (result.text.includes('Read all')) {
            return { x: 940, y: 800 };
        }
        else {
            return { x: 940, y: 700 };
        }

    } catch (error) {
        return { x: 940, y: 700 };
    } finally {
        if (filename) {     
            cleanupTempFile(filename);
        }
    }
}

// Vérifier si le numéro affiché appartient à WhatsApp avec polling rapide (<=6s)
async function isPhoneWhatsApp(imagePath, options = {}) {
    const { device, maxMs = 6000, interval = 500 } = options;

    // Cas 1: vérification simple d'une image déjà fournie
    if (imagePath && !device) {
        try {
            const result = await extractRawTextFromImage(imagePath);
            if (!result.success) return true; // permissif par défaut
            const text = (result.text || '').toLowerCase();
            if (text.includes('today')) return true; // inscrit
            if (text.includes("isn't on" || "try again" || "not on" || "Couldn't")) return false; // non inscrit
            return true;
        } catch (_) {
            return true;
        } finally {
            try { cleanupTempFile(imagePath); } catch {}
        }
    }

    // Cas 2: polling avec captures successives jusqu'à 6s
    if (device) {
        const deadline = Date.now() + maxMs;
        while (Date.now() < deadline) {
            let filename;
            try {
                filename = await takeScreenshot(device, `send-check-${Date.now()}.png`);
                const result = await extractRawTextFromImage(filename);
                const text = (result?.text || '').toLowerCase();
                console.log(`🔄 isPhoneWhatsApp refresh:`, text.slice(0, 120));
                if (text.includes('®@ message')) return true; // inscrit
                if (text.includes("isn't on")) return false; // non inscrit
            } catch (_) {
                // ignorer et continuer jusqu'au timeout
            } finally {
                if (filename) {
                    try { cleanupTempFile(filename); } catch {}
                }
            }
            await new Promise(r => setTimeout(r, interval));
        }
        // Timeout -> état permissif (considéré inscrit pour ne pas bloquer)
        return true;
    }

    // Cas par défaut
    return true;
}

const ocrService = {
    checkSubmission,
    checkWhatsAppStatus,
    extractPhoneFromProfile,
    extractTransferCode,
    getSettingsPosition,
    isPhoneWhatsApp
}
export { ocrService };