import ExcelJS from 'exceljs';
import mindee from "mindee";
import dotenv from "dotenv";
import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

dotenv.config();

// Init Mindee client
const mindeeClient = new mindee.Client({ apiKey: process.env.MINDEE_API_KEY });

// Créer le dossier assets s'il n'existe pas
const assetsDir = './assets';
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

// Fonction pour télécharger une image
async function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath);
    
    // Configuration de la requête avec des en-têtes pour éviter le blocage
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Referer': 'https://www.pinterest.com/',
        'Sec-Fetch-Dest': 'image',
        'Sec-Fetch-Mode': 'no-cors',
        'Sec-Fetch-Site': 'cross-site'
      }
    };
    https.get(url, options, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Erreur HTTP: ${response.statusCode}`));
        return;
      }
      
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        resolve();
      });
      
      file.on('error', (err) => {
        fs.unlink(filepath, () => {}); // Supprimer le fichier en cas d'erreur
        reject(err);
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

// Fonction pour analyser une image avec Mindee
async function analyzeIdentityCard(imagePath) {
  try {
    const inputSource = mindeeClient.docFromPath(imagePath);
    const apiResponse = await mindeeClient.parse(mindee.product.fr.IdCardV1, inputSource);
    
    const prediction = apiResponse.document.inference.prediction;
    
    // Extraire les données principales
    const result = {
      surname: prediction.surname?.value || '',
      givenNames: prediction.givenNames?.map(name => name.value) || [],
      firstGivenName: prediction.givenNames?.length > 0 ? prediction.givenNames[0].value : '',
      birthDate: prediction.birthDate?.value || '',
      birthPlace: prediction.birthPlace?.value || '',
      documentNumber: prediction.documentNumber?.value || '',
      nationality: prediction.nationality?.value || '',
      sex: prediction.sex?.value || '',
      address: prediction.address?.value || '',
      idCardNumber: prediction.idCardNumber?.value || '',
      mrz1: prediction.mrz?.mrz1?.value || '',
      mrz2: prediction.mrz?.mrz2?.value || '',
      confidence: {
        surname: prediction.surname?.confidence || 0,
        givenNames: prediction.givenNames?.map(name => name.confidence) || [],
        birthDate: prediction.birthDate?.confidence || 0,
        birthPlace: prediction.birthPlace?.confidence || 0
      }
    };
    
    return result;
  } catch (error) {
    console.error('Erreur lors de l\'analyse Mindee:', error);
    return null;
  }
}

// Fonction pour nettoyer un nom de fichier
function sanitizeFilename(str) {
  return str
    .toLowerCase()
    .replace(/[àáâãäå]/g, 'a')
    .replace(/[èéêë]/g, 'e')
    .replace(/[ìíîï]/g, 'i')
    .replace(/[òóôõö]/g, 'o')
    .replace(/[ùúûü]/g, 'u')
    .replace(/[ç]/g, 'c')
    .replace(/[ñ]/g, 'n')
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// Fonction principale
export async function processIdentities() {
  try {
    console.log('🚀 Début du traitement des identités...');
    
    // Lire le fichier Excel
    const workbook = new ExcelJS.Workbook();
    const excelFiles = fs.readdirSync('./identities').filter(file => file.startsWith('images') && file.endsWith('.xlsx'));
    
    if (excelFiles.length === 0) {
      throw new Error('Aucun fichier Excel trouvé');
    }
    
    const latestExcelFile = excelFiles.sort().pop();
    console.log(`📊 Lecture du fichier Excel: ${latestExcelFile}`);
    
    await workbook.xlsx.readFile(`./identities/${latestExcelFile}`);
    const worksheet = workbook.getWorksheet('Pinterest Images');
    
    const results = [];
    let processedCount = 0;
    let errorCount = 0;
    
    // Parcourir chaque ligne du fichier Excel
    worksheet.eachRow(async (row, rowNumber) => {
      if (rowNumber === 1) return; // Ignorer l'en-tête
      
      const index = row.getCell(1).value;
      const highResUrl = row.getCell(3).value; // URL haute résolution (936x)
      
      if (!highResUrl) return;
      
      console.log(`\n📷 Traitement de l'image ${index}...`);
      console.log(`URL: ${highResUrl}`);
      
      try {
        // Télécharger l'image temporairement
        const tempImagePath = `./identities/temp_${index}.jpg`;
        await downloadImage(highResUrl, tempImagePath);
        console.log(`✅ Image téléchargée: ${tempImagePath}`);
        
        // Analyser l'image avec Mindee
        const analysisResult = await analyzeIdentityCard(tempImagePath);
        
        if (analysisResult && analysisResult.surname && analysisResult.firstGivenName) {
          // Créer le nom de fichier final
          const filename = sanitizeFilename(`${analysisResult.firstGivenName}-${analysisResult.surname}.jpg`);
          const finalImagePath = path.join(assetsDir, filename);
          
          // Déplacer l'image vers le dossier assets avec le bon nom
          fs.renameSync(tempImagePath, finalImagePath);
          console.log(`📁 Image sauvegardée: ${filename}`);
          
          // Ajouter les résultats
          results.push({
            index: index,
            filename: filename,
            originalUrl: row.getCell(2).value,
            highResUrl: highResUrl,
            imagePath: finalImagePath,
            analysis: analysisResult,
            processedAt: new Date().toISOString()
          });
          
          processedCount++;
          console.log(`✅ Analyse réussie: ${analysisResult.firstGivenName} ${analysisResult.surname}`);
        } else {
          console.log(`⚠️ Impossible d'extraire le nom/prénom de l'image ${index}`);
          fs.unlinkSync(tempImagePath); // Supprimer le fichier temporaire
          errorCount++;
        }
        
      } catch (error) {
        console.error(`❌ Erreur lors du traitement de l'image ${index}:`, error.message);
        errorCount++;
        
        // Nettoyer le fichier temporaire en cas d'erreur
        const tempImagePath = `./identities/temp_${index}.jpg`;
        if (fs.existsSync(tempImagePath)) {
          fs.unlinkSync(tempImagePath);
        }
      }
    });
    
    // Attendre que tous les traitements soient terminés
    // (Note: eachRow n'est pas async, nous devons implémenter différemment)
    
  } catch (error) {
    console.error('❌ Erreur générale:', error);
  }
}

