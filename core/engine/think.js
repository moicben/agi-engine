import * as llm from '../../tools/llm.js';

export async function think({ goal = '', context = {}, memorySnippet = '', folderSummary = '' } = {}) {
  try {
    const prompt = `You are the Think step. Merge the execution context with the user goal and clarify the target.
Goal: ${String(goal)}
Context: ${JSON.stringify(context)}
Recent memory (snippet): ${String(memorySnippet)}
Folder summary: ${String(folderSummary)}

Respond ONLY with strict JSON and nothing else. Start with { and end with }. Schema:
{
  "stage": "Think",
  "summary": string,
  "contextualized_goal": string,
  "assumptions": string[],
  "unknowns": string[]
}`;
    const out = await llm.llmRequest(prompt);
    return out;
  } catch (e) {
    return JSON.stringify({ stage: 'Think', summary: '', contextualized_goal: String(goal), assumptions: [], unknowns: [], error: e.message });
  }
}

export default { think };