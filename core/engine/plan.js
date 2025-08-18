import * as llm from '../../tools/llm.js';

export async function plan(context) {
  const prompt = `You are the Plan step. Build a concise, high-quality plan based on the analysis.\n
Analysis: ${context.analysis}\n
Return JSON: {"plan": [{"step": number, "name": string, "why": string}], "notes": string}`;
  const out = await llm.llmRequest(prompt);
  return out;
}

export default { plan };


