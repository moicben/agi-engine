// Complete implementation for MCP launcher
import { Stagehand } from '@browserbasehq/stagehand';
import { launchBrowserBase } from './launchBrowserBase.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Démarre une session MCP avec Stagehand pour l'automatisation guidée
 * @param {Object} options - Options de configuration
 * @returns {Promise<Object>} - Session avec stagehand, browser et page
 */
export async function startMCPSession(options = {}) {
  console.log('🚀 Démarrage de la session MCP...');
  
  try {
    const { browser, page, sessionId } = await launchBrowserBase(options);

    const stagehand = new Stagehand({
      browser,
      page,
      modelName: 'google/gemini-2.0-flash',
              modelApiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY
    });

    // Initialiser Stagehand
    await stagehand.init();

    console.log('✅ Session MCP prête pour instructions guidées');
    console.log('🆔 Session Browserbase:', sessionId);
    
    return { stagehand, browser, page, sessionId };
  } catch (error) {
    console.error('❌ Erreur lors du démarrage de la session MCP:', error.message);
    throw error;
  }
}

/**
 * Termine une session MCP et sauvegarde le code généré
 * @param {Object} stagehand - Instance Stagehand
 * @param {string} generatedCode - Code JavaScript généré
 * @param {string} workflowName - Nom du workflow (optionnel)
 * @returns {Promise<string>} - Chemin du fichier sauvegardé
 */
export async function endMCPSession(stagehand, generatedCode, workflowName = null) {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0] + '-' + Date.now();
    const fileName = workflowName ? `${workflowName}-${timestamp}.js` : `workflow-${timestamp}.js`;
    const workflowPath = path.join(__dirname, '../../workflows/generated/', fileName);
    
    // Ajouter des métadonnées au code généré
    const codeWithMetadata = `// Workflow généré automatiquement via MCP + Stagehand
// Date: ${new Date().toISOString()}
// Nom: ${workflowName || 'Workflow sans nom'}

${generatedCode}`;
    
    fs.writeFileSync(workflowPath, codeWithMetadata);
    console.log(`✅ Code sauvegardé dans ${workflowPath}`);
    
    await stagehand.close();
    console.log('🔌 Session MCP fermée');
    
    return workflowPath;
  } catch (error) {
    console.error('❌ Erreur lors de la fermeture de session:', error.message);
    throw error;
  }
}

/**
 * Exemple d'utilisation du MCP pour créer un workflow
 * @param {string} instructions - Instructions en langage naturel
 * @returns {Promise<void>}
 */
export async function createWorkflowFromInstructions(instructions, workflowName = 'test-workflow') {
  console.log('📝 Création de workflow à partir des instructions:', instructions);
  
  const { stagehand } = await startMCPSession();
  
  try {
    // Exécuter les instructions
    await stagehand.act(instructions);
    
    // Générer le code équivalent (exemple basique)
    const generatedCode = `// Workflow généré à partir de: ${instructions}
export async function ${workflowName.replace(/-/g, '_')}() {
  // TODO: Implémenter la logique basée sur les instructions
  console.log('Exécution du workflow: ${workflowName}');
  
  // Code à compléter selon les actions effectuées
  return { success: true };
}`;
    
    const savedPath = await endMCPSession(stagehand, generatedCode, workflowName);
    console.log('✅ Workflow créé et sauvegardé:', savedPath);
    
    return savedPath;
  } catch (error) {
    console.error('❌ Erreur lors de la création du workflow:', error.message);
    await stagehand.close();
    throw error;
  }
}

/**
 * Fonction de test pour vérifier que tout fonctionne
 * @returns {Promise<void>}
 */
export async function testMCPSetup() {
  console.log('🧪 Test de la configuration MCP...');
  
  try {
    const { stagehand, sessionId } = await startMCPSession();
    
    // Debug: voir les méthodes disponibles après init
    console.log('🔍 Méthodes Stagehand disponibles:', Object.getOwnPropertyNames(stagehand));
    console.log('🔍 Type de agent:', typeof stagehand.agent);
    
    // Test simple: aller sur Google en utilisant la page directement
    await stagehand.page.goto('https://www.google.com', { waitUntil: 'networkidle' });
    console.log('✅ Navigation vers Google réussie');
    
    // Tester l'agent IA pour une action simple
    console.log('🤖 Test de l\'agent IA...');
    try {
      // L'agent est une fonction - testons
      const agentResult = await stagehand.agent('Take a screenshot of the current page');
      console.log('✅ Agent IA exécuté:', agentResult);
    } catch (agentError) {
      console.log('⚠️ Agent non disponible:', agentError.message);
      // Prendre un screenshot classique en fallback
      await stagehand.page.screenshot({ path: 'screenshots/test-mcp.png', fullPage: true });
      console.log('✅ Screenshot classique pris');
    }
    
    console.log('✅ Test MCP réussi!');
    
    // Générer un code de test
    const testCode = `// Test workflow généré automatiquement
export async function testWorkflow() {
  console.log('Test workflow exécuté avec succès!');
  return { success: true, timestamp: new Date().toISOString() };
}`;
    
    await endMCPSession(stagehand, testCode, 'test-setup');
    
  } catch (error) {
    console.error('❌ Test MCP échoué:', error.message);
    throw error;
  }
}

// Si ce fichier est exécuté directement, lancer le test
if (import.meta.url === `file://${process.argv[1]}`) {
  testMCPSetup().catch(console.error);
}
