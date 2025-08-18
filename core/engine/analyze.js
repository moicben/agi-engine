import * as llm from '../../tools/llm.js';

export async function analyze(context) {
  const prompt = `You are the Analyze step of an AGI pipeline. Given the goal and context, singularize and enhance comprehension.\n
Goal: ${context.goal}\n
Memory: ${context.memorySnippet}\n
Folder insights: ${context.folderSummary}\n
Conscience: ${context.conscience}\n
Return a short JSON with fields: {"problem": string, "key_requirements": string[], "uncertainties": string[]}`;
  const out = await llm.llmRequest(prompt);
  return out;
}

export default { analyze };


