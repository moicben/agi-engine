import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Get the directory of the current module and load .env from parent directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('SUPABASE_URL and SUPABASE_KEY must be defined in .env file');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Fonction pour nettoyer un nom pour l'email
function cleanNameForEmail(name) {
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

// Fonction pour créer un compte dans Supabase
async function createAccount(accountData) {
  try {
    const { data, error } = await supabase
      .from('accounts')
      .insert([{
        email: accountData.email,
        phone: accountData.phone,
        first_name: accountData.first_name,
        last_name: accountData.last_name,
        birth_date: accountData.birth_date,
        birth_place: accountData.birth_place,
        address: accountData.address,
        postal_code: accountData.postal_code,
        city: accountData.city,
        country: accountData.country,
        sex: accountData.sex,
        document_number: accountData.document_number,
        expiry_date: accountData.expiry_date,
        issue_date: accountData.issue_date,
        issuing_state: accountData.issuing_state,
        mrz1: accountData.mrz1,
        mrz2: accountData.mrz2,
        status: accountData.status || 'pending',
        service: accountData.service,
        comment: accountData.comment,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) {
      throw new Error(`Supabase insert error: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error('Error creating account:', error);
    throw error;
  }
}
const emailDomains = [
  "@cpav3.com",
  "@nuclene.com",
  "@steveix.com",
  "@mocvn.com",
  "@tenvil.com",
  "@tgvis.com",
  "@amozix.com",
  "@anypsd.com",
  "@maxric.com"
];

// Fonction pour générer un email unique
async function generateUniqueEmail(firstName, lastName) {
  const cleanFirst = cleanNameForEmail(firstName);
  const cleanLast = cleanNameForEmail(lastName);
  
  let attempts = 0;
  const maxAttempts = 10;
  
  while (attempts < maxAttempts) {
    let emailPrefix;
    
    if (attempts === 0) {
      // Première tentative: prenom.nom
      emailPrefix = `${cleanFirst}.${cleanLast}`;
    } else if (attempts === 1) {
      // Deuxième tentative: prenom_nom
      emailPrefix = `${cleanFirst}_${cleanLast}`;
    } else if (attempts === 2) {
      // Troisième tentative: prenomnom
      emailPrefix = `${cleanFirst}${cleanLast}`;
    } else {
      // Tentatives suivantes: ajouter des chiffres
      const randomNum = Math.floor(Math.random() * 9999);
      emailPrefix = `${cleanFirst}${cleanLast}${randomNum}`;
    }

    // Choisir un domaine aléatoire
    const domain = emailDomains[Math.floor(Math.random() * emailDomains.length)];
    const email = `${emailPrefix}${domain}`;
    
    return email;
  }
  
  throw new Error(`Impossible de générer un email unique après ${maxAttempts} tentatives pour ${firstName} ${lastName}`);
}

// Fonction pour générér un numéro de téléphone aléatoire commençant par 06
async function generatePhoneNumber() {
  const phonePrefix = '06';
  const randomSuffix = Math.floor(10000000 + Math.random() * 90000000); // Générer un nombre aléatoire de 8 chiffres
  const phoneNumber = `${phonePrefix}${randomSuffix}`;

  return phoneNumber;
}


// Fonction principale d'importation
async function importToSupabase(csvFilePath) {
  try {
    console.log('🚀 Début de l\'importation vers Supabase...');
    
    // Lire le fichier CSV
    const sheetData = [];
    
    return new Promise((resolve, reject) => {
      fs.createReadStream(csvFilePath)
        .pipe(csv())
        .on('data', (row) => {
          sheetData.push(row);
        })
        .on('end', async () => {
          try {
            console.log(`📋 ${sheetData.length} enregistrements à importer...`);
            
            let importedCount = 0;
            let errorCount = 0;
            const errors = [];
            
            for (let i = 0; i < sheetData.length; i++) {
              const account = sheetData[i];
              
              try {
                console.log(`\n📷 [${i + 1}/${sheetData.length}] Traitement de: ${account.FirstName} ${account.LastName}...`);
                
                // Générer un email unique
                const email = await generateUniqueEmail(account.FirstName, account.LastName);

                // Générer un numéro de téléphone aléatoire
                const phone = await generatePhoneNumber();
                
                // Préparer les données pour Supabase
                const accountData = {
                  email: email,
                  phone: phone,
                  first_name: account.FirstName,
                  last_name: account.LastName,
                  birth_date: account.BirthDate || null,
                  birth_place: account.BirthPlace || null,
                  address: account.Address || null,
                  postal_code: account.PostalCode || null,
                  city: account.City || null,
                  country: account.Country || 'France', // Valeur par défaut
                  sex: account.Sex || 'M', // Valeur par défaut
                  document_number: account.DocumentNumber || null,
                  expiry_date: account.ExpiryDate || null,
                  issue_date: account.IssueDate || null,
                  issuing_state: account.IssuingState || null,
                  mrz1: account.MRZ1 || null,
                  mrz2: account.MRZ2 || null,
                  service: 'bricks',
                  status: 'new',
                  comment: `Imported from ${path.basename(csvFilePath)} on ${new Date().toISOString()}`
                };        
                // Sauvegarder en base Supabase
                const savedAccount = await createAccount(accountData);
                console.log(`💾 [${i + 1}] Sauvegardé avec ID: ${savedAccount.id} - ${email}`);
                importedCount++;
                
              } catch (error) {
                console.error(`❌ [${i + 1}] Erreur pour ${account.FirstName} ${account.LastName}:`, error.message);
                errors.push({
                  index: i + 1,
                  name: `${account.FirstName} ${account.LastName}`,
                  error: error.message
                });
                errorCount++;
              }
            }
            
            console.log(`\n🎉 Importation terminée !`);
            console.log(`📊 Statistiques:`);
            console.log(`  • Importés avec succès: ${importedCount}/${sheetData.length}`);
            console.log(`  • Erreurs: ${errorCount}`);
            
            if (errors.length > 0) {
              console.log(`\n❌ Détail des erreurs:`);
              errors.forEach(err => {
                console.log(`  • [${err.index}] ${err.name}: ${err.error}`);
              });
            }
            
            resolve({
              imported: importedCount,
              errors: errorCount,
              details: errors
            });
            
          } catch (error) {
            console.error('❌ Erreur générale lors de l\'importation:', error);
            reject(error);
          }
        })
        .on('error', (error) => {
          console.error('❌ Erreur lors de la lecture du fichier CSV:', error);
          reject(error);
        });
    });
    
  } catch (error) {
    console.error('❌ Erreur générale lors de l\'importation:', error);
    throw error;
  }
}

// Fonction pour afficher l'aide
function showHelp() {
  console.log(`
📋 Importateur de données vers Supabase
=======================================

Usage: node importToSupabase.js [options]

Options:
  --file <path>    Chemin vers le fichier CSV à importer
  --help          Afficher cette aide
  
Exemples:
  node importToSupabase.js --file passports_data.csv
  node importToSupabase.js --file ../assets/passports/passports_data.csv

💾 FONCTION:
Ce script importe les données d'un fichier CSV de passeports
vers la table 'accounts' de Supabase avec génération d'emails uniques.
`);
}

// Parsing des arguments CLI
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    file: null,
    help: false
  };
  
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--file':
        options.file = args[i + 1];
        i++; // Skip next argument
        break;
      case '--help':
      case '-h':
        options.help = true;
        break;
      default:
        if (args[i].startsWith('--')) {
          console.error(`❌ Option inconnue: ${args[i]}`);
          showHelp();
          process.exit(1);
        }
    }
  }
  
  return options;
}

// Exécuter le script si appelé directement
const isMainModule = process.argv[1] && process.argv[1].endsWith('importToSupabase.js');

if (isMainModule) {
  (async () => {
    try {
      const options = parseArgs();
      
      if (options.help) {
        showHelp();
        return;
      }
      
      // Si aucun fichier n'est spécifié, utiliser le fichier par défaut
      if (!options.file) {
        const defaultPath = path.resolve(__dirname, '..', 'assets', 'passports', 'passports_data.csv');
        console.log(`🔍 Aucun fichier spécifié, utilisation du fichier par défaut: ${defaultPath}`);
        options.file = defaultPath;
      }
      
      // Vérifier que le fichier existe
      if (!fs.existsSync(options.file)) {
        console.error(`❌ Fichier non trouvé: ${options.file}`);
        process.exit(1);
      }
      
      console.log(`🚀 Importation du fichier: ${options.file}`);
      await importToSupabase(options.file);
      
    } catch (error) {
      console.error('❌ Erreur lors de l\'importation:', error);
      process.exit(1);
    }
  })();
}

export { importToSupabase };
