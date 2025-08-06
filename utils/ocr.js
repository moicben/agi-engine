/**
 * OCR Utility - Fonctions utilitaires pour l'extraction de texte
 * Fonctions pures sans logique métier
 */

const Tesseract = require('tesseract.js');
const fs = require('fs');

/**
 * Valider qu'une image est utilisable pour l'OCR
 * @param {string} imagePath - Chemin vers l'image
 * @returns {Promise<boolean>}
 */
async function validateImage(imagePath) {
    try {
        const stats = fs.statSync(imagePath);
        if (stats.size < 1000) { // Image trop petite
            return false;
        }
        return true;
    } catch (error) {
        console.error('❌ Erreur validation image:', error.message);
        return false;
    }
}

/**
 * Extraire le texte brut d'une image avec Tesseract
 * @param {string} filename - Chemin vers l'image
 * @param {string} lang - Langue pour l'OCR (défaut: 'eng')
 * @returns {Promise<{success: boolean, text?: string, error?: string}>}
 */
async function extractTextFromImage(filename, lang = 'eng') {
  try {
    // Vérifier si l'image est valide
    if (!await validateImage(filename)) {
      return { success: false, error: 'Image invalide ou trop petite' };
    }
    
    // Extraire le texte avec Tesseract
    const { data: { text } } = await Tesseract.recognize(filename, lang);
    const cleanedText = text.toLowerCase().replace(/\s+/g, ' ');
    
    console.log("Texte extrait: ", cleanedText);
    return { success: true, text: cleanedText };
  } catch (error) {
    console.error('❌ Erreur OCR:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Nettoyer un fichier image temporaire
 * @param {string} filename - Chemin vers le fichier à supprimer
 */
function cleanupTempFile(filename) {
  try {
    if (fs.existsSync(filename)) {
      fs.unlinkSync(filename);
    }
  } catch (error) {
    console.error('❌ Erreur nettoyage fichier:', error.message);
  }
}

/**
 * Vérifier des mots-clés dans un texte (simple et direct)
 * @param {string} text - Texte à analyser
 * @param {string[]} accept - Mots-clés d'acceptation
 * @param {string[]} reject - Mots-clés de rejet
 * @returns {Object} - {valid, reason}
 */
function checkKeywords(text, accept = [], reject = []) {
  const lower = text.toLowerCase();
  
  // Vérifier les rejets en premier
  for (const word of reject) {
    if (lower.includes(word.toLowerCase())) {
      console.log(`❌ Rejet: "${word}"`);
      return { valid: false, reason: `Rejeté (${word})` };
    }
  }
  
  // Vérifier les acceptations
  for (const word of accept) {
    if (lower.includes(word.toLowerCase())) {
      return { valid: true, reason: `Accepté (${word})` };
    }
  }
  
  return { valid: false, reason: 'Aucun mot-clé trouvé' };
}

/**
 * Extraire le texte brut d'une image avec Tesseract (sans nettoyage)
 * @param {string} filename - Chemin vers l'image
 * @param {string} lang - Langue pour l'OCR (défaut: 'eng')
 * @returns {Promise<{success: boolean, text?: string, error?: string}>}
 */
async function extractRawTextFromImage(filename, lang = 'eng') {
  try {
    // Vérifier si l'image est valide
    if (!await validateImage(filename)) {
      return { success: false, error: 'Image invalide ou trop petite' };
    }
    
    // Extraire le texte avec Tesseract (texte brut, sans nettoyage)
    const { data: { text } } = await Tesseract.recognize(filename, lang);
    
    return { success: true, text: text };
  } catch (error) {
    console.error('❌ Erreur OCR:', error.message);
    return { success: false, error: error.message };
  }
}

// Export des fonctions utilitaires
module.exports = { 
  validateImage,
  extractTextFromImage,
  extractRawTextFromImage,
  cleanupTempFile,
  checkKeywords
};