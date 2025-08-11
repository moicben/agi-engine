import { processAccountsByService } from './gatewayRegister.js';
import { bricksWorkflow } from '../workflows/bricksWorkflow.js';

console.log('🚀 Bricks Register Script démarré...');

// Fonction pour traiter tous les comptes Bricks depuis Supabase
async function processBricksAccounts() {
  try {
    console.log('🚀 Démarrage du processus Bricks...');
    const result = await processAccountsByService('bricks', bricksWorkflow);
    console.log('🎉 Processus Bricks terminé avec succès:', result);
    return result;
  } catch (error) {
    console.error('❌ Erreur lors du traitement Bricks:', error);
    throw error;
  }
}

// Exporter les fonctions
export { processBricksAccounts };

// Exécuter le script si appelé directement (version Windows compatible)
const isMainModule = process.argv[1] && process.argv[1].includes('bricksRegister.js');

if (isMainModule) {
  (async () => {
    try {
      const result = await processBricksAccounts();
      console.log('🎉 Processus terminé avec succès:', result);
    } catch (error) {
      console.error('❌ Erreur lors du traitement:', error);
      console.error('Stack trace:', error.stack);
      process.exit(1);
    }
  })();
}
