import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import { fileURLToPath } from 'url';

/**
 * Renomme les fichiers de passeport dans le dossier `proceed` en format `prenom-nom.jpg`.
 * @param {string} csvPath - Chemin vers le fichier CSV contenant les données.
 * @param {string} proceedDir - Chemin vers le dossier contenant les passeports.
 */
export function renamePassportsFromCsv(csvPath, proceedDir) {
    try {
        console.log('🚀 Début du renommage des passeports...');
        
        // Lire le fichier CSV
        const sheetData = [];
        
        return new Promise((resolve, reject) => {
            fs.createReadStream(csvPath)
                .pipe(csv())
                .on('data', (row) => {
                    sheetData.push(row);
                })
                .on('end', () => {
                    try {
                        console.log(`📋 ${sheetData.length} enregistrements trouvés dans le CSV`);
                        console.log(sheetData);

                        // Lire les fichiers du dossier `proceed`
                        const files = fs.readdirSync(proceedDir);
                        let index = 1;
                        let renamedCount = 0;
                        let errorCount = 0;

                        sheetData.forEach(account => {
                            if (!account.FirstName || !account.LastName) {
                                console.warn(`⚠️ Données manquantes pour:`, account);
                                errorCount++;
                                return;
                            }

                            const cleanFirstName = account.FirstName.toLowerCase().split(' ')[0];
                            const cleanLastName = account.LastName.toLowerCase()
                                .replace(/\s+/g, '-')
                                .replace(/[éèêë]/g, 'e')
                                .replace(/[àâä]/g, 'a')
                                .replace(/[ùûü]/g, 'u')
                                .replace(/[ôö]/g, 'o')
                                .replace(/[îï]/g, 'i')
                                .replace(/ç/g, 'c');

                            const newFileName = `${cleanFirstName}-${cleanLastName}.jpg`;
                            console.log(`Processing: ${newFileName}`);

                            const matchingFile = files.find(file => file === `passport-${String(index)}.jpg`);

                            if (matchingFile) {
                                const oldFilePath = path.join(proceedDir, matchingFile);
                                const newFilePath = path.join(proceedDir, newFileName);

                                fs.renameSync(oldFilePath, newFilePath);
                                console.log(`✅ Renommé: ${matchingFile} -> ${newFileName}`);
                                renamedCount++;
                            } else {
                                console.warn(`⚠️ Aucun fichier correspondant trouvé pour: ${account.FirstName} ${account.LastName}`);
                                errorCount++;
                            }
                            index++;
                        });

                        console.log(`\n🎉 Renommage terminé !`);
                        console.log(`📊 Statistiques:`);
                        console.log(`  • Fichiers renommés: ${renamedCount}`);
                        console.log(`  • Erreurs: ${errorCount}`);

                        resolve({
                            renamed: renamedCount,
                            errors: errorCount
                        });

                    } catch (error) {
                        console.error('❌ Erreur lors du renommage des passeports:', error);
                        reject(error);
                    }
                })
                .on('error', (error) => {
                    console.error('❌ Erreur lors de la lecture du fichier CSV:', error);
                    reject(error);
                });
        });

    } catch (error) {
        console.error('❌ Erreur lors du renommage des passeports:', error);
        throw error;
    }
}

// Exemple d'utilisation
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const csvPath = path.resolve(__dirname, '..', 'assets', 'passports', 'passports_data.csv');
const proceedDir = path.resolve(__dirname, '..', 'assets', 'passports', 'proceed');

console.log('CSV Path:', csvPath);
console.log('Proceed Directory:', proceedDir);

// Exécuter la fonction de renommage
(async () => {
    try {
        await renamePassportsFromCsv(csvPath, proceedDir);
    } catch (error) {
        console.error('❌ Erreur lors de l\'exécution:', error);
        process.exit(1);
    }
})();