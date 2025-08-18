import * as llm from '../../tools/llm.js';

export async function analyze(context) {
  const prompt = `You are the Analyze step of an AI engineering pipeline.
Goal: ${context.goal}
Think: ${context.selfThought}
Conscience: ${context.conscience}
Recent memory: ${context.memorySnippet}
Folder summary: ${context.folderSummary}

Produce ONLY strict JSON in English. Schema:
{
  "stage": "Analyze",
  "summary": string,
  "problem": { "description": string, "constraints": { "explicit": string[], "implicit": string[] } },
  "dependencies": string[],
  "risks": string[],
  "ambiguities": string[],
  "angles": { "architecture": string, "data": string, "security": string, "dx": string, "tests": string, "deploy": string },
  "tracks": [ { "title": string, "details": string } ],
  "open_questions": string[],
  "hypotheses": string[]
}`;
  const out = await llm.llmRequest(prompt);
  return out;
}

export default { analyze };
