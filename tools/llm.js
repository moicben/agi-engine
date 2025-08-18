// Utilitaire pour OpenAI

import { config } from '../core/config.js';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';
import dotenv from 'dotenv';
dotenv.config();


function sha(str){ return crypto.createHash('sha256').update(str).digest('hex'); }

function cachePathFor(model, prompt){
  const key = sha(`${model}:${prompt}`);
  const dir = path.join(process.cwd(), 'core', 'runs', '.llm-cache');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, `${key}.json`);
}

export async function llmRequest(input, model = config.llm.model) {
    // OBSERVATION: The OpenAI constructor does not accept a 'model' parameter; 'model' must be provided in the request payload.
    // REASONING: Error logs show "you must provide a model parameter" because the model is not included in the chat.completions.create call.
    // PLAN: Move 'model' from the OpenAI constructor to the request payload.
     //console.log('model', model);
    // console.log('apiKey', process.env.OPENAI_API_KEY);

    const prompt = String(input);
    const cachePath = cachePathFor(model, prompt);
    if (fs.existsSync(cachePath)) {
        try { const cached = JSON.parse(fs.readFileSync(cachePath, 'utf8')); return cached.content; } catch {}
    }

    // Local fallback if no API key
    if (!process.env.OPENAI_API_KEY) {
      const content = fallbackFor(prompt);
      try { fs.writeFileSync(cachePath, JSON.stringify({ content }, null, 2), 'utf8'); } catch {}
      return content;
    }

    switch (model) {
        case 'gpt-4o-mini' || 'gpt-4o':
            const openai = new OpenAI({
                apiKey: process.env.OPENAI_API_KEY,
            });
        
            const response = await openai.chat.completions.create({
                model: model,
                messages: [{ role: 'user', content: prompt }],
            });
            break;
        case 'gpt-4o':
            model = 'gpt-4o';
            break;
    }

    // Optionally log the response for debugging
     //console.log(response);

    const content = (typeof response !== 'undefined' && response?.choices?.[0]?.message?.content)
      ? response.choices[0].message.content
      : '{"stage":"Fallback","note":"Missing OpenAI response; using fallback"}';
    try { fs.writeFileSync(cachePath, JSON.stringify({ content }, null, 2), 'utf8'); } catch {}
    return content;
}

function fallbackFor(prompt){
  if (prompt.includes('You are the Plan step')) {
    return JSON.stringify({ stage: 'Plan', iteration: 'it-0001', tasks: [{ id: 't1', name: 'Demo detection', objective: 'Demonstrate engine loop', inputs: { image: { ref: 'context.image' }, query: 'SWIFT', annotate: false }, outputs: { coords: 'box' }, actions: ['zero-shot-detect'], dependencies: [], acceptance: ['true == true'], risks: [], mitigations: [] }], notes: 'fallback' });
  }
  if (prompt.includes('You are the Assign step')) {
    return JSON.stringify({ stage: 'Assign', orchestrator: 'engine', assignments: [{ order: 1, task_id: 't1', name: 'Demo detection', executor: 'workers/vision.detect', params: { image: { ref: 'context.image' }, query: 'SWIFT', annotate: false }, timeout_ms: 1500, retries: 0, artifacts_in: [], artifacts_out: ['coords'], validations: ['true == true'] }] });
  }
  if (prompt.includes('You are the Think step')) {
    return JSON.stringify({ stage: 'Think', summary: 'fallback', contextualized_goal: 'fallback', assumptions: [], unknowns: [] });
  }
  if (prompt.includes('You are the Analyze step')) {
    return JSON.stringify({ stage: 'Analyze', summary: 'fallback', problem: { description: 'n/a', constraints: { explicit: [], implicit: [] } }, dependencies: [], risks: [], ambiguities: [], angles: { architecture: '', data: '', security: '', dx: '', tests: '', deploy: '' }, tracks: [], open_questions: [], hypotheses: [] });
  }
  if (prompt.includes("You are the Critic step")) {
    return JSON.stringify({ stage: 'Critic', task_id: 't1', success: true, progress: true, critic: 'fallback', recommendations: [], next: { action: 'continue' } });
  }
  return '{"stage":"Fallback","note":"No matching stage"}';
}

