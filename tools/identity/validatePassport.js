import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Vérifie si un fichier de passeport est valide
 * @param {string} passportPath - Chemin vers le fichier de passeport
 * @returns {Promise<Object>} Résultat de la validation
 */
async function validatePassport(passportPath) {
    const validationResult = {
        isValid: false,
        errors: [],
        warnings: [],
        fileInfo: null,
        imageInfo: null
    };

    try {
        // 1. Vérifier si le fichier existe
        if (!fs.existsSync(passportPath)) {
            validationResult.errors.push('Le fichier n\'existe pas');
            return validationResult;
        }

        // 2. Obtenir les informations du fichier
        const stats = fs.statSync(passportPath);
        validationResult.fileInfo = {
            size: stats.size,
            sizeKB: Math.round(stats.size / 1024),
            sizeMB: Math.round(stats.size / (1024 * 1024) * 100) / 100,
            created: stats.birthtime,
            modified: stats.mtime
        };

        // 3. Vérifier la taille du fichier (doit être > 10KB et < 50MB)
        if (stats.size < 10 * 1024) {
            validationResult.errors.push('Fichier trop petit (< 10KB)');
        }
        if (stats.size > 50 * 1024 * 1024) {
            validationResult.errors.push('Fichier trop volumineux (> 50MB)');
        }

        // 4. Vérifier l'extension
        const ext = path.extname(passportPath).toLowerCase();
        const validExtensions = ['.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.webp'];
        if (!validExtensions.includes(ext)) {
            validationResult.errors.push(`Extension non supportée: ${ext}`);
        }

        // 5. Analyser l'image avec Sharp
        try {
            const metadata = await sharp(passportPath).metadata();
            validationResult.imageInfo = {
                width: metadata.width,
                height: metadata.height,
                format: metadata.format,
                colorSpace: metadata.space,
                channels: metadata.channels,
                density: metadata.density,
                hasAlpha: metadata.hasAlpha,
                orientation: metadata.orientation
            };

            // 6. Vérifications de l'image
            // Résolution minimale pour un passeport (généralement 300 DPI minimum)
            if (metadata.width < 600 || metadata.height < 800) {
                validationResult.warnings.push('Résolution potentiellement trop faible pour un passeport');
            }

            // Vérifier le ratio d'aspect (approximativement 1.4:1 pour un passeport)
            const aspectRatio = metadata.width / metadata.height;
            if (aspectRatio < 1.2 || aspectRatio > 1.6) {
                validationResult.warnings.push(`Ratio d'aspect inhabituel: ${aspectRatio.toFixed(2)}`);
            }

            // 7. Vérifier la qualité de l'image (statistiques basiques)
            const { channels } = await sharp(passportPath).stats();
            const brightness = channels.reduce((sum, channel) => sum + channel.mean, 0) / channels.length;
            
            if (brightness < 50) {
                validationResult.warnings.push('Image potentiellement trop sombre');
            } else if (brightness > 200) {
                validationResult.warnings.push('Image potentiellement trop claire');
            }

        } catch (imageError) {
            validationResult.errors.push(`Erreur d'analyse d'image: ${imageError.message}`);
        }

        // 8. Détection basique de contenu (recherche de patterns de texte typiques d'un passeport)
        try {
            // Conversion en buffer pour analyse basique
            const buffer = await sharp(passportPath)
                .greyscale()
                .resize(800, null, { withoutEnlargement: true })
                .jpeg({ quality: 90 })
                .toBuffer();

            // Ici on pourrait ajouter une analyse OCR basique avec tesseract.js
            // Pour l'instant, on se contente de vérifier que l'image peut être traitée
            if (buffer.length > 0) {
                validationResult.imageInfo.processable = true;
            }

        } catch (processError) {
            validationResult.warnings.push(`Difficultés de traitement: ${processError.message}`);
        }

        // 9. Déterminer si le fichier est globalement valide
        validationResult.isValid = validationResult.errors.length === 0;

        return validationResult;

    } catch (error) {
        validationResult.errors.push(`Erreur générale: ${error.message}`);
        return validationResult;
    }
}

/**
 * Affiche les résultats de validation de manière formatée
 * @param {Object} result - Résultat de la validation
 * @param {string} filename - Nom du fichier
 */
