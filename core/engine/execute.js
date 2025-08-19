import path from 'path';
import { fileURLToPath } from 'url';

// Resolve executor module and call function
async function callExecutor(executor, params) {
  // executor format: 'workers/vision.detect' or 'workers/qa'
  const [modPath, fnNameRaw] = executor.split('.');
  const moduleRel = `../../${modPath}.js`;
  const moduleUrl = new URL(moduleRel, import.meta.url);
  const mod = await import(moduleUrl);

  // Default function mapping if suffix missing
  let fnName = fnNameRaw;
  if (!fnName) {
    const base = String(modPath || '').split('/').pop();
    const defaults = {
      qa: 'answer',
      web: 'search',
      developer: 'integrate',
      editor: 'applyEdits',
      vision: 'detect',
      interact: 'orchestrate',
    };
    fnName = defaults[base] || fnName;
  }

  let fn = fnName ? mod[fnName] : undefined;

  // If still not found, try to pick the only exported function (other than default)
  if (typeof fn !== 'function') {
    const candidates = Object.entries(mod).filter(([k, v]) => k !== 'default' && typeof v === 'function');
    if (candidates.length === 1) fn = candidates[0][1];
  }

  if (typeof fn !== 'function') throw new Error(`Executor function not found: ${executor}`);
  const started = Date.now();
  const res = await fn(params);
  const duration = Date.now() - started;

  // Normalize envelope
  const envelope = {
    success: !!res?.success,
    data: res?.data ?? res ?? {},
    artifacts: res?.artifacts ?? [],
    logs: res?.logs ?? [],
    meta: { ...(res?.meta || {}), duration_ms: duration, executor },
  };
  return envelope;
}

export async function executeAssignment({ assignment, context, fingerprint }) {
  const { executor, params, timeout_ms = 60000 } = assignment;

  // Resolve param refs from context
  const resolvedParams = {};
  for (const [k, v] of Object.entries(params || {})) {
    if (v && typeof v === 'object' && typeof v.ref === 'string' && v.ref.startsWith('context.')) {
      const pathParts = v.ref.split('.').slice(1);
      let cur = context;
      for (const p of pathParts) cur = cur?.[p];
      resolvedParams[k] = cur;
    } else {
      resolvedParams[k] = v;
    }
  }

  const execPromise = callExecutor(executor, resolvedParams);
  const timeoutPromise = new Promise((_, rej) => setTimeout(() => rej(new Error('timeout_exceeded')), timeout_ms));

  try {
    const envelope = await Promise.race([execPromise, timeoutPromise]);
    // Attach fingerprint if provided
    if (fingerprint) envelope.meta = { ...(envelope.meta || {}), fingerprint };
    return envelope;
  } catch (e) {
    return { success: false, data: {}, artifacts: [], logs: [], meta: { executor, error: e.message } };
  }
}

export default { executeAssignment };


