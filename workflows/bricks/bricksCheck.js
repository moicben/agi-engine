import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';

import { pressKey } from '../../utils/puppeteer/pressKey.js';
import { launchBrowserBase, closeBrowserBase } from '../../utils/browserbase/launchBrowserBase.js';
import { AccountsService } from '../config/supabase.js';

// Configuration
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

console.log('🚀 Script de vérification Bricks démarré...');

const START_URL = 'https://app.bricks.co/';

// Initialiser le service Supabase
const accountsService = new AccountsService();

// Fonction pour se connecter à un compte Bricks et vérifier le statut
async function checkBricksAccount(accountData, batchIndex = 0, accountIndex = 0) {
  console.log(`[${batchIndex}.${accountIndex}] 🔍 ${accountData.first_name} ${accountData.last_name} - ${accountData.email}`);
  
  // Toujours créer un navigateur frais pour éviter les blocages Cloudflare
  const result = await launchBrowserBase({
    useProxy: true,
    region: 'eu-central-1',
    timeout: 3600,
    keepAlive: false
  });
  
  const browser = result.browser;
  const page = result.page;
  const sessionId = result.sessionId;
  
  let status = 'pending';
  let comment = 'Checking account status';
  
  try {
    await page.goto(START_URL, { waitUntil: 'networkidle2', timeout: 60000 });
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Rechercher les champs de connexion
    const emailInput = await page.$('input[type="email"]');
    const passwordInput = await page.$('input[type="password"]');
    await new Promise(resolve => setTimeout(resolve, 500));
    
    if (!emailInput || !passwordInput) {
      throw new Error('Champs de connexion non trouvés');
    }

    // Saisir les identifiants et se connecter
    await page.type('input[type="email"]', accountData.email, { delay: 100 });
    await page.type('input[type="password"]', 'Cadeau2014!', { delay: 100 });
    await new Promise(resolve => setTimeout(resolve, 1000));
    await pressKey(page, 'Enter', 1);
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Vérifier le statut
    const currentUrl = page.url();
    if (currentUrl.includes('login')) {
      status = 'blocked';
      comment = "Couldn't login, browser blocked";
    } else {
      // Vérifier les bannières
      const waitBanner = await page.$('.css-dxjesb');
      const errorBanner = await page.$('.css-1s9durk');
      
      if (waitBanner) {
        status = 'soon';
        comment = 'Account in progress: waitBanner found';
      } else if (errorBanner) {
        status = 'rejected';
        comment = 'Account rejected: errorBanner found';
      } else {
        status = 'verified';
        comment = 'Account verified: no banners found';
      }
    } 

    // Prendre une capture d'écran pour documentation
    const screenshotsDir = path.join(__dirname, '..', 'screenshots');
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }
    
    const screenshotPath = path.join(screenshotsDir, `${accountData.email.replace(/[@.]/g, '_')}_${status}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });

  } catch (error) {
    status = 'error';
    comment = `Error: ${error.message}`;
  } finally {
    // Toujours fermer le navigateur frais
    if (browser) {
      await closeBrowserBase(browser, sessionId);
    }
  }

  return {
    accountId: accountData.id,
    email: accountData.email,
    status: status,
    comment: comment,
    checkedAt: new Date().toISOString()
  };
}

// Fonction pour traiter un lot de comptes en parallèle avec navigateurs frais
async function processBatch(accounts, batchIndex) {
  console.log(`\n⚡ [${batchIndex}] Traitement de ${accounts.length} comptes en parallèle...`);
  
  const promises = accounts.map(async (account, index) => {
    try {
      const result = await checkBricksAccount(account, batchIndex, index + 1);
      
      // Mettre à jour le statut en base
      await accountsService.updateAccountStatus(
        result.accountId,
        result.status,
        {
          comment: result.comment,
          checked_at: result.checkedAt
        }
      );
      
      return { success: true, result };
    } catch (error) {
      console.error(`[${batchIndex}.${index + 1}] ❌ Erreur: ${error.message}`);
      return { success: false, error: error.message, account };
    }
  });
  
  return Promise.allSettled(promises);
}

// Fonction pour vérifier un compte spécifique par email
async function checkSpecificAccount(email) {
  try {
    console.log(`🔍 Recherche du compte avec l'email: ${email}`);
    
    // Récupérer le compte par email
    const account = await accountsService.getAccountByEmail(email);
    
    if (!account) {
      console.log(`❌ Aucun compte trouvé avec l'email: ${email}`);
      return;
    }

    console.log(`✅ Compte trouvé: ${account.first_name} ${account.last_name}`);
    console.log(`📊 Statut actuel: ${account.status}`);
    
    // Vérifier le compte
    const result = await checkBricksAccount(account);
    
    // Mettre à jour le statut du compte dans Supabase
    await accountsService.updateAccountStatus(
      result.accountId,
      result.status,
      {
        comment: result.comment,
        checked_at: result.checkedAt
      }
    );

    console.log(`✅ Statut mis à jour en base: ${result.status}`);
    
    return result;

  } catch (error) {
    console.error('❌ Erreur lors de la vérification du compte spécifique:', error);
    throw error;
  }
}