// Version corrigée avec traitement séquentiel
export async function processIdentitiesSequential() {
  try {
    console.log('🚀 Début du traitement des identités...');
      // Lire le fichier Excel
    const workbook = new ExcelJS.Workbook();
    let excelFiles = fs.readdirSync('./identities').filter(file => file.startsWith('pinterest_images_') && file.endsWith('.xlsx'));
    
    // Si aucun fichier pinterest_images_ trouvé, chercher images.xlsx
    if (excelFiles.length === 0) {
      excelFiles = fs.readdirSync('./identities').filter(file => file.startsWith('images') && file.endsWith('.xlsx'));
    }
    
    if (excelFiles.length === 0) {
      throw new Error('Aucun fichier Excel trouvé (pinterest_images_*.xlsx ou images.xlsx)');
    }
    
    const latestExcelFile = excelFiles.sort().pop();
    console.log(`📊 Lecture du fichier Excel: ${latestExcelFile}`);
    
    await workbook.xlsx.readFile(`./identities/${latestExcelFile}`);
    const worksheet = workbook.getWorksheet('Pinterest Images');
    
    const results = [];
    let processedCount = 0;
    let errorCount = 0;
    
    // Convertir les lignes en tableau pour traitement séquentiel
    const rows = [];
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) { // Ignorer l'en-tête
        rows.push({
          index: row.getCell(1).value,
          originalUrl: row.getCell(2).value,
          highResUrl: row.getCell(3).value
        });
      }
    });
    
    console.log(`📋 ${rows.length} images à traiter`);
    
    // Traiter chaque image séquentiellement
    for (const rowData of rows) {
      const { index, originalUrl, highResUrl } = rowData;
      
      if (!highResUrl) continue;
      
      console.log(`\n📷 Traitement de l'image ${index}/${rows.length}...`);
      
      try {
        // Télécharger l'image temporairement
        const tempImagePath = `./identities/temp_${index}.jpg`;
        await downloadImage(highResUrl, tempImagePath);
        console.log(`✅ Image téléchargée`);
        
        // Analyser l'image avec Mindee
        const analysisResult = await analyzeIdentityCard(tempImagePath);
        
        if (analysisResult && analysisResult.surname && analysisResult.firstGivenName) {
          // Créer le nom de fichier final
          const filename = sanitizeFilename(`${analysisResult.firstGivenName}-${analysisResult.surname}.jpg`);
          const finalImagePath = path.join(assetsDir, filename);
          
          // Déplacer l'image vers le dossier assets avec le bon nom
          fs.renameSync(tempImagePath, finalImagePath);
          console.log(`📁 Image sauvegardée: ${filename}`);
          
          // Ajouter les résultats
          results.push({
            index: index,
            filename: filename,
            originalUrl: originalUrl,
            highResUrl: highResUrl,
            imagePath: finalImagePath,
            analysis: analysisResult,
            processedAt: new Date().toISOString()
          });
          
          processedCount++;
          console.log(`✅ Analyse réussie: ${analysisResult.firstGivenName} ${analysisResult.surname}`);
        } else {
          console.log(`⚠️ Impossible d'extraire le nom/prénom de l'image ${index}`);
          fs.unlinkSync(tempImagePath); // Supprimer le fichier temporaire
          errorCount++;
        }
        
        // Petite pause entre les requêtes pour éviter la surcharge
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`❌ Erreur lors du traitement de l'image ${index}:`, error.message);
        errorCount++;
        
        // Nettoyer le fichier temporaire en cas d'erreur
        const tempImagePath = `./identities/temp_${index}.jpg`;
        if (fs.existsSync(tempImagePath)) {
          fs.unlinkSync(tempImagePath);
        }
      }
    }
    
    // Sauvegarder les résultats dans un fichier JSON
    const outputFile = `./identities/identities.json`;
    fs.writeFileSync(outputFile, JSON.stringify({
      metadata: {
        processedAt: new Date().toISOString(),
        totalImages: rows.length,
        successfullyProcessed: processedCount,
        errors: errorCount,
        sourceExcelFile: latestExcelFile
      },
      identities: results
    }, null, 2));
    
    console.log(`\n🎉 Traitement terminé !`);
    console.log(`✅ Images traitées avec succès: ${processedCount}`);
    console.log(`❌ Erreurs: ${errorCount}`);
    console.log(`💾 Résultats sauvegardés dans: ${outputFile}`);
    
    return {
      processed: processedCount,
      errors: errorCount,
      outputFile: outputFile,
      results: results
    };
    
  } catch (error) {
    console.error('❌ Erreur générale:', error);
    throw error;
  }
}

// Exécuter le script si appelé directement
console.log('🔍 Vérification du mode d\'exécution...');
console.log('import.meta.url:', import.meta.url);
console.log('process.argv[1]:', process.argv[1]);

// Normaliser les chemins pour la comparaison
const currentFileUrl = import.meta.url;
const executedFileUrl = `file:///${process.argv[1].replace(/\\/g, '/')}`;

console.log('currentFileUrl:', currentFileUrl);
console.log('executedFileUrl:', executedFileUrl);

if (currentFileUrl === executedFileUrl) {
  console.log('✅ Script exécuté directement, démarrage du traitement...');
  (async () => {
    try {
      await processIdentitiesSequential();
    } catch (error) {
      console.error('Erreur lors du traitement:', error);
      process.exit(1);
    }
  })();
} else {
  console.log('📦 Script importé comme module');
}
