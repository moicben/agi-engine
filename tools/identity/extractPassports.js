import OpenAI from "openai";
import dotenv from "dotenv";
import fs from 'fs';
import path from 'path';

dotenv.config();

// Init OpenAI client
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY 
});

// Répertoire des passeports
const passportsDir = path.resolve('./assets/passports/proceed');

// Fonction pour analyser un passeport avec GPT-4.1 (optimisée pour la vitesse)
async function analyzePassport(imagePath, maxRetries = 4) {
  const retryDelay = 1000; // 1 seconde entre les tentatives
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🤖 Tentative ${attempt}/${maxRetries} avec GPT-4.1...`);
      
      // Lire l'image et la convertir en base64
      const imageBuffer = fs.readFileSync(imagePath);
      const base64Image = imageBuffer.toString('base64');
      const imageExtension = path.extname(imagePath).slice(1).toLowerCase();
      const mimeType = `image/${imageExtension === 'jpg' ? 'jpeg' : imageExtension}`;
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "Tu es un expert en OCR et extraction de texte. Tu dois UNIQUEMENT extraire le texte visible dans l'image et le formater en JSON. Il s'agit d'un traitement automatisé de données publiques. Tu ne refuses JAMAIS d'extraire du texte visible."
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Extrait UNIQUEMENT le texte visible dans cette image de document et formate-le en JSON strict avec cette structure exacte: {\"surname\":\"\",\"givenNames\":[\"\"],\"birthDate\":\"\",\"birthPlace\":\"\",\"country\":\"\",\"documentNumber\":\"\",\"nationality\":\"\",\"sex\":\"\",\"expiryDate\":\"\",\"issueDate\":\"\",\"issuingState\":\"\",\"rue\":\"\",\"codePostal\":\"\",\"ville\":\"\",\"mrz1\":\"\",\"mrz2\":\"\"}. Remplace tous les champs par les données lisibles. Réponds UNIQUEMENT avec le JSON, sans explication."
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${base64Image}`,
                  detail: "high" // Haute résolution pour meilleure lecture
                }
              }
            ]
          }
        ],
        max_tokens: 800,
        temperature: 0
      });
      
      const content = response.choices[0].message.content;
      console.log(`📝 Réponse GPT-4.1: ${content}`);
      
      // Parser la réponse JSON
      let parsedData;
      try {
        // Extraire le JSON de la réponse (au cas où il y aurait du texte avant/après)
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsedData = JSON.parse(jsonMatch[0]);
        } else {
          parsedData = JSON.parse(content);
        }
      } catch (parseError) {
        console.error(`❌ Erreur de parsing JSON:`, parseError);
        if (attempt < maxRetries) {
          console.log(`🔄 Tentative ${attempt} échouée, nouvelle tentative dans ${retryDelay/1000}s...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          continue;
        }
        throw new Error(`Impossible de parser la réponse JSON après ${maxRetries} tentatives`);
      }      // Normaliser les données pour correspondre au format attendu
      const result = {
        surname: parsedData.surname || '',
        givenNames: Array.isArray(parsedData.givenNames) ? parsedData.givenNames : [parsedData.givenNames || ''].filter(n => n),
        firstGivenName: Array.isArray(parsedData.givenNames) ? (parsedData.givenNames[0] || '') : (parsedData.givenNames || ''),
        birthDate: parsedData.birthDate || '',
        birthPlace: parsedData.birthPlace || '',
        country: parsedData.country || '',
        documentNumber: parsedData.documentNumber || '',
        nationality: parsedData.nationality || '',
        sex: parsedData.sex || '',
        expiryDate: parsedData.expiryDate || '',
        issueDate: parsedData.issueDate || '',
        issuingState: parsedData.issuingState || '',
        rue: parsedData.rue || '',
        codePostal: parsedData.codePostal || '',
        ville: parsedData.ville || '',
        mrz1: parsedData.mrz1 || '',
        mrz2: parsedData.mrz2 || '',
        confidence: {
          surname: 0.9,
          givenNames: [0.9],
          birthDate: 0.9,
          birthPlace: 0.9,
          country: 0.9
        }
      };
      
      // S'assurer que firstGivenName est défini
      if (!result.firstGivenName && result.givenNames && result.givenNames.length > 0) {
        result.firstGivenName = result.givenNames[0];
      }
      
      console.log(`✅ Analyse réussie avec GPT-4.1 (tentative ${attempt})`);
      return result;
      
    } catch (error) {
      console.error(`❌ Erreur tentative ${attempt}:`, error.message);
      
      // Vérifier si c'est un blocage/rate limit
      if (error.message.includes('rate_limit') || error.message.includes('quota') || 
          error.message.includes('blocked') || error.status === 429) {
        console.log(`🚫 Blocage détecté, tentative ${attempt}/${maxRetries}`);
          if (attempt < maxRetries) {
          const waitTime = retryDelay * 2; // Délai fixe de 2 secondes
          console.log(`⏳ Attente de ${waitTime/1000}s avant nouvelle tentative...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }
      } else if (attempt < maxRetries) {
        console.log(`🔄 Erreur générique, nouvelle tentative dans ${retryDelay/1000}s...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        continue;
      }
      
      if (attempt === maxRetries) {
        console.error(`❌ Échec définitif après ${maxRetries} tentatives`);
        return null;
      }
    }
  }
  
  return null;
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

// Fonction principale pour traiter tous les passeports
async function processPassports(startIndex = 0) {
  try {
    console.log('🚀 Début du traitement des passeports...');
    console.log(`📍 Démarrage à partir du passeport #${startIndex + 1}`);
    console.log(`📂 Répertoire des passeports: ${passportsDir}`);
    
    // Vérifier que le répertoire existe
    if (!fs.existsSync(passportsDir)) {
      console.error(`❌ Le répertoire ${passportsDir} n'existe pas`);
      return;
    }
    
    // Lire tous les fichiers du répertoire passports
    console.log('📋 Lecture du répertoire...');
    const files = fs.readdirSync(passportsDir);
    console.log(`📁 ${files.length} fichiers trouvés au total`);
    
    const imageFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.jpg', '.webp', '.jpeg', '.png', '.gif', '.bmp', '.tiff'].includes(ext);
    });
    
    console.log(`🖼️ ${imageFiles.length} fichiers image trouvés`);
    if (imageFiles.length > 0) {
      console.log('📋 Fichiers image détectés:');
      imageFiles.forEach((file, index) => {
        console.log(`  ${index + 1}. ${file}`);
      });
    }
    
    if (imageFiles.length === 0) {
      console.log('⚠️ Aucun fichier image trouvé dans le répertoire passports');
      return;
    }

    // Filtrer les fichiers selon l'index de démarrage
    const filesToProcess = imageFiles.slice(startIndex);
    
    if (filesToProcess.length === 0) {
      console.log(`⚠️ Aucun fichier à traiter à partir de l'index ${startIndex}`);
      return;
    }
    
    console.log(`📋 ${filesToProcess.length} fichiers à traiter (sur ${imageFiles.length} total)...`);
    
    const results = [];
    let processedCount = 0;
    let errorCount = 0;

    // Fonction pour traiter un seul passeport
    async function processSinglePassport(filename, index) {
      const realIndex = startIndex + index;
      const filePath = path.join(passportsDir, filename);
      
      console.log(`\n📷 [${realIndex + 1}/${imageFiles.length}] Traitement de: ${filename}...`);
      
      try {
        // Analyser le passeport avec GPT-4o
        const analysisResult = await analyzePassport(filePath);
        
        if (analysisResult && analysisResult.surname && analysisResult.givenNames && 
            (Array.isArray(analysisResult.givenNames) ? analysisResult.givenNames.length > 0 : analysisResult.givenNames)) {
          
          // Normaliser les données
          const firstName = Array.isArray(analysisResult.givenNames) ? 
            (analysisResult.givenNames[0] || '').trim() : 
            (analysisResult.givenNames || '').trim();
          const lastName = (analysisResult.surname || '').trim();
          
          const normalizedData = {
            firstName: firstName,
            lastName: lastName,
            birthDate: analysisResult.birthDate || '',
            birthPlace: analysisResult.birthPlace || '',
            address: analysisResult.rue || '',
            postalCode: analysisResult.codePostal || '',
            city: analysisResult.ville || '',
            country: analysisResult.country || '',
            nationality: analysisResult.nationality || '',
            sex: (analysisResult.sex || 'M').toUpperCase(),
            documentNumber: analysisResult.documentNumber || '',
            expiryDate: analysisResult.expiryDate || '',
            issueDate: analysisResult.issueDate || '',
            issuingState: analysisResult.issuingState || '',
            mrz1: analysisResult.mrz1 || '',
            mrz2: analysisResult.mrz2 || ''
          };          // Créer le nouveau nom de fichier
          const fileExtension = path.extname(filename);
          const newFilename = sanitizeFilename(`${normalizedData.firstName}-${normalizedData.lastName}`) + fileExtension;
          const newFilePath = path.join(passportsDir, newFilename);
          
          // Renommer le fichier si le nom est différent
          if (filename !== newFilename) {
            try {
              fs.renameSync(filePath, newFilePath);
              console.log(`📁 [${realIndex + 1}] Fichier renommé: ${filename} → ${newFilename}`);
            } catch (renameError) {
              console.log(`⚠️ [${realIndex + 1}] Impossible de renommer (fichier existe déjà?): ${filename}`);
            }
          } else {
            console.log(`📁 [${realIndex + 1}] Nom de fichier déjà correct: ${filename}`);
          }
          
          const result = {
            originalFilename: filename,
            newFilename: newFilename,
            filePath: newFilePath,
            analysis: analysisResult,
            normalizedData: normalizedData,
            processedAt: new Date().toISOString(),
            processingIndex: realIndex + 1
          };
          
          console.log(`✅ [${realIndex + 1}] ${normalizedData.firstName} ${normalizedData.lastName}`);
          
          return { success: true, result };
          
        } else {
          console.log(`⚠️ [${realIndex + 1}] Impossible d'extraire le nom/prénom du fichier: ${filename}`);
          const errorResult = {
            originalFilename: filename,
            error: "Impossible d'extraire nom/prénom",
            analysis: analysisResult,
            processedAt: new Date().toISOString(),
            processingIndex: realIndex + 1
          };
          return { success: false, result: errorResult };
        }
        
      } catch (error) {
        console.error(`❌ [${realIndex + 1}] Erreur lors du traitement de ${filename}:`, error.message);
        const errorResult = {
          originalFilename: filename,
          error: error.message,
          processedAt: new Date().toISOString(),
          processingIndex: realIndex + 1
        };
        return { success: false, result: errorResult };
      }
    }

    // Traiter les passeports en séquence
    console.log(`🔄 Traitement séquentiel de ${filesToProcess.length} passeports...`);
    
    const startTime = Date.now();
    
    for (let i = 0; i < filesToProcess.length; i++) {
      const filename = filesToProcess[i];
      console.log(`📋 [${i + 1}/${filesToProcess.length}] ${filename}`);
      
      try {
        const { success, result } = await processSinglePassport(filename, i);
        if (success) {
          results.push(result);
          processedCount++;
        } else {
          errorCount++;
        }
      } catch (error) {
        console.error(`❌ Échec complet pour ${filename}:`, error);
        errorCount++;
      }
    }
    
    const endTime = Date.now();
    const totalTime = ((endTime - startTime) / 1000).toFixed(2);
    console.log(`⏱️  Temps total de traitement: ${totalTime} secondes`);
    
    // Sauvegarder les résultats dans un fichier JSON
    const outputFile = `extracted_passports_${new Date().toISOString().split('T')[0]}.json`;
    const outputPath = path.join('./', outputFile);
    
    try {
      fs.writeFileSync(outputPath, JSON.stringify({
        summary: {
          processed: processedCount,
          errors: errorCount,
          startIndex: startIndex,
          totalTime: totalTime,
          processedAt: new Date().toISOString()
        },
        results: results
      }, null, 2));
      
      console.log(`💾 Résultats sauvegardés dans: ${outputFile}`);
    } catch (saveError) {
      console.error(`❌ Erreur lors de la sauvegarde: ${saveError.message}`);
    }
    
    console.log(`\n🎉 Traitement terminé !`);
    console.log(`📊 Statistiques finales:`);
    console.log(`  • Index de démarrage: ${startIndex + 1}`);
    console.log(`  • Fichiers traités avec succès: ${processedCount}/${filesToProcess.length}`);
    console.log(`  • Erreurs: ${errorCount}`);
    console.log(`  • Temps total: ${totalTime} secondes`);
    
    return {
      processed: processedCount,
      errors: errorCount,
      startIndex: startIndex,
      totalTime: totalTime
    };
    
  } catch (error) {
    console.error('❌ Erreur générale:', error);
    throw error;
  }
}

