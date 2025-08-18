// agents/vision has been removed; test updated to call workers/vision directly
import visionWorker from '../workers/vision.js';

(async () => {
  try {
    const goal = 'Observer l\'écran et proposer une action sûre';
    const context = { os: 'linux', desktop: true };
    const analyzeOptions = { accept: ['login','connexion','recherche'], reject: ['erreur','404'], lang: 'eng' };

    const result = await visionWorker.detect({ image: '/Users/ben/Documents/agi-engine/public/vision-img.png', query: 'SWIFT', annotate: false });

    console.log('Vision agent result:');
    console.log({
      detect: { success: result.success, coords: result.coords, annotated: result.annotated }
    });
  } catch (e) {
    console.error('Vision agent failed:', e.message);
    process.exit(1);
  }
})();


