export function safeParse(jsonLike) {
  if (typeof jsonLike === 'object' && jsonLike !== null) return jsonLike;
  const raw = String(jsonLike || '');
  // Strip code fences if present
  let s = raw.trim();
  if (s.startsWith('```')) {
    s = s.replace(/^```[a-zA-Z]*\n?/, '').replace(/```\s*$/, '');
  }
  // Extract JSON object bounds
  const start = s.indexOf('{');
  const end = s.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) {
    s = s.slice(start, end + 1);
  }
  try { return JSON.parse(s); } catch { return null; }
}

export function validatePlan(obj) {
  const o = safeParse(obj); if (!o) return { ok: false, error: 'invalid_json' };
  if (o.stage !== 'Plan') return { ok: false, error: 'stage' };
  if (!Array.isArray(o.tasks)) return { ok: false, error: 'tasks' };
  for (const t of o.tasks) {
    if (!t.id || !t.name || !t.objective) return { ok: false, error: 'task_fields' };
    if (typeof t.inputs !== 'object' || typeof t.outputs !== 'object') return { ok: false, error: 'io' };
    if (!Array.isArray(t.acceptance)) return { ok: false, error: 'acceptance' };
  }
  return { ok: true, data: o };
}

export function validateAssign(obj) {
  const o = safeParse(obj); if (!o) return { ok: false, error: 'invalid_json' };
  if (o.stage !== 'Assign') return { ok: false, error: 'stage' };
  if (!Array.isArray(o.assignments)) return { ok: false, error: 'assignments' };
  for (const a of o.assignments) {
    if (!a.task_id || !a.executor || typeof a.params !== 'object') return { ok: false, error: 'assignment_fields' };
  }
  return { ok: true, data: o };
}

export function validateCritic(obj) {
  const o = safeParse(obj); if (!o) return { ok: false, error: 'invalid_json' };
  if (o.stage !== 'Critic') return { ok: false, error: 'stage' };
  if (!('success' in o) || !o.next || !o.next.action) return { ok: false, error: 'fields' };
  return { ok: true, data: o };
}