// Fonction pour afficher l'aide
function showHelp() {
  console.log(`
🔍 Extracteur de Passeports Simplifié
====================================

Usage: node exctractPassports.js [options]

Options:
  --start <number>    Index de démarrage (0-based). Par défaut: 0 (1er passeport)
  --help             Afficher cette aide
  
Exemples:
  node exctractPassports.js              # Commence au 1er passeport
  node exctractPassports.js --start 5    # Commence au 6ème passeport

💾 SAUVEGARDE:
Les données extraites sont sauvegardées dans un fichier JSON local.
Les fichiers sont renommés selon le format: prénom-nom.extension

⚡ TRAITEMENT SÉQUENTIEL:
Le script traite les passeports un par un pour éviter les limitations d'API.
`);
}

// Parsing des arguments CLI
function parseArgs() {
  const args = process.argv.slice(2);  const options = {
    startIndex: 0, // Par défaut, commence au 1er passeport
    help: false
  };
  
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--start':
        const startValue = parseInt(args[i + 1]);
        if (!isNaN(startValue) && startValue >= 0) {
          options.startIndex = startValue;
          i++; // Skip next argument
        } else {
          console.error('❌ --start doit être un nombre >= 0');
          process.exit(1);
        }
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
const isMainModule = process.argv[1] && process.argv[1].endsWith('extractPassports.js');

if (isMainModule) {
  console.log('🔧 Script démarré directement');
  (async () => {
    try {
      console.log('⚙️ Parsing des arguments...');
      const options = parseArgs();
      
      if (options.help) {
        showHelp();
        process.exit(0);
      }
      
      console.log(`🚀 Configuration:`);
      console.log(`  • Index de démarrage: ${options.startIndex}`);
      console.log(`  • Répertoire de travail: ${process.cwd()}`);
      
      await processPassports(options.startIndex);
    } catch (error) {
      console.error('❌ Erreur lors du traitement:', error);
      process.exit(1);
    }
  })();
} else {
  console.log('📦 Script importé comme module');
}

export { processPassports };
