export class PassportDataService {
  
  // Extraire et formater l'adresse du passeport
  static getPassportAddress(passportData) {
    const analysis = passportData.analysis;
    
    // Utiliser l'adresse réelle du passeport si disponible
    if (analysis.rue && analysis.ville) {
      return {
        address: analysis.rue,
        city: analysis.ville,
        postal: analysis.codePostal || this.generateRandomPostalCode(analysis.ville)
      };
    }
    
    // Si pas d'adresse complète, utiliser la ville du passeport avec une adresse générée
    if (analysis.ville) {
      const streetNumber = Math.floor(Math.random() * 200) + 1;
      const streets = [
        'Rue de la Paix', 'Avenue des Champs-Élysées', 'Boulevard Saint-Germain',
        'Rue du Faubourg Saint-Honoré', 'Place de la République', 'Rue de Rivoli'
      ];
      const street = streets[Math.floor(Math.random() * streets.length)];
      
      return {
        address: `${streetNumber} ${street}`,
        city: analysis.ville,
        postal: analysis.codePostal || this.generateRandomPostalCode(analysis.ville)
      };
    }
    
    // Fallback: générer une adresse complètement aléatoire
    return this.generateFrenchAddress();
  }

  // Générer un code postal basé sur la ville
  static generateRandomPostalCode(city) {
    const cityPostalMapping = {
      'PARIS': ['75001', '75002', '75003', '75004', '75005'][Math.floor(Math.random() * 5)],
      'LYON': '69001',
      'MARSEILLE': '13001',
      'TOULOUSE': '31000',
      'NICE': '06000',
      'NANTES': '44000',
      'STRASBOURG': '67000',
      'MONTPELLIER': '34000',
      'BORDEAUX': '33000',
      'LILLE': '59000',
      'BESANCON': '25000',
      'GRENOBLE': '38100',
      'NIMES': '30000',
      'RENNES': '35000'
    };
    
    const upperCity = city?.toUpperCase() || 'PARIS';
    return cityPostalMapping[upperCity] || `${Math.floor(Math.random() * 90000) + 10000}`;
  }

  // Générer une adresse française aléatoire (fallback)
  static generateFrenchAddress() {
    const streets = [
      'Rue de la Paix', 'Avenue des Champs-Élysées', 'Boulevard Saint-Germain',
      'Rue du Faubourg Saint-Honoré', 'Place de la République', 'Rue de Rivoli',
      'Avenue de la République', 'Rue de la Liberté', 'Boulevard Voltaire'
    ];
    const cities = [
      { name: 'PARIS', postal: '75001' },
      { name: 'LYON', postal: '69001' },
      { name: 'MARSEILLE', postal: '13001' },
      { name: 'TOULOUSE', postal: '31000' },
      { name: 'NICE', postal: '06000' }
    ];
    
    const streetNumber = Math.floor(Math.random() * 200) + 1;
    const street = streets[Math.floor(Math.random() * streets.length)];
    const city = cities[Math.floor(Math.random() * cities.length)];
    
    return {
      address: `${streetNumber} ${street}`,
      city: city.name,
      postal: city.postal
    };
  }

  // Générer un numéro de téléphone français
  static generateFrenchPhone() {
    const prefixes = ['06', '07'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const number = Math.floor(Math.random() * 90000000) + 10000000;
    return `${prefix}${number.toString().padStart(8, '0')}`;
  }

  // Formater la date de naissance pour Bricks (DD/MM/YYYY)
  static formatBirthDate(dateString) {
    if (!dateString) return '';
    
    // Gestion de différents formats de date
    if (dateString.includes('/')) {
      // Format déjà DD/MM/YYYY
      return dateString;
    } else if (dateString.includes('-')) {
      // Format YYYY-MM-DD
      const [year, month, day] = dateString.split('-');
      return `${day}/${month}/${year}`;
    } else if (dateString.includes(' ')) {
      // Format "DD MM YYYY" (format GPT)
      const parts = dateString.trim().split(/\s+/);
      if (parts.length === 3) {
        const [day, month, year] = parts;
        return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
      }
    }
    
    // Si aucun format reconnu, retourner tel quel
    return dateString;
  }

  // Préparer toutes les données pour la création de compte
  static async prepareAccountData(passportData) {
    const analysis = passportData.analysis;
    
    // Générer les données de base
    const { address, city, postal } = this.getPassportAddress(passportData);
    const phone = this.generateFrenchPhone();
    const birth = this.formatBirthDate(analysis.birthDate);
    const birthPlace = analysis.birthPlace || 'PARIS';
    
    return {
      firstName: analysis.firstGivenName,
      lastName: analysis.surname,
      gender: analysis.sex,
      birthDate: birth,
      birthPlace: birthPlace,
      phone: phone,
      address: { address, city, postal },
      passportFilename: passportData.newFilename,
      passportData: passportData
    };
  }

  // Valider les données du passeport
  static validatePassportData(passportData) {
    const analysis = passportData.analysis;
    const required = ['firstGivenName', 'surname', 'sex', 'birthDate'];
    
    for (const field of required) {
      if (!analysis[field]) {
        throw new Error(`Données passeport incomplètes: ${field} manquant`);
      }
    }

    // Vérifier que le fichier image existe
    if (!passportData.newFilename) {
      throw new Error('Nom de fichier passeport manquant');
    }

    return true;
  }

  // Nettoyer et normaliser les données
  static normalizePassportData(passportData) {
    const analysis = passportData.analysis;
    
    // Nettoyer les noms (supprimer espaces en trop, mettre en forme)
    if (analysis.firstGivenName) {
      analysis.firstGivenName = analysis.firstGivenName.trim();
    }
    
    if (analysis.surname) {
      analysis.surname = analysis.surname.trim();
    }

    // Normaliser le sexe
    if (analysis.sex) {
      analysis.sex = analysis.sex.toUpperCase();
      if (!['M', 'F'].includes(analysis.sex)) {
        console.warn(`Sexe invalide: ${analysis.sex}, défaut: M`);
        analysis.sex = 'M';
      }
    }

    // Nettoyer la ville
    if (analysis.ville) {
      analysis.ville = analysis.ville.trim().toUpperCase();
    }

    return passportData;
  }
}
