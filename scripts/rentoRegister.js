import { processAccountsByService } from '../gatewayRegister.js';
import { rentoWorkflow } from '../workflows/rentoWorkflow.js';

console.log('🚀 Rento Register Script démarré...');

// Fonction pour traiter tous les comptes Rento depuis Supabase
async function processRentoAccounts() {
  try {
    console.log('🚀 Démarrage du processus Rento...');
    const result = await processAccountsByService('rento', rentoWorkflow);
    console.log('🎉 Processus Rento terminé avec succès:', result);
    return result;
  } catch (error) {
    console.error('❌ Erreur lors du traitement Rento:', error);
    throw error;
  }
}

// Exporter les fonctions
export { processRentoAccounts };

// Exécuter le script si appelé directement (version Windows compatible)
const isMainModule = process.argv[1] && process.argv[1].includes('rentoRegister.js');

if (isMainModule) {
  (async () => {
    try {
      const result = await processRentoAccounts();
      console.log('🎉 Processus terminé avec succès:', result);
    } catch (error) {
      console.error('❌ Erreur lors du traitement:', error);
      console.error('Stack trace:', error.stack);
      process.exit(1);
    }
  })();
}