// Fonction pour analyser les arguments de ligne de commande
function parseCommandLineArgs() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    return { mode: 'all' };
  }
  
  const firstArg = args[0];
  
  // Vérifier si c'est une commande pour un statut spécifique
  if (firstArg === 'soon' || firstArg === 'pending') {
    return { mode: 'status', status: firstArg };
  }
  
  // Validation basique de l'email
  if (firstArg && firstArg.includes('@')) {
    return { mode: 'specific', email: firstArg };
  } else {
    console.log('❌ Format d\'argument invalide');
    console.log('Usage: node bricksCheck.js [options]');
    console.log('Options:');
    console.log('  [email@exemple.com]  Vérifier un compte spécifique par email');
    console.log('  pending              Vérifier tous les comptes avec le statut "pending"');
    console.log('  soon                 Vérifier tous les comptes avec le statut "soon"');
    console.log('  (aucun argument)     Vérifier tous les comptes "pending" par défaut');
    process.exit(1);
  }
}

// Fonction pour traiter tous les comptes avec un statut spécifique
async function checkAccountsByStatus(status) {
  try {
    // Récupérer tous les comptes avec le statut spécifié
    const accounts = await accountsService.getAccounts(status, 100, 0);
    
    if (!accounts || accounts.length === 0) {
      console.log(`ℹ️ Aucun compte "${status}" trouvé`);
      return;
    }

    // Diviser les comptes en lots de 5 (navigateurs frais pour chaque lot)
    const batchSize = 5;
    const batches = [];
    
    for (let i = 0; i < accounts.length; i += batchSize) {
      batches.push(accounts.slice(i, i + batchSize));
    }
    
    console.log(`📋 ${accounts.length} comptes à vérifier en ${batches.length} lots`);

    const results = [];
    let processedCount = 0;
    let verifiedCount = 0;
    let rejectedCount = 0;
    let soonCount = 0;
    let errorCount = 0;

    // Traiter chaque lot en parallèle avec navigateurs frais
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      const batchIndex = i + 1;
      
      const batchResults = await processBatch(batch, batchIndex);
      
      // Analyser les résultats du lot
      console.log(`\n📊 [${batchIndex}] Résultats:`);
      for (const settledResult of batchResults) {
        if (settledResult.status === 'fulfilled' && settledResult.value.success) {
          const result = settledResult.value.result;
          results.push(result);
          processedCount++;
          
          const statusIcon = result.status === 'verified' ? '✅' : result.status === 'rejected' ? '❌' : result.status === 'soon' ? '⏳' : '⚠️';
          console.log(`   ${statusIcon} ${result.email} - ${result.status}`);
          
          // Compter les résultats
          if (result.status === 'verified') verifiedCount++;
          else if (result.status === 'rejected') rejectedCount++;
          else if (result.status === 'soon') soonCount++;
          else if (result.status === 'error') errorCount++;
        } else {
          console.error(`   ❌ Erreur: ${settledResult.reason || settledResult.value?.error}`);
          errorCount++;
          processedCount++;
        }
      }
      
      // Attendre un peu entre chaque lot si pas le dernier
      if (i < batches.length - 1) {
        console.log(`\n⏱️ Pause de 5 secondes avant le lot ${i + 2}...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }

    // Afficher le résumé
    console.log('\n🎉 Vérification terminée !');
    console.log('📊 Résumé des résultats:');
    console.log(`  • Comptes traités: ${processedCount}/${accounts.length}`);
    console.log(`  • Comptes vérifiés: ${verifiedCount}`);
    console.log(`  • Comptes en vérification (soon): ${soonCount}`);
    console.log(`  • Comptes rejetés: ${rejectedCount}`);
    console.log(`  • Erreurs: ${errorCount}`);

    return {
      processed: processedCount,
      verified: verifiedCount,
      soon: soonCount,
      rejected: rejectedCount,
      errors: errorCount,
      details: results
    };

  } catch (error) {
    console.error('❌ Erreur générale lors de la vérification:', error);
    throw error;
  }
}

// Fonction principale pour traiter tous les comptes avec le statut "pending" (pour compatibilité)
async function checkAllPendingAccounts() {
  return await checkAccountsByStatus('pending');
}

// Exporter les fonctions
export { checkBricksAccount, checkAllPendingAccounts, checkSpecificAccount };

// Exécuter le script si appelé directement
const isMainModule = process.argv[1] && process.argv[1].includes('bricksCheck.js');

if (isMainModule) {
  (async () => {
    try {
      const args = parseCommandLineArgs();
      
      if (args.mode === 'specific') {
        console.log(`🎯 Vérification: ${args.email}`);
        await checkSpecificAccount(args.email);
      } else if (args.mode === 'status') {
        console.log(`📊 Vérification comptes "${args.status}"`);
        await checkAccountsByStatus(args.status);
      } else {
        console.log('📊 Vérification comptes pending');
        await checkAllPendingAccounts();
      }
    } catch (error) {
      console.error('❌ Erreur:', error.message);
      process.exit(1);
    }
  })();
}
