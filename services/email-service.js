import { getRandomDomain } from '../../utils/getRandomDomain.js';
import { AccountsService } from '../config/supabase.js';

export class EmailService {
  
  // Vérifier si un email est valide (format)
  static isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Nettoyer un nom pour l'email (supprimer caractères spéciaux)
  static cleanNameForEmail(name) {
    return name
      .toLowerCase()
      .replace(/[àáâãäå]/g, 'a')
      .replace(/[èéêë]/g, 'e')
      .replace(/[ìíîï]/g, 'i')
      .replace(/[òóôõö]/g, 'o')
      .replace(/[ùúûü]/g, 'u')
      .replace(/[ÿý]/g, 'y')
      .replace(/[ñ]/g, 'n')
      .replace(/[ç]/g, 'c')
      .replace(/[^a-z0-9]/g, '') // Supprimer tous les caractères spéciaux
      .substring(0, 20); // Limiter la longueur
  }
  // Générer un email unique basé sur les données du passeport
  static async generateUniqueEmail(passportData, accountsService) {
    const firstName = this.cleanNameForEmail(passportData.analysis.firstGivenName);
    const lastName = this.cleanNameForEmail(passportData.analysis.surname);
    
    let attempts = 0;
    const maxAttempts = 5;
    
    while (attempts < maxAttempts) {
      let emailPrefix;
      
      if (attempts === 0) {
        // Première tentative: prenom.nom
        emailPrefix = `${firstName}.${lastName}`;
      } else if (attempts === 1) {
        // Deuxième tentative: prenom_nom
        emailPrefix = `${firstName}_${lastName}`;
      } else if (attempts === 2) {
        // Troisième tentative: prenomnom
        emailPrefix = `${firstName}${lastName}`;
      } else {
        // Tentatives suivantes: ajouter des chiffres
        const randomNum = Math.floor(Math.random() * 9999);
        emailPrefix = `${firstName}${lastName}${randomNum}`;
      }

      const domain = await getRandomDomain();
      const email = `${emailPrefix}${domain}`;
      
      // Vérifier que l'email est valide
      if (!this.isValidEmail(email)) {
        console.log(`⚠️ Email invalide généré: ${email}, tentative suivante...`);
        attempts++;
        continue;
      }      // Vérifier que l'email n'existe pas déjà en base
      const exists = await accountsService.emailExists(email);
      
      if (!exists) {
        console.log(`✅ Email unique généré: ${email}`);
        return email;
      }
      
      console.log(`⚠️ Email déjà existant: ${email}, tentative ${attempts + 1}/${maxAttempts}`);
      attempts++;
    }
    
    throw new Error(`Impossible de générer un email unique après ${maxAttempts} tentatives`);
  }
  // Valider un email avant utilisation
  static async validateEmailForUse(email, accountsService) {
    // Vérifier le format
    if (!this.isValidEmail(email)) {
      throw new Error(`Format d'email invalide: ${email}`);
    }

    // Vérifier l'unicité en base
    const exists = await accountsService.emailExists(email);
    if (exists) {
      throw new Error(`Email déjà existant en base: ${email}`);
    }

    return true;
  }

  // Générer plusieurs emails de test
  static async generateTestEmails(passportData, count = 3) {
    const emails = [];
    
    for (let i = 0; i < count; i++) {
      try {
        const email = await this.generateUniqueEmail(passportData);
        emails.push(email);
      } catch (error) {
        console.error(`Erreur génération email ${i + 1}:`, error.message);
      }
    }
    
    return emails;
  }
}
