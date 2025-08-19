// Quick LLM invocation tester for different models and formats
// Usage examples:
//   node scripts/test-llm-model.js --model gpt-4o-mini --format json
//   node scripts/test-llm-model.js --model gpt-5-mini --format json
//   node scripts/test-llm-model.js --model gpt-5-nano --format text

import { llmRequest } from '../tools/llm.js';
import { config } from '../core/config.js';

function parseArgs(argv) {
  const out = { model: '', format: 'text', prompt: '' };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--model') out.model = argv[++i] || '';
    else if (a === '--format') out.format = (argv[++i] || 'text').toLowerCase();
    else if (a === '--prompt') out.prompt = argv[++i] || '';
  }
  return out;
}

function defaultPrompt(format) {
  if (format === 'json') {
    return 'Respond ONLY with strict JSON. Schema: { "stage": "Test", "ok": true, "model": string }';
  }
  return 'Reply with a short text: ok';
}

function truncate(s, n = 400) {
  const t = String(s ?? '');
  return t.length > n ? t.slice(0, n) + '…' : t;
}

async function main() {
  const { model, format, prompt } = parseArgs(process.argv.slice(2));
  if (!model) {
    console.error('Missing --model <name>');
    process.exit(2);
  }
  const pf = format === 'json' ? 'json' : undefined;
  const finalPrompt = prompt || defaultPrompt(format);
  // Optional: enable llm logging for this test run
  try { config.logging.llm = true; } catch {}

  console.log('[test-llm] model =', model, 'format =', format, '\nprompt =', finalPrompt);
  let content = '';
  try {
    content = await llmRequest(finalPrompt, { model, responseFormat: pf, maxTokens: 300 });
  } catch (e) {
    console.error('[test-llm:error]', e?.message || e);
    process.exit(1);
  }
  console.log('[test-llm] raw:', truncate(content));
  if (format === 'json') {
    try {
      const obj = typeof content === 'string' ? JSON.parse(content) : content;
      if (obj && typeof obj === 'object') {
        console.log('[test-llm] JSON parsed OK. keys =', Object.keys(obj));
        process.exit(0);
      }
    } catch (e) {
      console.error('[test-llm] JSON parse failed:', e.message);
      process.exit(3);
    }
  }
  process.exit(0);
}

main();


