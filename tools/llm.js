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

function cachePathFor(model, prompt, temperature, maxTokens){
  const key = sha(`${model}:${temperature ?? 'd'}:${maxTokens ?? 'd'}:${prompt}`);
  const dir = path.join(process.cwd(), 'core', 'runs', '.llm-cache');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, `${key}.json`);
}

// Supports either llmRequest(prompt, 'model-name') or llmRequest(prompt, { model, temperature, maxTokens })
export async function llmRequest(input, modelOrOptions = config.llm.model) {
  const allowFallback = false; // disable demo fallbacks entirely

  const prompt = String(input);
  const isString = typeof modelOrOptions === 'string' || modelOrOptions == null;
  const selectedModel = isString ? String(modelOrOptions || config.llm.model || 'gpt-4o-mini') : String(modelOrOptions.model || config.llm.model || 'gpt-4o-mini');
  const temperature = isString ? Number(config?.llm?.temperature ?? 0) : Number(modelOrOptions.temperature ?? (config?.llm?.temperature ?? 0));
  const maxTokens = isString ? Number(config?.llm?.maxTokens ?? 1200) : Number(modelOrOptions.maxTokens ?? (config?.llm?.maxTokens ?? 1200));
  const responseFormat = isString ? undefined : modelOrOptions.responseFormat;
  const cachePath = cachePathFor(selectedModel, prompt, temperature, maxTokens);

  if (fs.existsSync(cachePath)) {
    try {
      const cached = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
      return cached.content;
    } catch {}
  }

  const apiKey = config?.llm?.apiKey || process.env.OPENAI_API_KEY;
  const baseURL = config?.llm?.baseURL; // optional, preferences must come from config

  // Strict production behavior: require API key unless explicitly allowing fallback
  if (!apiKey) { throw new Error('OPENAI_API_KEY is not set. Set it in your environment or .env'); }

  const client = new OpenAI({ apiKey, baseURL });

  let response;
  try {
    if (shouldUseResponsesAPI(selectedModel)) {
      // Responses API path (supports gpt-5 family, o-series, gpt-4.1, etc.)
      const payload = {
        model: selectedModel,
        input: prompt,
        max_output_tokens: maxTokens
      };
      // Do not specify text.format/response_format here to avoid incompatibilities across 5-mini/nano variants.
      // Some responses models reject 'temperature'; omit for compatibility
      response = await client.responses.create(payload);
    } else {
      // Chat Completions API path
      const ccPayload = {
        model: selectedModel,
        messages: [{ role: 'user', content: prompt }],
        temperature,
        max_tokens: maxTokens
      };
      if (responseFormat === 'json' && shouldSendJSONFormat(selectedModel)) {
        ccPayload.response_format = { type: 'json_object' };
      }
      response = await client.chat.completions.create(ccPayload);
    }
  } catch (err) {
    // Helpful diagnostics
    const code = err?.code || err?.status || 'unknown_error';
    const details = err?.message || String(err);
    console.error('[llm:error]', { code, details });
    throw err;
  }

  const content = extractResponseText(response);
  if (!!config?.logging?.llm) {
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

function shouldUseResponsesAPI(model) {
  try {
    const m = String(model || '').toLowerCase();
    return (
      m.startsWith('gpt-5') ||
      m.startsWith('o1') || m.startsWith('o3') ||
      m.startsWith('gpt-4.1') || m.includes('realtime')
    );
  } catch { return false; }
}

function extractResponseText(resp) {
  try {
    // Responses API common fields
    if (resp && typeof resp === 'object') {
      if (typeof resp.output_text === 'string' && resp.output_text) return resp.output_text;
      // SDK may return a content array
      const data = resp.output || resp.data || resp.response || [];
      const tryExtractFromContentItem = (ci) => {
        if (!ci) return '';
        if (typeof ci.text === 'string') return ci.text;
        if (ci.text && typeof ci.text.value === 'string') return ci.text.value;
        if (typeof ci?.content === 'string') return ci.content;
        return '';
      };
      if (Array.isArray(data)) {
        for (const item of data) {
          const contentArr = item?.content || resp?.content || [];
          if (Array.isArray(contentArr)) {
            const parts = contentArr.map(tryExtractFromContentItem).filter(Boolean);
            if (parts.length) return parts.join('');
          }
        }
      }
    }
  } catch {}
  // Fallback to Chat Completions shape
  return resp?.choices?.[0]?.message?.content ?? '';
}

function shouldSendJSONFormat(model) {
  try {
    const m = String(model || '').toLowerCase();
    // Some smallest models may not support JSON response_format cleanly
    if (m.includes('nano')) return false;
    return true;
  } catch { return true; }
}

