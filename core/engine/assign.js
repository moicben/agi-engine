import * as llm from '../../tools/llm.js';
import fs from 'fs';
import path from 'path';
import { config } from '../../core/config.js';
import { safeParse } from './validate.js';

// Simple memoization of capabilities.json with mtime check
let cachedCaps = { mtimeMs: 0, data: {} };

export async function assign(context) {
  const capabilitiesPath = path.join(process.cwd(), 'core', 'capabilities.json');
  let capabilities = {};
  try {
    const stat = fs.statSync(capabilitiesPath);
    if (stat.mtimeMs === cachedCaps.mtimeMs && cachedCaps.data) {
      capabilities = cachedCaps.data;
    } else {
      const raw = fs.readFileSync(capabilitiesPath, 'utf8');
      capabilities = JSON.parse(raw);
      cachedCaps = { mtimeMs: stat.mtimeMs, data: capabilities };
    }
  } catch {
    capabilities = {};
  }

  const envConstraints = {
    os: 'darwin',
    headless: false,
    paths: 'absolute preferred',
  };

  const prompt = `You are the Assign step. Map each planned task to a single worker function using the capability registry. Enforce simple policies: tasks <= 7; prefer lower cost and no side-effects when possible. Use ONLY available capabilities. Strict, templated JSON.
Guidance: Ignore memory if it biases away from the current goal; memory is a hint only.
User intent: ${String(context.intent || '')}
Plan (JSON): ${context.plan}
Goal: ${context.goal}
Environment: ${JSON.stringify(envConstraints)}
Capabilities: ${JSON.stringify(capabilities)}

Mapping rules:
- If intent = "qa", use only workers/qa.answer with params { question: Goal } unless the plan explicitly requires something else.
- If intent = "web", use only workers/web.search with params { query: Goal } unless the plan explicitly requires another capability.
- If intent = "dev", prefer a single step: workers/developer.integrate with params { spec: derived_spec }.
- Avoid vision or interact unless explicitly specified in Plan actions.

 Hard limit for QA intent: return at most 1 assignment.

Respond ONLY with strict JSON:
{
  "stage": "Assign",
  "orchestrator": "engine",
  "assignments": [
    {
      "order": number,
      "task_id": string,
      "name": string,
      "executor": string,
      "params": object,
      "timeout_ms": number,
      "retries": number,
      "artifacts_in": string[],
      "artifacts_out": string[],
      "validations": string[]
    }
  ]
}`;
  let out = await llm.llmRequest(prompt, { model: config?.llm?.models?.assign || undefined, responseFormat: 'json' });
  // Enforce fully-qualified executors if missing: "workers/x" -> "workers/x.action"
  try {
    const obj = JSON.parse(out);
    if (obj && Array.isArray(obj.assignments)) {
      // QA: hard limit to 1 assignment
      if ((context.intent || '') === 'qa' && obj.assignments.length > 1) {
        obj.assignments = obj.assignments.slice(0, 1);
      }
      for (const a of obj.assignments) {
        if (typeof a.executor === 'string' && !a.executor.includes('.')) {
          const mod = a.executor.split('/').pop();
          const defaultFn = { qa: 'answer', web: 'search', developer: 'integrate', editor: 'applyEdits', vision: 'detect', interact: 'orchestrate', terminal: 'run' }[mod];
          if (defaultFn) a.executor = `${a.executor}.${defaultFn}`;
        }
        // Defaults per intent
        if (a.retries == null) {
          const map = (config?.engine?.retriesByIntent) || { qa: 0, web: 0, dev: 1 };
          a.retries = map[context.intent] ?? 0;
        }
        if (a.timeout_ms == null) {
          const map = (config?.engine?.timeoutsByIntent) || { qa: 30000, web: 45000, dev: 120000 };
          a.timeout_ms = map[context.intent] ?? 60000;
        }
      }
      // Policy enforcement: strip QA executors when intent != 'qa'
      if ((context.intent || '') !== 'qa') {
        obj.assignments = obj.assignments.filter((a) => !String(a.executor || '').startsWith('workers/qa'));
      }
      // Ensure at least 1 assignment; if empty, attempt a repair re-prompt
      if (obj.assignments.length > 0) return obj;
    }
  } catch {}
  // One repair attempt
  const repair = `Your previous response was invalid or empty. Respond ONLY with strict JSON matching the schema and include at least 1 assignment. Do not include markdown fences.`;
  out = await llm.llmRequest(`${prompt}\n\n${repair}`, { model: config?.llm?.models?.assign || undefined, responseFormat: 'json' });
  const parsed = safeParse(out);
  return parsed ?? out;
}

export default { assign };
