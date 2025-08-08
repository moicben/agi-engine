// Service OCR - Configuration métier par étapes

const { extractTextFromImage, extractRawTextFromImage, cleanupTempFile, checkKeywords } = require('../utils/ocr');
const { takeScreenshot } = require('../utils/adb');
const { sleep } = require('../utils/helpers');


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
    if (result.text.includes(['can\'t receive', 'couldn\'t send'])) return { status: 'rejected', text: result.text};
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

async function extractPhoneFromProfile(device) {
    let filename;
    try {
        filename = await takeScreenshot(device, `phone_${Date.now()}.png`);
        const result = await extractRawTextFromImage(filename);
        if (!result.success) return { success: false, error: result.error };
        
        // Regex CANADA améliorée pour numéros avec différents formats
        // Cherche: +1 (519) 609-1619, +15196091619, +1-519-609-1619, etc.
        const phoneRegex = /\+\d{1,3}[\s\-\(\)]*\d{3,4}[\s\-\(\)]*\d{3,4}[\s\-\(\)]*\d{4}/;
        const match = result.text.match(phoneRegex);
        //console.log(result.text);
        if (match) {
            // Nettoyer le numéro trouvé (enlever espaces, parenthèses, tirets)
            const cleanNumber = match[0].replace(/[\s\-\(\)]/g, '');
            console.log("Numéro trouvé: ", cleanNumber);
            return { success: true, phoneNumber: cleanNumber };
        
        } else {
            // Essayer aussi la regex simple comme fallback
            const simpleMatch = result.text.match(/\+\d{10,15}/);
            return simpleMatch ? 
                { success: true, phoneNumber: simpleMatch[0] } : 
                { success: false, error: 'Pas de numéro trouvé' };
        }
    } catch (error) {
        return { success: false, error: error.message };
    } finally {
        if (filename) {
            cleanupTempFile(filename);
        }
    }
}


async function extractTransferCode(device) {
    let filename;
    try {
        filename = await takeScreenshot(device, `transfer_${Date.now()}.png`);
        const result = await extractRawTextFromImage(filename);
        if (!result.success) return { success: false, error: result.error };
        
        //Regex code à 6 chiffres avec un tiret au milieu
        const match = result.text.match(/(\d{3}-\d{3})/);
        return match ? 
            { success: true, code: match[0] } : 
            { success: false, error: 'Pas de code trouvé' };
    } catch (error) {
        return { success: false, error: error.message };
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

const ocrService = {
    checkSubmission,
    checkWhatsAppStatus,
    extractPhoneFromProfile,
    extractTransferCode,
    getSettingsPosition
}



module.exports = { ocrService };