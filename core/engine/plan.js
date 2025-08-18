import * as llm from '../../tools/llm.js';

export async function plan(context) {
  const intent = context.intent || 'qa';
  const prompt = `You are the Plan step. From the following analysis and user intent, produce a micro-iteration task graph (1–3 tasks), machine-actionable and deterministic.
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
  const out = await llm.llmRequest(prompt);
  // Guardrail: ensure valid shape
  try {
    const obj = JSON.parse(out);
    if (obj && obj.stage === 'Plan' && Array.isArray(obj.tasks) && obj.tasks.length > 0) {
      return obj;
    }
  } catch {}
  throw new Error('plan_invalid: no valid tasks returned by LLM');
}

export default { plan };
