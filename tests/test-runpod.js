// Test de lancement de browser avec runpod
import { initiateG2AWorkflow } from '../flows/g2a/initiate.js';

(async () => {
  // Allow HEADLESS env to control run; default to HEADLESS=false if unset
  const headlessEnv = process.env.HEADLESS;
  if (headlessEnv == null) process.env.HEADLESS = 'false';
  await initiateG2AWorkflow();
})();