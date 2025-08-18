import { analyze } from '../core/engine/analyze.js';

async function main() {
  const out = await analyze({ goal: 'Demo goal', selfThought: '{"stage":"Think"}', memorySnippet: 'memo', folderSummary: 'fs', conscience: 'c' });
  try {
    const json = typeof out === 'string' ? JSON.parse(out) : out;
    if (json && json.stage === 'Analyze') {
      console.log('OK: Analyze produced JSON');
      process.exit(0);
    }
  } catch {}
  console.error('FAIL: Analyze did not produce valid JSON');
  process.exit(2);
}

main().catch(e => { console.error('FAIL:', e.message); process.exit(2); });


