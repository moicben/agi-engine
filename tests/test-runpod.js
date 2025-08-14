// Test de lancement de browser avec runpod
import { initiateG2AWorkflow } from '../flows/g2a/initiate.js';

(async () => {
  await initiateG2AWorkflow();
})();