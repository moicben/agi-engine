import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';

import { launchBrowser } from '../../utils/puppeteer/launchBrowser.js';
import { getRandomDomain } from '../utils/getRandomDomain.js';
import { getEmailOtp } from '../utils/getEmailOtp.js';
import { AccountsService } from './config/supabase.js';
//mport { launchBrowserBase } from '../utils/browserbase/launchBrowserBase.js';

// Configuration
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

console.log('🚀 Gateway Register Script démarré...');
console.log('📁 Répertoire de travail:', __dirname);

// Fonction pour vérifier si le profil contient toutes les données obligatoires
export function validateAccountData(accountData) {
  const requiredFields = {
    'first_name': 'Prénom',
    'last_name': 'Nom de famille',
    'email': 'Email',
    'birth_date': 'Date de naissance',
    'birth_place': 'Lieu de naissance',
    'sex': 'Sexe',
    'address': 'Adresse',
    'city': 'Ville',
    'postal_code': 'Code postal'
  };

  const missingFields = [];
  
  for (const [field, label] of Object.entries(requiredFields)) {
    if (!accountData[field] || accountData[field].toString().trim() === '') {
      missingFields.push(label);
    }
  }

  // Vérifier que le fichier d'image existe
  const cleanFirstName = accountData.first_name ? accountData.first_name.toLowerCase().split(' ')[0] : '';
  const cleanLastName = accountData.last_name ? accountData.last_name.toLowerCase().replace(/\s+/g, '-').replace(/[éèêë]/g, 'e').replace(/[àâä]/g, 'a').replace(/[ùûü]/g, 'u').replace(/[ôö]/g, 'o').replace(/[îï]/g, 'i').replace(/ç/g, 'c') : '';
  const idPath = path.join(__dirname, '..', 'assets', 'passports', 'proceed', `${cleanFirstName}-${cleanLastName}.jpg`);
  
  if (!fs.existsSync(idPath)) {
    // Chercher un fichier qui commence par le prénom et nom
    const passportDir = path.join(__dirname, '..', 'assets', 'passports');
    if (fs.existsSync(passportDir)) {
      const files = fs.readdirSync(passportDir);
      const possibleFile = files.find(file => 
        file.toLowerCase().startsWith(`${cleanFirstName}-${cleanLastName.split(' ')[0]}`) ||
        file.toLowerCase().startsWith(`${cleanFirstName}-${cleanLastName}`)
      );
      
      if (!possibleFile) {
        missingFields.push(`Fichier d'image (recherché: ${idPath}, aucun fichier trouvé commençant par ${cleanFirstName}-${cleanLastName.split(' ')[0]})`);
      }
    } else {
      missingFields.push(`Répertoire d'images manquant (${passportDir})`);
    }
  }

  return {
    isValid: missingFields.length === 0,
    missingFields: missingFields,
    imagePath: idPath
  };
}

// Fonction pour préparer les données du compte
export function prepareAccountData(accountData) {
  const address = accountData.address;
  const city = accountData.city;
  const postal = accountData.postal_code;
  const phone = accountData.phone || '0612345678';
  const birth = accountData.birth_date;
  
  // Chemin vers l'image d'identité - logique de recherche améliorée
  const cleanFirstName = accountData.first_name.toLowerCase().split(' ')[0];
  const cleanLastName = accountData.last_name.toLowerCase().replace(/\s+/g, '-').replace(/[éèêë]/g, 'e').replace(/[àâä]/g, 'a').replace(/[ùûü]/g, 'u').replace(/[ôö]/g, 'o').replace(/[îï]/g, 'i').replace(/ç/g, 'c');
  let idPath = path.join(__dirname, '..', 'assets', 'passports', 'proceed', `${cleanFirstName}-${cleanLastName}.jpg`);
  
  // Si le fichier n'existe pas, chercher un fichier similaire
  if (!fs.existsSync(idPath)) {
    const passportDir = path.join(__dirname, '..', 'assets', 'passports');
    const files = fs.readdirSync(passportDir);
    const possibleFile = files.find(file => 
      file.toLowerCase().startsWith(`${cleanFirstName}-${cleanLastName.split(' ')[0]}`) ||
      file.toLowerCase().startsWith(`${cleanFirstName}-${cleanLastName}`)
    );
    
    if (possibleFile) {
      idPath = path.join(__dirname, '..', 'assets', 'passports', possibleFile);
    }
  }
  
  const email = accountData.email;
  
  return {
    address,
    city,
    postal,
    phone,
    birth,
    idPath,
    email,
    cleanFirstName,
    cleanLastName
  };
}

