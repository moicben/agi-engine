import * as llm from '../../tools/llm.js';

export async function todolize(context) {
  const prompt = `You are the Todolize step. Convert the plan into a flat, explicit task list.\n
Plan: ${context.plan}\n
Return JSON: {"tasks": [{"id": string, "title": string, "detail": string, "priority": "high"|"medium"|"low"}]}`;
  const out = await llm.llmRequest(prompt);
  return out;
}

export default { todolize };


