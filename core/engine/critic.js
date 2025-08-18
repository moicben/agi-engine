import * as llm from '../../tools/llm.js';
import { parseJSONSafe } from '../../tools/terminal.js';

export async function critic({ task = {}, resultEnvelope = {}, context = {} } = {}) {
  try {
    const acceptance = Array.isArray(task?.acceptance) ? task.acceptance : [];
    const prompt = `You are the Critic step. Evaluate a task result against acceptance criteria.
Task: ${JSON.stringify({ id: task.id, name: task.name, acceptance }, null, 2)}
Result: ${JSON.stringify(resultEnvelope, null, 2)}
Context: ${JSON.stringify(context, null, 2)}

Respond ONLY with strict JSON:
{
  "stage": "Critic",
  "task_id": string,
  "success": true|false,
  "progress": true|false,
  "critic": string,
  "recommendations": string[],
  "next": { "action": "continue" | "retry" | "replan" | "skip" }
}`;
    const out = await llm.llmRequest(prompt);
    const json = parseJSONSafe(out) || {};
    return json;
  } catch (e) {
    return { stage: 'Critic', task_id: task?.id || null, success: !!resultEnvelope?.success, progress: false, critic: e.message, recommendations: [], next: { action: 'retry' } };
  }
}

export default { critic };


