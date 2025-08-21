const { CONFIG } = require('./config');

class PhoneExtractor {
  constructor() {
    this.patterns = CONFIG.PHONE_PATTERNS;
    this.extractedPhones = new Set();
  }

  // Extraire les numéros de téléphone du texte
  extractPhones(text) {
    const phones = [];
    
    if (!text) return phones;
    
    this.patterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        phones.push(...matches);
      }
    });
    
    return phones;
  }

  // Nettoyer et normaliser les numéros
  normalizePhone(phone) {
    if (!phone) return null;
    
    // Supprimer tous les caractères non-numériques sauf le +
    let normalized = phone.replace(/[^\d+]/g, '');
    
    // Convertir +33 en 0
    if (normalized.startsWith('+33')) {
      normalized = '0' + normalized.substring(3);
    }
    
    // Vérifier que c'est un numéro français valide
    if (this.isValidFrenchPhone(normalized)) {
      return normalized;
    }
    
    return null;
  }

  // Vérifier si c'est un numéro français valide
  isValidFrenchPhone(phone) {
    // Numéro français : 10 chiffres commençant par 0
    const frenchPhonePattern = /^0[1-9]\d{8}$/;
    return frenchPhonePattern.test(phone);
  }

  // Extraire et normaliser les numéros d'un texte
  extractAndNormalize(text) {
    const rawPhones = this.extractPhones(text);
    const normalizedPhones = [];
    
    rawPhones.forEach(phone => {
      const normalized = this.normalizePhone(phone);
      if (normalized && !this.extractedPhones.has(normalized)) {
        this.extractedPhones.add(normalized);
        normalizedPhones.push({
          raw: phone,
          normalized: normalized,
          isValid: true
        });
      }
    });
    
    return normalizedPhones;
  }

  // Obtenir les statistiques d'extraction
  getStats() {
    return {
      totalExtracted: this.extractedPhones.size,
      uniquePhones: Array.from(this.extractedPhones)
    };
  }

  // Réinitialiser l'extracteur
  reset() {
    this.extractedPhones.clear();
  }

  // Vérifier si un numéro a déjà été extrait
  hasPhone(phone) {
    const normalized = this.normalizePhone(phone);
    return this.extractedPhones.has(normalized);
  }

  // Ajouter un numéro manuellement
  addPhone(phone) {
    const normalized = this.normalizePhone(phone);
    if (normalized) {
      this.extractedPhones.add(normalized);
      return normalized;
    }
    return null;
  }

  // Valider un lot de numéros
  validatePhones(phones) {
    return phones.map(phone => ({
      phone: phone,
      normalized: this.normalizePhone(phone),
      isValid: this.isValidFrenchPhone(this.normalizePhone(phone))
    }));
  }
}

module.exports = PhoneExtractor; 