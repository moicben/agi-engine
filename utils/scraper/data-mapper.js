/**
 * Data Mapper - Transforme les données Google en format Lead
 */

class DataMapper {
  constructor() {
    this.titleKeywords = {
      // Mots-clés pour extraire les titres/professions
      titles: [
        'assistante', 'secrétaire', 'assistant', 'secretary',
        'gestionnaire', 'coordinatrice', 'responsable',
        'aide', 'collaboratrice', 'employee'
      ],
      // Spécialisations
      specializations: [
        'virtuelle', 'administrative', 'commerciale', 'juridique',
        'comptable', 'médicale', 'direction', 'executive',
        'freelance', 'indépendante', 'remote'
      ]
    };
    
    this.companyKeywords = [
      'sarl', 'sas', 'eurl', 'sasu', 'sa', 'snc',
      'auto-entrepreneur', 'micro-entreprise', 'entreprise',
      'société', 'cabinet', 'bureau', 'agence', 'studio'
    ];
  }

  // Transformer les données du scraper en format Lead
  transformGoogleResult(googleResult, sourceInfo) {
    try {
      const { title, snippet, link } = googleResult; // CORRECTION : link au lieu de url
      const { source, term, query, city } = sourceInfo; // AJOUT : extraire query
      
      // Extraire les informations de base
      const extractedInfo = this.extractBasicInfo(title, snippet);
      
      // Construire l'objet Lead
      const leadData = {
        // Données de contact (phone sera ajouté par le scraper)
        phone: null, // Sera défini par le scraper
        email: this.extractEmail(snippet),
        
        // Informations personnelles
        first_name: extractedInfo.firstName,
        last_name: extractedInfo.lastName,
        company: extractedInfo.company,
        title: extractedInfo.title,
        city: city,
        
        // Données source - CORRECTION ICI
        source_type: 'google_search',
        source_platform: this.extractSourcePlatform(source), // Utiliser source au lieu de url
        source_title: title,
        source_description: snippet,
        source_url: link, // CORRECTION : link au lieu de url
        source_query: term,
        
        // Métadonnées
        status: 'new',
        quality_score: 0, // Sera calculé par le LeadManager
        notes: query, // AJOUT : Stocker la query complète dans notes
        
        // Données étendues
        additional_data: {
          original_title: title,
          snippet: snippet,
          search_term: term,
          source_site: source,
          extracted_at: new Date().toISOString(),
          text_analysis: this.analyzeText(title, snippet)
        }
      };
      
      return leadData;
      
    } catch (error) {
      console.error('❌ Erreur transformation Google result:', error.message);
      return null;
    }
  }

  // Extraire les informations de base du titre et snippet
  extractBasicInfo(title, snippet) {
    const fullText = `${title} ${snippet}`.toLowerCase();
    
    return {
      firstName: this.extractFirstName(fullText),
      lastName: this.extractLastName(fullText),
      company: this.extractCompany(title, snippet),
      title: this.extractTitle(title, snippet)
    };
  }

  // Extraire le prénom (patterns courants)
  extractFirstName(text) {
    // Patterns pour prénom (après certains mots-clés)
    const patterns = [
      /(?:je suis|me|moi|c'est)\s+([a-zA-ZàâäéèêëïîôöùûüÿÀÂÄÉÈÊËÏÎÔÖÙÛÜŸ]{2,})/,
      /(?:par|avec|chez)\s+([a-zA-ZàâäéèêëïîôöùûüÿÀÂÄÉÈÊËÏÎÔÖÙÛÜŸ]{2,})/,
      /^([a-zA-ZàâäéèêëïîôöùûüÿÀÂÄÉÈÊËÏÎÔÖÙÛÜŸ]{2,})\s+[a-zA-ZàâäéèêëïîôöùûüÿÀÂÄÉÈÊËÏÎÔÖÙÛÜŸ]{2,}/
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const name = match[1].trim();
        // Vérifier que ce n'est pas un mot-clé
        if (!this.titleKeywords.titles.includes(name.toLowerCase())) {
          return this.capitalize(name);
        }
      }
    }
    
    return null;
  }

  // Extraire le nom de famille
  extractLastName(text) {
    // Patterns pour nom de famille (après prénom)
    const patterns = [
      /^([a-zA-ZàâäéèêëïîôöùûüÿÀÂÄÉÈÊËÏÎÔÖÙÛÜŸ]{2,})\s+([a-zA-ZàâäéèêëïîôöùûüÿÀÂÄÉÈÊËÏÎÔÖÙÛÜŸ]{2,})/,
      /(?:mme|madame|mr|monsieur)\s+([a-zA-ZàâäéèêëïîôöùûüÿÀÂÄÉÈÊËÏÎÔÖÙÛÜŸ]{2,})/
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[2]) {
        return this.capitalize(match[2].trim());
      } else if (match && match[1] && !match[2]) {
        // Cas où on a juste le nom après "Mme"
        return this.capitalize(match[1].trim());
      }
    }
    
