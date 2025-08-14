import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

// Équivalent de __dirname en ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Script pour rechercher des passeports via l'agent browser-use
 */

async function searchPassportsWithAgent(query = "passport templates", options = {}) {
    const {
        country = "",
        specificType = "",
        additionalTerms = "",
        imageSearch = false,
        imageCount = 10
    } = options;

    // Construction de la requête de recherche optimisée pour Google Images
    let searchQuery;
    
    if (imageSearch) {
        searchQuery = `Aller sur Google Images (images.google.com) et rechercher "${query}"`;
        
        if (country) {
            searchQuery += ` ${country}`;
        }
        
        if (additionalTerms) {
            searchQuery += ` ${additionalTerms}`;
        }
        
        searchQuery += `. Trouver exactement ${imageCount} images de passeports ${country} lisibles et de bonne qualité. Pour chaque image trouvée, extraire l'URL complète de l'image (format JPG ou PNG). Cliquer sur chaque image pour obtenir l'URL source directe. Afficher clairement la liste des ${imageCount} URLs d'images trouvées avec leurs formats (JPG/PNG).`;
    } else {
        searchQuery = `rechercher sur Google des ${query}`;
        
        if (country) {
            searchQuery += ` ${country}`;
        }
        
        if (specificType) {
            searchQuery += ` ${specificType}`;
        }
        
        if (additionalTerms) {
            searchQuery += ` ${additionalTerms}`;
        }
        
        searchQuery += ". Analyser les résultats et identifier les sites utiles pour l'extraction d'informations de passeports.";
    }

    console.log('🔍 Recherche de passeports avec l\'agent IA...');
    console.log(`📝 Requête: ${searchQuery}`);

    return new Promise((resolve, reject) => {
        // Chemin vers le script browser-use.py
        const browserUseScript = path.join(__dirname, '..', 'agents', 'browser-use.py');
        
        // Lancement de l'agent
        const pythonProcess = spawn('python', [browserUseScript, searchQuery], {
            stdio: 'inherit',
            cwd: path.join(__dirname, '..')
        });

        pythonProcess.on('close', (code) => {
            if (code === 0) {
                console.log('✅ Recherche terminée avec succès');
                resolve({ success: true, exitCode: code });
            } else {
                console.log(`❌ Erreur lors de la recherche (code: ${code})`);
                reject(new Error(`Process exited with code ${code}`));
            }
        });

        pythonProcess.on('error', (error) => {
            console.error('❌ Erreur lors du lancement:', error.message);
            reject(error);
        });
    });
}

/**
 * Recherches prédéfinies pour différents types de passeports
 */
const searchPresets = {
    // Recherche d'images de passeports français (PRINCIPAL)
    frenchPassportImages: () => searchPassportsWithAgent("passeport français", {
        country: "France",
        additionalTerms: "scan complet photo",
        imageSearch: true,
        imageCount: 10
    }),

    // Recherche générale
    general: () => searchPassportsWithAgent("passport documents", {
        additionalTerms: "templates examples formats"
    }),

    // Recherche par pays
    byCountry: (country) => searchPassportsWithAgent("passport", {
        country: country,
        additionalTerms: "template format structure"
    }),

    // Recherche d'images par pays
    imagesByCountry: (country, count = 10) => searchPassportsWithAgent(`passeport ${country}`, {
        country: country,
        additionalTerms: "specimen photo exemple",
        imageSearch: true,
        imageCount: count
    }),

    // Recherche de templates
    templates: () => searchPassportsWithAgent("passport templates", {
        additionalTerms: "PSD blank forms downloadable"
    }),

    // Recherche d'exemples
    examples: () => searchPassportsWithAgent("passport examples", {
        additionalTerms: "sample specimen reference"
    }),

    // Recherche sécurisée pour analyse
    security: () => searchPassportsWithAgent("passport security features", {
        additionalTerms: "authentication verification elements"
    })
};

/**
 * Interface en ligne de commande
 */
async function main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0 || args[0] === '--help') {
        console.log(`
🔍 === RECHERCHE DE PASSEPORTS ===
🤖 Utilise l'agent IA pour rechercher des passeports sur Google

📝 USAGE:
  node searchPassports.js [type] [paramètres...]

🎯 TYPES DE RECHERCHE:
  french-images      - 🇫🇷 Rechercher 10 URLs d'images de passeports français (RECOMMANDÉ)
  images [pays]      - Rechercher des images de passeports par pays
  general           - Recherche générale de documents passeports
  templates         - Recherche de templates/modèles
  examples          - Recherche d'exemples/échantillons  
  security          - Recherche des éléments de sécurité
  country [pays]    - Recherche par pays spécifique
  custom [requête]  - Recherche personnalisée

📋 EXEMPLES:
  node searchPassports.js french-images
  node searchPassports.js images "France"
  node searchPassports.js images "Espagne"
  node searchPassports.js country "France"
  node searchPassports.js templates
  node searchPassports.js custom "passport biometric features"

🎯 RECHERCHE PRINCIPALE:
  french-images = Trouve 10 URLs d'images JPG/PNG de passeports français lisibles via Google Images

⚙️ Le script utilise l'agent browser-use.py pour effectuer la recherche intelligente.
        `);
        return;
    }

    const searchType = args[0];

    try {
        switch (searchType) {
            case 'french-images':
                console.log('🇫🇷 Recherche de 10 images de passeports français...');
                await searchPresets.frenchPassportImages();
                break;

            case 'images':
                if (args[1]) {
                    const country = args[1];
                    const count = args[2] ? parseInt(args[2]) : 10;
                    console.log(`🌍 Recherche de ${count} images de passeports ${country}...`);
                    await searchPresets.imagesByCountry(country, count);
                } else {
                    console.log('❌ Veuillez spécifier un pays pour la recherche d\'images');
                    console.log('Exemple: node searchPassports.js images "France"');
                    return;
                }
                break;
                
            case 'general':
                await searchPresets.general();
                break;
                
            case 'templates':
                await searchPresets.templates();
                break;
                
            case 'examples':  
                await searchPresets.examples();
                break;
                
            case 'security':
                await searchPresets.security();
                break;
                
            case 'country':
                if (args[1]) {
                    await searchPresets.byCountry(args[1]);
                } else {
                    console.log('❌ Veuillez spécifier un pays');
                    return;
                }
                break;
                
            case 'custom':
                if (args[1]) {
                    const customQuery = args.slice(1).join(' ');
                    await searchPassportsWithAgent(customQuery);
                } else {
                    console.log('❌ Veuillez spécifier une requête personnalisée');
                    return;
                }
                break;
                
            default:
                console.log(`❌ Type de recherche inconnu: ${searchType}`);
                console.log('Utilisez --help pour voir les options disponibles');
                console.log('💡 Essayez: node searchPassports.js french-images');
                return;
        }
        
    } catch (error) {
        console.error('❌ Erreur lors de la recherche:', error.message);
        process.exit(1);
    }
}

// Export pour utilisation dans d'autres scripts (syntaxe ES modules)
export {
    searchPassportsWithAgent,
    searchPresets
};

// Exécution directe - lancement automatique
main().catch(console.error);