// Fonction pour créer une capture d'écran
export async function takeScreenshot(page, accountData, serviceName, type = 'success') {
  try {
    const screenshotDir = path.join(__dirname, '..', 'screenshots');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }

    await page.screenshot({ 
      path: path.join(screenshotDir, `${serviceName}-${accountData.first_name}-${accountData.last_name}-${type}.png`) 
    });
  } catch (screenshotError) {
    console.error('Erreur lors de la capture d\'écran:', screenshotError);
  }
}

// Fonction générique pour créer un compte avec un workflow spécifique
export async function createAccountWithWorkflow(accountData, workflowFunction, serviceName) {
  console.log(`\n🚀 Création du compte ${serviceName} pour: ${accountData.first_name} ${accountData.last_name}`);
  
  // Lancer le navigateur Puppeteer optimisé
  const { browser, page } = await launchBrowser();
  
  // Préparer les données du compte
  const preparedData = prepareAccountData(accountData);
  
  let status = 'success';
  let comment = 'Account created successfully';
  
  console.log('--> Email:', preparedData.email);
  console.log('--> Address:', preparedData.address, preparedData.city, preparedData.postal);
  console.log('--> Phone:', preparedData.phone);
  console.log('--> Birth Date:', preparedData.birth);

  try {
    // Exécuter le workflow spécifique au service
    await workflowFunction(page, accountData, preparedData);
    
    // Prendre une capture d'écran de succès
    await takeScreenshot(page, accountData, serviceName, 'success');
    
    console.log(`✅ created: ${accountData.first_name} ${accountData.last_name}`);

  } catch (error) {
    console.error(`❌ Erreur lors de la création du compte pour ${accountData.first_name} ${accountData.last_name}:`, error);
    
    // Prendre une capture d'écran de l'erreur
    await takeScreenshot(page, accountData, serviceName, 'error');

    comment = error.message || 'Unknown error';
    status = 'error';
  } finally {
    // Fermer le navigateur
    await browser.close();
  }

  return {
    accountData: accountData,
    email: preparedData.email,
    phone: preparedData.phone,
    address: { 
      address: preparedData.address, 
      city: preparedData.city, 
      postal: preparedData.postal 
    },
    birthFormatted: preparedData.birth,
    status: status,
    comment: comment,
    processedAt: new Date().toISOString()
  };
}