    return null;
  }

  // Extraire le nom de l'entreprise
  extractCompany(title, snippet) {
    const fullText = `${title} ${snippet}`;
    
    // Patterns pour entreprise
    const patterns = [
      /(?:chez|pour|dans)\s+([a-zA-Z0-9\s&-]{3,30})/i,
      /([a-zA-Z0-9\s&-]{3,30})\s+(?:sarl|sas|eurl|sasu|sa)/i,
      /(?:société|entreprise|cabinet|bureau|agence)\s+([a-zA-Z0-9\s&-]{3,30})/i
    ];
    
    for (const pattern of patterns) {
      const match = fullText.match(pattern);
      if (match && match[1]) {
        const company = match[1].trim();
        // Vérifier que ce n'est pas un mot générique
        if (!this.isGenericWord(company)) {
          return this.capitalize(company);
        }
      }
    }
    
    return null;
  }

  // Extraire le titre/profession
  extractTitle(title, snippet) {
    const fullText = `${title} ${snippet}`.toLowerCase();
    
    // Chercher les combinaisons de mots-clés
    let bestMatch = null;
    let bestScore = 0;
    
    this.titleKeywords.titles.forEach(titleWord => {
      this.titleKeywords.specializations.forEach(spec => {
        const pattern = new RegExp(`(${titleWord}\\s+${spec}|${spec}\\s+${titleWord})`, 'i');
        const match = fullText.match(pattern);
        if (match) {
          const score = titleWord.length + spec.length;
          if (score > bestScore) {
            bestMatch = match[1];
            bestScore = score;
          }
        }
      });
    });
    
    if (bestMatch) {
      return this.capitalize(bestMatch);
    }
    
    // Fallback: chercher juste les titres de base
    for (const titleWord of this.titleKeywords.titles) {
      const pattern = new RegExp(`\\b${titleWord}\\b`, 'i');
      if (fullText.match(pattern)) {
        return this.capitalize(titleWord);
      }
    }
    
    return null;
  }

  // Extraire l'email
  extractEmail(text) {
    const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
    const match = text.match(emailPattern);
    return match ? match[0] : null;
  }

  // Extraire la plateforme de l'URL
  extractPlatform(url) {
    try {
      const domain = new URL(url).hostname;
      return domain.replace('www.', '');
    } catch (error) {
      return 'unknown';
    }
  }

  // Analyser le texte pour des insights
  analyzeText(title, snippet) {
    const fullText = `${title} ${snippet}`.toLowerCase();
    
    return {
      // Indicateurs de qualité
      hasContact: /contact|téléphone|email|appelez/.test(fullText),
      hasExperience: /expérience|ans|années|expert/.test(fullText),
      hasSpecialization: this.titleKeywords.specializations.some(spec => 
        fullText.includes(spec)
      ),
      
      // Indicateurs de disponibilité
      isAvailable: /disponible|libre|recherche|propose/.test(fullText),
      isFreelance: /freelance|indépendant|auto-entrepreneur/.test(fullText),
      
      // Localisation
      location: this.extractLocation(fullText),
      
      // Mots-clés trouvés
      keywords: this.extractKeywords(fullText)
    };
  }

  // Extraire la localisation
  extractLocation(text) {
    const locationPatterns = [
      /(?:paris|lyon|marseille|toulouse|bordeaux|lille|nantes|strasbourg|montpellier|rennes)/i,
      /(?:france|french|français)/i,
      /(?:\d{5}|\d{2}\s\d{3})/  // Code postal
    ];
    
    for (const pattern of locationPatterns) {
      const match = text.match(pattern);
      if (match) {
        return match[0];
      }
    }
    
    return null;
  }

  // Extraire les mots-clés pertinents
  extractKeywords(text) {
    const keywords = [];
    
    // Tous les mots-clés de titre et spécialisation
    [...this.titleKeywords.titles, ...this.titleKeywords.specializations].forEach(keyword => {
      if (text.includes(keyword)) {
        keywords.push(keyword);
      }
    });
    
    return keywords;
  }

  // Utilitaires
  capitalize(text) {
    if (!text) return text;
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
  }

  isGenericWord(word) {
    const genericWords = [
      'the', 'le', 'la', 'les', 'un', 'une', 'des',
      'and', 'et', 'ou', 'or', 'mais', 'but',
      'service', 'services', 'work', 'travail'
    ];
    return genericWords.includes(word.toLowerCase());
  }

  // Valider les données extraites
  validateLead(leadData) {
    const errors = [];
    
    // Vérifications obligatoires
    if (!leadData.phone) {
      errors.push('Numéro de téléphone manquant');
    }
    
    if (!leadData.source_type) {
      errors.push('Type de source manquant');
    }
    
    if (!leadData.source_platform) {
      errors.push('Plateforme source manquante');
    }
    
    return {
      isValid: errors.length === 0,
      errors: errors
    };
  }

  // Transformer un batch de résultats
  transformBatch(googleResults, sourceInfo) {
    const transformed = [];
    
    googleResults.forEach(result => {
      const leadData = this.transformGoogleResult(result, sourceInfo);
      if (leadData) {
        const validation = this.validateLead(leadData);
        if (validation.isValid) {
          transformed.push(leadData);
        } else {
          console.warn('⚠️  Lead invalide:', validation.errors);
        }
      }
    });
    
    return transformed;
  }

  // Extraire le nom de la plateforme depuis la source configurée
  extractSourcePlatform(source) {
    if (!source) return 'unknown';
    
    // Mapping des sources configurées vers des noms de plateformes
    const platformMapping = {
      'linkedin.com/in': 'linkedin',
      'malt.fr': 'malt',
      'upwork.com': 'upwork',
      'fiverr.com': 'fiverr',
      'hopwork.fr': 'hopwork',
      'freelance.fr': 'freelance',
      'indeed.fr': 'indeed',
      'leboncoin.fr': 'leboncoin',
      'assistante-plus.fr': 'assistante-plus'
    };
    
    // Retourner le nom mappé ou nettoyer la source
    return platformMapping[source] || source.replace(/\.com.*|\.fr.*/, '');
  }
}

// Instance singleton
const dataMapper = new DataMapper();

module.exports = {
  DataMapper,
  dataMapper
}; 