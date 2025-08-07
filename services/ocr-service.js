// Service OCR - Configuration métier par étapes

const { extractTextFromImage, extractRawTextFromImage, cleanupTempFile, checkKeywords } = require('../utils/ocr');
const { deviceService } = require('./device-service');


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
    const filename = await deviceService.takeScreenshot(device);
    return analyzeScreenshot(filename);
} 

async function checkWhatsAppStatus(device) {
    try {
        const filename = await deviceService.takeScreenshot(device);
        const result = await extractTextFromImage(filename);
        if (!result.success) return false;
        
        const check = checkKeywords(result.text, [], KEYWORDS.whatsappStatus.reject);
        return check.valid; // valid = true si aucun rejet trouvé
    } catch (error) {
        return false;
    } finally {
        cleanupTempFile(filename);
    }
}

async function extractPhoneFromProfile(device) {
    try {
        const filename = await deviceService.takeScreenshot(device);
        const result = await extractRawTextFromImage(filename);
        if (!result.success) return { success: false, error: result.error };
        
        // Simple regex pour numéro +XXXXXXXXXXX
        const match = result.text.match(/\+\d{10,15}/);
        return match ? 
            { success: true, phoneNumber: match[0] } : 
            { success: false, error: 'Pas de numéro trouvé' };
    } catch (error) {
        return { success: false, error: error.message };
    } finally {
        cleanupTempFile(filename);
    }
}

const ocrService = {
    checkSubmission,
    checkWhatsAppStatus,
    extractPhoneFromProfile
}

module.exports = { ocrService };