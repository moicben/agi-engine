import { runVisionAgent } from '../agents/vision.js';

(async () => {
  try {
    const result = await runVisionAgent({
      accept: ['login', 'connexion', 'example'],
      reject: ['error', '404'],
      summarize: false
    });
    console.log('Vision agent result:');
    console.log({
      screenshotPath: result.screenshotPath,
      verdict: result.verdict,
      ocrPreview: (result.ocrText || '').slice(0, 200)
    });
  } catch (e) {
    console.error('Vision agent failed:', e.message);
    process.exit(1);
  }
})();