// Fonction principale pour traiter tous les comptes d'un service spécifique depuis Supabase
export async function processAccountsByService(serviceName, workflowFunction) {
  try {
    // Initialiser le service Supabase
    const accountsService = new AccountsService();
    
    console.log(`🔍 Récupération des comptes avec status "new" et service "${serviceName}" depuis Supabase...`);
    
    // Récupérer tous les comptes avec status "new" et service spécifique
    const accounts = await accountsService.getAccountsByService(serviceName, 'new', 1000, 0);

    if (!accounts || accounts.length === 0) {
      throw new Error(`Aucun compte avec status "new" et service "${serviceName}" trouvé dans Supabase`);
    }

    console.log(`🚀 Début de la création de ${accounts.length} comptes ${serviceName}...`);

    const results = [];
    let successCount = 0;
    let errorCount = 0;

    // Traiter chaque compte séquentiellement
    for (let i = 0; i < accounts.length; i++) {
      const account = accounts[i];
      
      console.log(`\n📋 Traitement ${i + 1}/${accounts.length}: ${account.first_name} ${account.last_name}`);

      // Vérifier d'abord si le profil contient toutes les données nécessaires
      const validation = validateAccountData(account);
      
      if (!validation.isValid) {
        console.log(`❌ Profil incomplet pour ${account.first_name} ${account.last_name}:`);
        console.log(`   Champs manquants: ${validation.missingFields.join(', ')}`);
        
        // Mettre à jour le status à "incomplete" dans Supabase
        try {
          await accountsService.updateAccountStatus(account.id, 'incomplete', {
            comment: `Profil incomplet - Champs manquants: ${validation.missingFields.join(', ')} - ${new Date().toISOString()}`,
            service: serviceName
          });
        } catch (updateError) {
          console.error('Erreur lors de la mise à jour du status:', updateError);
        }
        
        results.push({
          accountData: account,
          status: 'incomplete',
          comment: `Champs manquants: ${validation.missingFields.join(', ')}`,
          processedAt: new Date().toISOString()
        });
        errorCount++;
        
        console.log(`⏩ Passage au profil suivant...`);
        continue; // Passer au profil suivant
      }
      
      console.log(`✅ Profil valide, démarrage de l'inscription...`);
      
      try {
        // Mettre à jour le status à "processing" avant de commencer
        await accountsService.updateAccountStatus(account.id, 'processing', {
          comment: `Début de l'inscription ${serviceName} - ${new Date().toISOString()}`
        });
        
        const result = await createAccountWithWorkflow(account, workflowFunction, serviceName);
        results.push(result);
        
        if (result.status === 'success') {
          successCount++;
          console.log(`✅ Succès pour ${account.first_name} ${account.last_name}`);
          
          // Mettre à jour le status à "pending"
          await accountsService.updateAccountStatus(account.id, 'pending', {
            comment: `created: ${result.email} - ${new Date().toISOString()}`
          });
        } else {
          errorCount++;
          console.log(`❌ Échec pour ${account.first_name} ${account.last_name}: ${result.comment}`);
          
          // Mettre à jour le status à "error"
          await accountsService.updateAccountStatus(account.id, 'error', {
            comment: `Erreur lors de la création: ${result.comment} - ${new Date().toISOString()}`
          });
        }

        // Pause entre les créations de compte pour éviter la détection
        if (i < accounts.length - 1) {
          console.log('⏳ Pause de 10 secondes avant le prochain compte...');
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.error(`❌ Erreur fatale pour ${account.first_name} ${account.last_name}:`, error);
        
        // Mettre à jour le status à "fatal_error"
        await accountsService.updateAccountStatus(account.id, 'fatal_error', {
          comment: `Erreur fatale: ${error.message} - ${new Date().toISOString()}`
        });
        
        results.push({
          accountData: account,
          status: 'fatal_error',
          comment: error.message,
          processedAt: new Date().toISOString()
        });
        errorCount++;
      }
    }

    // Sauvegarder les résultats localement aussi
    const outputFile = path.join(__dirname, `${serviceName}_accounts_${new Date().toISOString().slice(0, 10)}.json`);
    fs.writeFileSync(outputFile, JSON.stringify({
      metadata: {
        processedAt: new Date().toISOString(),
        serviceName: serviceName,
        totalAccounts: accounts.length,
        successfulAccounts: successCount,
        errors: errorCount
      },
      accounts: results
    }, null, 2));

    console.log(`\n🎉 Traitement terminé !`);
    console.log(`✅ Comptes créés avec succès: ${successCount}`);
    console.log(`❌ Erreurs: ${errorCount}`);
    console.log(`💾 Résultats sauvegardés dans: ${outputFile}`);
    console.log(`📊 Status mis à jour dans Supabase`);

    return {
      success: successCount,
      errors: errorCount,
      outputFile: outputFile,
      results: results
    };

  } catch (error) {
    console.error('❌ Erreur générale:', error);
    throw error;
  }
} 