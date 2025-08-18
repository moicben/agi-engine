import * as llm from '../../tools/llm.js';

export async function assign(context) {
  const prompt = `You are the Assign step. Given tasks, pick an orchestrator target.\n
Tasks: ${context.tasks}\n
Return JSON: {"orchestrator": "cursor-cli", "assignments": [{"taskId": string, "executor": string}]}`;
  const out = await llm.llmRequest(prompt);
  return out;
}

export default { assign };


