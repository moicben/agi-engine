// Memory management

import fs from 'fs';
import { fetchRecentMemories } from '../../tools/supabase/memories.js';
import { storeMemory } from '../../tools/supabase/memories.js';
import { config } from '../config.js';
import { scoreMemo, mmrSelect } from './memoryScorer.js';

export async function loadRecentMemory(sessionId = 'session-test-1') {
  try {
    const rows = await fetchRecentMemories(sessionId, 10);
    console.log('[context] loadRecentMemory rows:', rows.length);
    return rows;
  } catch {
    return [];
  }
}

export async function saveMemory(sessionId, content, metadata = {}) {
  try {
    const saved = await storeMemory({ sessionId, content, metadata });
    console.log('[context] saveMemory id:', saved?.id);
    return saved;
  } catch {
    return null;
  }
}

// Build high-level context used by brain LLM calls (Supabase + folder scan)
export async function buildMemoryContext({ sessionId = 'session-test-1', rootDir = process.cwd(), goal = '' } = {}) {
  let recent = [];
  try {
    const maxRows = (config?.memory?.maxRows) || (config?.engine?.memory?.maxRows) || 100;
    recent = await fetchRecentMemories(sessionId, maxRows);
    console.log('[context] buildMemoryContext fetched:', recent.length);
  } catch {
    recent = [];
  }

  let folderSummary = '';
  try {
    const entries = fs.readdirSync(rootDir, { withFileTypes: true }).slice(0, 30);
    folderSummary = entries.map((e) => `${e.isDirectory() ? 'dir' : 'file'}:${e.name}`).join(', ');
  } catch {
    folderSummary = '';
  }

  // Normalize memory content to strings and de-duplicate by hash to reduce noise
  const asString = (x) => (typeof x === 'string' ? x : JSON.stringify(x));
  async function hash(s) {
    try {
      const { createHash } = await import('crypto');
      return createHash('sha256').update(String(s)).digest('hex');
    } catch { return String(s).slice(0, 64); }
  }
  const unique = new Map();
  for (const m of recent) {
    const s = asString(m?.content ?? '');
    const h = await hash(s);
    if (!unique.has(h)) unique.set(h, { ...m, content: s });
  }
  const deduped = Array.from(unique.values());

  // Score, diversify and cap memory snippet
  const scored = deduped.map((m) => ({ ...m, _score: scoreMemo({ goal, memo: m }) }))
    .filter((x) => x._score >= ((config?.memory?.minScore) || 0.1))
    .sort((a, b) => b._score - a._score);

  const topK = (config?.memory?.topK) || 5;
  const lambda = (config?.memory?.mmrLambda) || 0.7;
  const selected = mmrSelect(goal, scored, topK, lambda);
  const memoryTop = selected.map(({ id, domain, content, _score, created_at }) => ({ id, domain, content: asString(content), score: Number(_score.toFixed(3)), created_at }));
  const charBudget = (config?.memory?.charBudget) || 1000;
  const memorySnippet = memoryTop.map((m) => `(${m.domain},${m.score}) ${m.content}`).join(' | ').slice(0, charBudget);
  return { memorySnippet, memoryTop, folderSummary };
}