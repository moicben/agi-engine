// Puppeteer example - Search for "/lemonway/card/saved" in JS files across multiple PropTech platforms
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';

// URLs de login - 46 plateformes PropTech européennes utilisant potentiellement Lemonway
const urls = [
  // FRANCE (16 plateformes)
  'https://app.bricks.co/login',
  'https://lendosphere.com/login',
  'https://enerfip.fr/login',
  'https://homunity.com/login',
  'https://lesentrepreteurs.com/login',
  'https://baltis.fr/login',
  'https://october.eu/fr/login',
  'https://tokimo.fr/login',
  'https://wesharebonds.com/login',
  'https://raizers.com/login',
  'https://anaxago.com/login',
  'https://fundimmo.com/login',
  'https://clubfunding.fr/login',
  'https://tudigo.fr/login',
  'https://lapremierebrique.fr/login',
  
  // ESPAGNE (5 plateformes)
  'https://urbanitae.com/login',
  'https://housers.com/login',
  'https://fundeen.com/iniciar-sesion',
  'https://flobers.com/login',
  'https://wecity.es/login',
  
  // ITALIE (4 plateformes)
  'https://recrowd.eu/login',
  'https://ener2crowd.com/accesso',
  'https://produzionidalbasso.com/accedi',
  'https://walliance.eu/login',
  
  // MULTI-EUROPÉEN (6 plateformes)
  'https://estateguru.eu/login',
  'https://rendity.com/login',
  'https://lande.lv/login',
  'https://heavyfinance.eu/login',
  'https://angelsden.com/login',
  'https://crowdestate.eu/login',
  
  // ALLEMAGNE (7 plateformes)
  'https://zinsbaustein.de/login',
  'https://exporo.de/login',
  'https://bergfuerst.com/login',
  'https://ifunded.de/login',
  'https://zinsland.de/anmelden',
  'https://companisto.com/login',
  'https://kapilendo.de/login',
  
  // PAYS-BAS (4 plateformes)
  'https://collincrowdfund.nl/inloggen',
  'https://benkey.nl/login',
  'https://oneplanetcrowd.com/login',
  'https://crowdrealestate.eu/login',
  
  // AUTRES PAYS NORDIQUES (4 plateformes)
  'https://invesdor.com/login',
  'https://reinvest24.com/login',
  'https://crowdberry.com/login',
  'https://bulkestate.com/login'
];

const searchPattern = '/lemonway/card/saved';
const results = [];

// Fonction pour analyser une URL
async function analyzeUrl(browser, url, index) {
  const page = await browser.newPage();
  const jsFiles = [];
  
  try {
    console.log(`\n🔍 [${index + 1}/${urls.length}] Analyse de: ${url}`);
    
    // Intercepter les requêtes réseau
    await page.setRequestInterception(true);
    
    page.on('request', (request) => {
      request.continue();
    });
    
    page.on('response', async (response) => {
      const responseUrl = response.url();
      const contentType = response.headers()['content-type'] || '';
      
      // Capturer les fichiers JavaScript
      if (contentType.includes('javascript') || responseUrl.endsWith('.js')) {
        try {
          const content = await response.text();
          jsFiles.push({
            url: responseUrl,
            content: content
          });
        } catch (error) {
          // Ignorer les erreurs de téléchargement
        }
      }
    });
    
    // Charger la page avec timeout
    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    // Attendre un peu pour que tous les JS se chargent
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log(`   � ${jsFiles.length} fichiers JS trouvés`);
    
    // Rechercher le pattern
    let foundMatches = 0;
    const matchingFiles = [];
    
    for (const jsFile of jsFiles) {
      if (jsFile.content.includes(searchPattern)) {
        foundMatches++;
        matchingFiles.push(jsFile.url);
        
        // Sauvegarder le fichier
        const domain = new URL(url).hostname;
        const fileName = path.basename(new URL(jsFile.url).pathname) || 'unknown.js';
        const safeName = `${domain}_${fileName}`.replace(/[^a-zA-Z0-9.-]/g, '_');
        fs.writeFileSync(`./lemonway_found_${safeName}`, jsFile.content);
      }
    }
    
    if (foundMatches > 0) {
      console.log(`   ✅ TROUVÉ! ${foundMatches} fichier(s) contiennent "${searchPattern}"`);
      results.push({
        url: url,
        found: true,
        matchingFiles: matchingFiles,
        totalJsFiles: jsFiles.length
      });
    } else {
      console.log(`   ❌ Aucune occurrence trouvée`);
      results.push({
        url: url,
        found: false,
        matchingFiles: [],
        totalJsFiles: jsFiles.length
      });
    }
    
  } catch (error) {
    console.log(`   💥 Erreur: ${error.message}`);
    results.push({
      url: url,
      found: false,
      error: error.message,
      matchingFiles: [],
      totalJsFiles: 0
    });
  } finally {
    await page.close();
  }
}

(async () => {
  const browser = await puppeteer.launch({
    headless: false, // Mode headless pour aller plus vite
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  console.log(`🚀 Démarrage de l'analyse de ${urls.length} plateformes PropTech`);
  console.log(`🔍 Recherche du pattern: "${searchPattern}"`);
  
  // Analyser chaque URL une par une
  for (let i = 0; i < urls.length; i++) {
    await analyzeUrl(browser, urls[i], i);
    
    // Pause entre les requêtes pour éviter d'être bloqué
    if (i < urls.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  await browser.close();
  
  // Résumé final
  console.log('\n' + '='.repeat(60));
  console.log('📊 RÉSUMÉ FINAL');
  console.log('='.repeat(60));
  
  const successfulAnalyses = results.filter(r => !r.error);
  const foundResults = results.filter(r => r.found);
  const errorResults = results.filter(r => r.error);
  
  console.log(`✅ Plateformes utilisant Lemonway: ${foundResults.length}`);
  console.log(`❌ Plateformes sans Lemonway: ${successfulAnalyses.length - foundResults.length}`);
  console.log(`💥 Erreurs d'analyse: ${errorResults.length}`);
  
  if (foundResults.length > 0) {
    console.log('\n🎯 PLATEFORMES UTILISANT LEMONWAY:');
    foundResults.forEach((result, index) => {
      console.log(`${index + 1}. ${result.url}`);
      console.log(`   Fichiers JS avec Lemonway: ${result.matchingFiles.length}`);
    });
  }
  
  // Sauvegarder le rapport complet
  fs.writeFileSync('./lemonway_analysis_report.json', JSON.stringify(results, null, 2));
  console.log('\n📄 Rapport complet sauvegardé dans: lemonway_analysis_report.json');
})();