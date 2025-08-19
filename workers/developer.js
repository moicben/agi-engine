// Developer worker: generates edits and integrates them with Git commits.
import { applyEdits } from '../tools/editor.js';
import { ensureUser, currentBranch, createBranch, commitAll, push } from '../tools/github.js';

export async function integrate({ spec = '', options = {} } = {}) {
  const started = Date.now();
  const logs = [];
  try {
    // Simple heuristic: expect spec to directly carry edits; otherwise do nothing
    // Spec format can be either a JSON string or object: { edits: [...] }
    let edits = [];
    if (typeof spec === 'string') {
      try { const parsed = JSON.parse(spec); edits = Array.isArray(parsed?.edits) ? parsed.edits : []; } catch { edits = []; }
    } else if (spec && typeof spec === 'object') {
      edits = Array.isArray(spec.edits) ? spec.edits : [];
    }
    if (!Array.isArray(edits) || edits.length === 0) {
      return { success: false, data: { applied: 0, edits: [] }, artifacts: [], logs: ['no_edits_provided'], meta: { duration_ms: Date.now() - started } };
    }

    // Optional branch management
    if (options?.git?.branch) {
      try { createBranch(options.git.branch); logs.push(`branch_created:${options.git.branch}`); } catch (e) { logs.push('branch_failed: ' + e.message); }
    }

    // Pre-commit baseline if requested
    if (options?.git?.baselineCommitMessage) {
      try { ensureUser(); commitAll(options.git.baselineCommitMessage); logs.push('baseline_commit'); } catch (e) { logs.push('baseline_commit_failed: ' + e.message); }
    }

    const appliedRes = applyEdits(edits);
    logs.push(...(appliedRes.logs || []));

    // Commit after edits
    let commitMsg = options?.git?.commitMessage || 'feat(dev): integrate changes';
    try { ensureUser(); commitAll(commitMsg); logs.push('commit_done'); } catch (e) { logs.push('commit_failed: ' + e.message); }

    if (options?.git?.push === true) {
      try { const br = options.git.branch || currentBranch(); push(br); logs.push('push_done'); } catch (e) { logs.push('push_failed: ' + e.message); }
    }

    return {
      success: appliedRes.success,
      data: { applied: appliedRes?.data?.applied || 0, edits },
      artifacts: appliedRes.artifacts || [],
      logs,
      meta: { duration_ms: Date.now() - started }
    };
  } catch (e) {
    return { success: false, data: { applied: 0, edits: [] }, artifacts: [], logs: [...logs, 'error: ' + e.message], meta: { duration_ms: Date.now() - started } };
  }
}

export async function generateCode({ spec = '' } = {}) {
  // Minimal stub retained for compatibility; prefer integrate
  const started = Date.now();
  return { success: true, data: { edits: [] }, artifacts: [], logs: ['developer.generateCode noop'], meta: { duration_ms: Date.now() - started } };
}

export default { integrate, generateCode };


