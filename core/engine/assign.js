import * as llm from '../../tools/llm.js';
import fs from 'fs';
import path from 'path';

export async function assign(context) {
  const capabilitiesPath = path.join(process.cwd(), 'core', 'engine', 'capabilities.json');
  const capabilities = fs.existsSync(capabilitiesPath)
    ? JSON.parse(fs.readFileSync(capabilitiesPath, 'utf8'))
    : {};

  const envConstraints = {
    os: 'darwin',
    headless: false,
    paths: 'absolute preferred',
  };

  const prompt = `You are the Assign step. Map each planned task to a single worker function using the capability registry. Enforce simple policies: tasks <= 7; prefer lower cost and no side-effects when possible. Strict, templated JSON.
Plan (JSON): ${context.plan}
Goal: ${context.goal}
Environment: ${JSON.stringify(envConstraints)}
Capabilities: ${JSON.stringify(capabilities)}

Respond ONLY with strict JSON:
{
  "stage": "Assign",
  "orchestrator": "engine",
  "assignments": [
    {
      "order": number,
      "task_id": string,
      "name": string,
      "executor": string,
      "params": object,
      "timeout_ms": number,
      "retries": number,
      "artifacts_in": string[],
      "artifacts_out": string[],
      "validations": string[]
    }
  ]
}`;
  const out = await llm.llmRequest(prompt);
  try {
    const obj = JSON.parse(out);
    if (obj && obj.stage === 'Assign' && Array.isArray(obj.assignments) && obj.assignments.length > 0) {
      return obj;
    }
  } catch {}
  // Fallback minimal assignment
  return {
    stage: 'Assign',
    orchestrator: 'engine',
    assignments: [
      {
        order: 1,
        task_id: 't1',
        name: 'Demo detection',
        executor: 'workers/vision.detect',
        params: { query: 'SWIFT', annotate: false },
        timeout_ms: 1500,
        retries: 0,
        artifacts_in: [],
        artifacts_out: [],
        validations: ['true == true']
      }
    ]
  };
}

export default { assign };
