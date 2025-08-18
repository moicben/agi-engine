
import { takeDesktopScreenshot, analyzeScreenshot } from '../tools/screenshots.js';
import { llmRequest } from '../tools/llm.js';
import { parseJSONSafe } from '../tools/terminal.js';

// Unified result helpers
function ok(data) { return { success: true, data }; }
function err(message, extra = {}) { return { success: false, error: message, ...extra }; }

// Minimal worker API with strict JSON expectations
export async function think(input = {}) {
  try {
    const goal = typeof input === 'string' ? input : (input?.goal ?? '');
    const context = typeof input === 'object' ? (input?.context ?? {}) : {};
    console.log('[vision][think] goal:', String(goal).slice(0, 120));
    const response = await llmRequest(
      `Tu es un expert en analyse d'intentions utilisateur.\nObjectif: ${goal}\nContexte: ${JSON.stringify(context)}\nRéponds UNIQUEMENT avec un JSON strict: {"intent":"...","constraints":["..."],"notes":"..."}`
    );
    console.log('[vision][think] done');
    return ok({ intent: response });
  } catch (e) {
    console.log('[vision][think] error:', e.message);
    return err('think_failed', { details: e.message });
  }
}

export async function plan(input = {}) {
  try {
    console.log('[vision][plan] start');
    const thinkObj = typeof input === 'string' ? input : JSON.stringify(input?.think ?? input);
    const response = await llmRequest(
      `Tu es un planificateur de tâches.\nAnalyse: ${thinkObj}\nRéponds UNIQUEMENT avec un JSON strict: {"steps":[{"id":"s1","desc":"..."}],"risks":["..."]}`
    );
    console.log('[vision][plan] done');
    return ok({ plan: response });
  } catch (e) {
    console.log('[vision][plan] error:', e.message);
    return err('plan_failed', { details: e.message });
  }
}

// Analysis step: capture desktop and OCR
export async function analyze(options = {}) {
  try {
    console.log('[vision][analyze] capturing desktop...');
    const { accept = [], reject = [], lang = 'eng' } = options || {};
    const screenshotPath = await takeDesktopScreenshot({ label: 'vision' });
    const analysis = await analyzeScreenshot(screenshotPath, { accept, reject, lang });
    console.log('[vision][analyze] screenshot:', screenshotPath, 'ocrChars:', (analysis.text || '').length);
    return ok({ screenshotPath, ocrText: analysis.text || '', verdict: analysis.verdict || { valid: false } });
  } catch (e) {
    console.log('[vision][analyze] error:', e.message);
    return err('analyze_failed', { details: e.message });
  }
}

export async function decide(input = {}) {
  try {
    const ocrText = input?.data?.ocrText || input?.ocrText || '';
    console.log('[vision][decide] ocrPreview:', String(ocrText).slice(0, 120));
    const response = await llmRequest(
      `Tu es un décideur d'actions GUI.\nOCR: ${String(ocrText).slice(0, 2000)}\nRéponds UNIQUEMENT avec un JSON strict: {"action":"move|click|key|type","params":{}}`
    );
    console.log('[vision][decide] decision received');
    return ok({ decision: response });
  } catch (e) {
    console.log('[vision][decide] error:', e.message);
    return err('decide_failed', { details: e.message });
  }
}

export async function critic(input = {}) {
  try {
    const interact = input?.interact ?? input;
    const meta = { goal: input?.goal ?? null, context: input?.context ?? null };
    console.log('[vision][critic] evaluating...');
    const response = await llmRequest(
      `Tu es un critique. Évalue le résultat d'une action.\nExécution: ${JSON.stringify(interact)}\nContexte: ${JSON.stringify(meta)}\nRéponds UNIQUEMENT avec un JSON strict: {"success":true|false,"progress":true|false,"critic":"..."}`
    );
    const verdict = parseJSONSafe(response) || {};
    const isSuccess = verdict.success === true;
    const isProgress = verdict.progress === true;
    console.log('[vision][critic] success:', !!isSuccess, 'progress:', !!isProgress);
    return { success: isSuccess, progress: isProgress, data: { verdict, raw: response } };
  } catch (e) {
    console.log('[vision][critic] error:', e.message);
    return err('critic_failed', { details: e.message });
  }
}