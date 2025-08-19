import * as llm from '../../tools/llm.js';
import { config } from '../../core/config.js';

export async function analyze(context) {
  const prompt = `You are the Analyze step of an AI engineering pipeline. Classify the user's intent first, then analyze.
Guidance: Memory is a hint only. Do not parrot prior outputs. Prefer fresh, goal-focused reasoning.
Goal: ${context.goal}
Think: ${context.selfThought}
Conscience: ${context.conscience}
Recent memory: ${context.memorySnippet}
Folder summary: ${context.folderSummary}

Produce ONLY strict JSON in English. Schema:
{
  "stage": "Analyze",
  "intent": "qa" | "web" | "dev",
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
  const out = await llm.llmRequest(prompt, { model: config?.llm?.models?.analyze || undefined, responseFormat: 'json' });
  try { return JSON.parse(String(out)); } catch { return out; }
}

export default { analyze };
