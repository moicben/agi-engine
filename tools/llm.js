// Utilitaire pour OpenAI

import { config } from '../core/config.js';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import url from 'url';

// Load environment as early and robustly as possible
// Attempt default .env, otherwise try project root relative to this file
let envLoaded = false;
try { envLoaded = !!dotenv.config().parsed; } catch {}
if (!envLoaded) {
  try {
    const thisDir = path.dirname(url.fileURLToPath(import.meta.url));
    const rootDotenv = path.resolve(thisDir, '..', '.env');
    if (fs.existsSync(rootDotenv)) {
      dotenv.config({ path: rootDotenv });
      envLoaded = true;
    }
  } catch {}
}


function sha(str){ return crypto.createHash('sha256').update(str).digest('hex'); }

function cachePathFor(model, prompt){
  const key = sha(`${model}:${prompt}`);
  const dir = path.join(process.cwd(), 'core', 'runs', '.llm-cache');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, `${key}.json`);
}

export async function llmRequest(input, model = config.llm.model) {
  const allowFallback = false; // disable demo fallbacks entirely

  const prompt = String(input);
  const selectedModel = String(model || 'gpt-4o-mini');
  const cachePath = cachePathFor(selectedModel, prompt);

  if (fs.existsSync(cachePath)) {
    try {
      const cached = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
      return cached.content;
    } catch {}
  }

  const apiKey = process.env.OPENAI_API_KEY;
  const baseURL = process.env.OPENAI_BASE_URL; // optional

  // Strict production behavior: require API key unless explicitly allowing fallback
  if (!apiKey) { throw new Error('OPENAI_API_KEY is not set. Set it in your environment or .env'); }

  const client = new OpenAI({ apiKey, baseURL });

  let response;
  try {
    response = await client.chat.completions.create({
      model: selectedModel,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0,
      max_tokens: Number(process.env.OPENAI_MAX_TOKENS || 1200)
    });
  } catch (err) {
    // Helpful diagnostics
    const code = err?.code || err?.status || 'unknown_error';
    const details = err?.message || String(err);
    console.error('[llm:error]', { code, details });
    throw err;
  }

  const content = response?.choices?.[0]?.message?.content ?? '';
  if (process.env.LOG_LLM !== '0') {
    console.log(`[llm] model=${selectedModel} content=${truncateForLog(content)}`);
  }
  try { fs.writeFileSync(cachePath, JSON.stringify({ content }, null, 2), 'utf8'); } catch {}
  return content;
}

// All fallbacks removed in production mode

function truncateForLog(text, max = 400) {
  try {
    const s = String(text ?? '');
    return s.length > max ? s.slice(0, max) + '…' : s;
  } catch { return ''; }
}

