/**
 * Configuration par défaut du projet WA-Setup
 * Modifiez ces valeurs selon vos besoins
 */

export const config = {
  // Environnement d'exécution
  // Options: 'morelogin' (cloud), 'bluestacks' (local), 'cloud' (API), 'droplet' (remote)
  env: 'bluestacks',
  
  // Pays par défaut pour les numéros de téléphone
  // Options: 'FR', 'UK', 'US', 'PH', etc.
  country: 'FR',
  
  // Nombre de comptes à créer en parallèle
  parallel: 1,

  // Ports des devices
  devicePorts: [
    {id: 0, port: 5555}, 
    {id: 50, port: 6055},
    {id: 51, port: 6065},
    {id: 52, port: 6075},
    {id: 53, port: 6085}
    
  ],
  
  // Utiliser un device existant au lieu d'en créer un nouveau
  useExistingDevice: false,
  
  // Préfixe de téléphone personnalisé (ex: '+33' pour France)
  // Si non défini, utilise le service SMS pour obtenir un numéro
  phonePrefix: null,
  
  // Script de lancement personnalisé (code JavaScript à exécuter)
  customLaunch: null,



  // node runners/brander.js --device=7 --brand=0
  // node runners/sender.js --device=7 --campaign=3
  // RESET PROGRESS : UPDATE contacts SET status = 'new' WHERE status = 'in_progress';
  // Data SEND
  send: [
    {
    id: 0,  
    name: 'Campagne test',
    message: `
            Merci de votre réponse une sécrètaire à dominicle l'ors du monde !
            Oui s'il vous plaît, voic donc :
            https://calendar.fr
            \nCordialement`,
    query: 'test', // Query pour la recherche de contacts
    count: 1
    },
    {
    id: 1,  
    name: 'feldmann-levy-1',
    message: `
          Bonjour, je viens de voir sur votre ligne que vous êtes disponible pour du secrétariat en distanciel.
          
          Pour notre cabinet notarial, nous recherchons une secrétaire polyvalente, disponible 4 heures/semaine.
          
          Prenons 15 minutes, pour échanger en fin de journée ou ces prochains jours :
          calendar.google-share.com/calendar/u/0/appointments/schedules/booking/feldmann-levy
           
          Salutations distinguées,
          Maître Karen FELDMANN-LEVY, 
          
          9 avenue Emile Deschanel, 75007
          www.etude-lecomte-feldmann-levy-paris.notaires.fr`,
    query: 'secrétaire', // Query pour la recherche de contacts
    count: 25
    },
    {
    id: 2,
    name: 'mickael-le-maillot',
    message: {
    1: `
          Enchanté, j'ai vu sur votre site que vous proposez du secrétariat.
          
          Nous aurions besoin d'aide sur service client + suivi de paiements.
          
          Avez-vous de la dispo en ce moment pour de nouveaux clients (4-8 heures/semaine début ASAP) ?
          
          À vous lire,
          Mickael, BIM Digital`,
    2: `
          Bonjour, j'ai vu sur site que vous proposez du secrétariat.
          
          Nous aurions besoin d'aide sur service client + suivi de paiements.
          Avez-vous de la dispo actuellement pour de nouveaux clients (4-8 heures semaine début ASAP) ?
          
          Cordialement,
          Mickael, BIM Digital`,
    3: `
          Salut, j'ai vu que vous proposez du secrétariat.
          
          On aurait besoin d'aide sur service client + suivi de paiements.
          Vous avez de la dispo en ce moment pour nouveaux clients (4-8h/semaine début ASAP) ?
          
          Merci,
          Mickael, BIM Digital`,
    4: `
          Enchanté, j'ai noté sur votre site que vous proposez du secrétariat.
          
          Nous recherchons de l'aide sur service client + suivi de paiements.
          Auriez-vous de la disponibilité pour de nouveaux clients (4-8 heures par semaine début ASAP) ?
          
          Au plaisir d'échanger,
          Mickael, BIM Digital`,
    },
    query: 'télésecrétaire', // Query pour la recherche de contacts
    count: 10
    },
    {
    id: 3,
    name: 'mickael-communication',
    message: {
    1: `
          Enchanté, j'ai vu sur votre site que vous proposez de la com et l'aide en création de contenu.
          
          Nous recherchons une freelance disponible pour de la gestion mensuelle de réseaux.

          Merci de me confirmer votre disponibilité et me transmettre vos références.
          
          Bien à vous,
          Mickael, BIM Digital`,
    2: `
          Bonjour, j'ai vu que vous proposez de la com et de l'aide en création de contenu.
          
          Nous recherchons une indépendante pour gérer Instagram/Facebook de nos clients.

          Merci de me confirmer votre disponibilité et me transmettre vos références.
          
          Bien à vous,
          Mickael, BIM Digital`,
    3: `
          Hello, j'ai vu que vous êtes disponible pour de la gestion de réseaux + création de contenu.
          
          Nous recherchons une indépendante pour gérer Instagram/Facebook de nos clients.

          Merci de me confirmer votre disponibilité et me transmettre vos références.
          
          Bien à vous,
          Mickael, BIM Digital`,
    4: `
          Enchanté, j'ai noté sur votre site que vous êtes disponible pour de la gestion de réseaux + création de contenu.
          
          Nous recherchons une indépendante disponible pour de la gestion mensuelle de réseaux.

          Merci de me confirmer votre disponibilité et me transmettre vos références.
          
          Bien à vous,
          Mickael, BIM Digital`,
    },
    query: 'assistante de communication', // Query pour la recherche de contacts
    count: 25
    },
    {
    id: 4,
    name: 'olivier-assistance',
    message: `
          Bonjour, j'ai vu sur votre site que vous êtes disponible pour de la gestion administrative.
          
          En recherche d'une indépendante (sur place ou à distance) pour m'aider sur mes déclarations mensuelles, votre aide pourrait être la bienvenue !

          Prenons 15 minutes, pour échanger dessus si disponible.
          calendly.com/olivier-waked/15min 
                
          Merci, au plaisir.

          Olivier Waked,
          Expert Certifié IFB France
          `,
    query: 'assistante administrative', // Query pour la recherche de contacts
    count: 20
    },
    {
      id: 5,  
    name: 'maitre-darveau',
    message: `
          Bonjour, je viens de voir online que vous êtes disponible pour de l'assistanat à distance ou sur Montréal.
          
          Pour notre cabinet juridique, nous recherchons une adjointe indépendante disponible cette rentrée.
          
          Prenons 15 minutes, pour échanger demain ou ces prochains jours :
          calendar.google-share.com/booking/maitre-darveau
           
          Salutations distinguées,
          Maître Nathalie DARVEAU-LANGEVIN`,
    query: 'adjointe virtuelle', // Query pour la recherche de contacts
    count: 5
    },
    {
    id: 6,  
    name: 'maitre-lacoure',
    message: `
          Bonjour, je viens de voir que vous proposez du secrétariat à distance.
          
          Pour notre cabinet juridique Montreal-Paris, nous recherchons une adjointe française indépendante disponible pour gérer nos déclarations et couvrir le suivi de paiements.
          
          Si disponible, nous pouvons prendre 15 minutes pour échanger.
          calendar.google-share.com/booking/maitre-darveau
           
          Maître LACOURÉ,
          DLB Justice Montreal`,

    query: 'assistante administrative', // Query pour la recherche de contacts
    }
  ],


  // Data BRAND
  brand: [
    {
    id: 0,
    name: 'Mickael Le Maillot',
    description: 'Co-Fondateur BIM DIGITAL, boostez votre communication digitale avec une agence pro à Lyon !',
    image: 'mickael.webp',
    },
    {
    id: 1,
    name: 'Olivier Waked',
    description: 'Expert en gestion patrimoniale sur Belfort/Annecy, fructifiez intelligemment votre patrimoine avec une stratégie sur-mesure.',
    image: 'olivier.jpg',
    },
    {
    id: 2,
    name: 'Nathalie Darveau-Langevin',
    description: 'Avocate en droit Civil & Familial à Montreal',
    image: 'nathalie.jpg',
    },
    {
      id: 3,
      name: 'Maître LACOURE Durieux',
      description: 'Avocat spécialisé en droit civil et patrimonial, je vous accompagne dans vos démarches juridiques, Paris, Montreal et en ligne.',
      image: 'lacoure-durieux.jpg',
    }
  ],


  //
  
  // Configuration SMS
  sms: {
    // Clé API SMS-Activate (peut être définie via SMS_ACTIVATE_API_KEY env var)
    apiKey: process.env.SMS_ACTIVATE_API_KEY,
    // Timeout en ms pour attendre un SMS
    timeout: 120000, // 2 minutes
    // Nombre de tentatives
    retries: 3,
    // Configuration retry pour obtenir un numéro
    numberRetry: {
      maxAttempts: 50,        // AUGMENTÉ: Plus de tentatives
      priceChangeInterval: 3,  // RÉDUIT: Essayer UK plus souvent
      fallbackCountries: ['UK', 'FR', 'ID', 'PH'], // UK en priorité dans fallback
      delayBetweenRetries: 500, // RÉDUIT: Réaction plus rapide
      priceSteps: [
        { maxCost: 50, countries: ['UK', 'FR', 'US'] },    // UK en PREMIER
        { maxCost: 10, countries: ['TH', 'IN', 'UA'] },     
        { maxCost: 5, countries: ['PH', 'ID', 'VN'] },      
        { maxCost: 20, countries: ['RU', 'PL', 'DE'] }      
      ]
    }
  },
  
  // Configuration des devices
  device: {
    // Configuration MoreLogin
    morelogin: {
      apiUrl: process.env.MORELOGIN_API_URL || 'http://localhost:7001',
      groupId: process.env.MORELOGIN_GROUP_ID || null
    },
    // Configuration Droplet
    droplet: {
      //host: '159.223.28.175', // CLASSIQUE
      host: 'localhost', // MESHNET NORD
      port: 5555
    }
  },
  
  // Options de logging
  logging: {
    // Niveau de log: 'debug', 'info', 'warn', 'error'
    level: 'info',
    // Sauvegarder les logs dans des fichiers
    toFile: false,
    // Dossier pour les logs (si toFile est true)
    directory: './logs'
  },
  
  // Options de screenshots
  screenshots: {
    // Prendre des screenshots pendant le workflow
    enabled: true,
    // Dossier pour sauvegarder les screenshots
    directory: './screenshots'
  },


  // Configuration OCR
  ocr: {
    enabled: true,
    maxRetries: 10,
    acceptKeywords: ['SMS', 'Verify by SMS', 'Continue', 'Receive code'],
    rejectKeywords: ['can\'t receive SMS', 'invalid number', 'error', 'try again', 'blocked', 'phone', 'call'],
    lang: 'eng' // Langue pour Tesseract
  }
};