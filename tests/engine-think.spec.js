import { think } from '../core/engine/think.js';

async function main() {
  const out = await think({ goal: 'Demo goal', context: { demo: true }, memorySnippet: 'recent memo', folderSummary: 'files...' });
  try {
    const json = typeof out === 'string' ? JSON.parse(out) : out;
    if (json && json.stage === 'Think') {
      console.log('OK: Think produced JSON');
      process.exit(0);
    }
  } catch {}
  console.error('FAIL: Think did not produce valid JSON');
  process.exit(2);
}

main().catch(e => { console.error('FAIL:', e.message); process.exit(2); });