function displayValidationResult(result, filename) {
    console.log(`\n📄 Validation de: ${filename}`);
    console.log('=' .repeat(50));

    if (result.isValid) {
        console.log('✅ FICHIER VALIDE');
    } else {
        console.log('❌ FICHIER INVALIDE');
    }

    if (result.fileInfo) {
        console.log(`\n📊 Informations du fichier:`);
        console.log(`  • Taille: ${result.fileInfo.sizeKB} KB (${result.fileInfo.sizeMB} MB)`);
        console.log(`  • Créé: ${result.fileInfo.created.toLocaleString()}`);
        console.log(`  • Modifié: ${result.fileInfo.modified.toLocaleString()}`);
    }

    if (result.imageInfo) {
        console.log(`\n🖼️  Informations de l'image:`);
        console.log(`  • Dimensions: ${result.imageInfo.width} x ${result.imageInfo.height} px`);
        console.log(`  • Format: ${result.imageInfo.format?.toUpperCase()}`);
        console.log(`  • Canaux: ${result.imageInfo.channels}`);
        console.log(`  • Espace colorimétrique: ${result.imageInfo.colorSpace}`);
        if (result.imageInfo.density) {
            console.log(`  • Densité: ${result.imageInfo.density} DPI`);
        }
    }

    if (result.errors.length > 0) {
        console.log(`\n❌ Erreurs (${result.errors.length}):`);
        result.errors.forEach(error => console.log(`  • ${error}`));
    }

    if (result.warnings.length > 0) {
        console.log(`\n⚠️  Avertissements (${result.warnings.length}):`);
        result.warnings.forEach(warning => console.log(`  • ${warning}`));
    }
}

/**
 * Valide plusieurs fichiers de passeports
 * @param {string[]} filePaths - Chemins vers les fichiers
 */
async function validateMultiplePassports(filePaths) {
    const results = [];
    
    console.log(`🚀 Validation de ${filePaths.length} fichier(s)...`);
    
    for (let i = 0; i < filePaths.length; i++) {
        const filePath = filePaths[i];
        const filename = path.basename(filePath);
        
        console.log(`\n[${i + 1}/${filePaths.length}] Traitement de: ${filename}...`);
        
        const result = await validatePassport(filePath);
        results.push({ filename, result });
        
        displayValidationResult(result, filename);
    }
    
    // Résumé global
    const validFiles = results.filter(r => r.result.isValid).length;
    const invalidFiles = results.length - validFiles;
    
    console.log(`\n📈 RÉSUMÉ GLOBAL`);
    console.log('=' .repeat(50));
    console.log(`✅ Fichiers valides: ${validFiles}/${results.length}`);
    console.log(`❌ Fichiers invalides: ${invalidFiles}/${results.length}`);
    
    return results;
}

// Script principal
async function main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        // Par défaut, vérifier passport-1.jpg dans le dossier assets/passports/proceed
        const defaultPath = path.resolve(__dirname, '..', 'assets', 'passports', 'proceed', 'passport-1.jpg');
        
        console.log('🔍 Aucun fichier spécifié, utilisation du fichier par défaut:');
        console.log(`   ${defaultPath}`);
        
        const result = await validatePassport(defaultPath);
        displayValidationResult(result, 'passport-1.jpg');
        
    } else if (args.includes('--help') || args.includes('-h')) {
        console.log(`
📋 Validateur de fichiers de passeport
=====================================

Usage: node validatePassport.js [options] [fichiers...]

Options:
  --help, -h      Afficher cette aide
  --all           Valider tous les fichiers passport-*.jpg dans proceed/
  
Exemples:
  node validatePassport.js
  node validatePassport.js passport-1.jpg passport-2.jpg
  node validatePassport.js --all
  node validatePassport.js ../assets/passports/proceed/passport-1.jpg

🔍 FONCTION:
Ce script vérifie la validité des fichiers de passeport en analysant:
• Existence et taille du fichier
• Format et métadonnées de l'image
• Résolution et qualité
• Ratio d'aspect approprié pour un passeport
        `);
        
    } else if (args.includes('--all')) {
        // Valider tous les fichiers passport-*.jpg
        const proceedDir = path.resolve(__dirname, '..', 'assets', 'passports', 'proceed');
        
        if (!fs.existsSync(proceedDir)) {
            console.error(`❌ Dossier non trouvé: ${proceedDir}`);
            process.exit(1);
        }
        
        const files = fs.readdirSync(proceedDir)
            .filter(file => file.match(/^passport-\d+\.(jpg|jpeg|png)$/i))
            .map(file => path.join(proceedDir, file));
        
        if (files.length === 0) {
            console.log('⚠️  Aucun fichier passport-*.jpg trouvé dans le dossier proceed/');
            process.exit(0);
        }
        
        await validateMultiplePassports(files);
        
    } else {
        // Valider les fichiers spécifiés
        const filePaths = args.map(arg => {
            if (path.isAbsolute(arg)) {
                return arg;
            } else {
                // Chemin relatif, essayer dans le dossier proceed d'abord
                const proceedPath = path.resolve(__dirname, '..', 'assets', 'passports', 'proceed', arg);
                if (fs.existsSync(proceedPath)) {
                    return proceedPath;
                }
                // Sinon, chemin relatif au répertoire courant
                return path.resolve(arg);
            }
        });
        
        await validateMultiplePassports(filePaths);
    }
}

// Exécuter si le script est appelé directement
main().catch

export { validatePassport, validateMultiplePassports };
