import * as llm from '../../tools/llm.js';
import { config } from '../../core/config.js';

export async function plan(context) {
  const intent = context.intent || 'qa';
  const prompt = `You are the Plan step. From the following analysis and user intent, produce a micro-iteration task graph (1–3 tasks), machine-actionable and deterministic.
Guidance: Treat memory as inspiration, not constraint. Avoid repeating prior outputs.
Intent: ${String(intent)}
Analysis (JSON): ${context.analysis}

Respond ONLY with strict JSON. Schema:
{
  "stage": "Plan",
  "iteration": string,
  "tasks": [
    {
      "id": string,
      "name": string,
      "objective": string,
      "inputs": object,
      "outputs": object,
      "actions": string[],
      "dependencies": string[],
      "acceptance": string[],
      "risks": string[],
      "mitigations": string[]
    }
  ],
  "notes": string
}`;
  let out = await llm.llmRequest(prompt, { model: config?.llm?.models?.plan || undefined, responseFormat: 'json' });
  try {
    const obj = JSON.parse(String(out));
    if (obj && obj.stage === 'Plan' && Array.isArray(obj.tasks) && obj.tasks.length > 0) return out;
  } catch {}
  // One repair attempt
  const repair = `Your previous response was invalid or empty. Respond ONLY with strict JSON matching the schema and include at least 1 task (1–3 tasks). Do not include markdown fences.`;
  out = await llm.llmRequest(`${prompt}\n\n${repair}`, { model: config?.llm?.models?.plan || undefined, responseFormat: 'json' });
  try {
    const obj = JSON.parse(String(out));
    return obj;
  } catch { return out; }
}

export default { plan };
