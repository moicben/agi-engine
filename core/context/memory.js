// Memory management

import fs from 'fs';
import { fetchRecentMemories, storeMemory } from '../../tools/supabase/memories.js';

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
export async function buildMemoryContext({ sessionId = 'session-test-1', rootDir = process.cwd() } = {}) {
  let recent = [];
  try {
    recent = await fetchRecentMemories(sessionId, 10);
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

  const memorySnippet = recent.map((r) => `(${r.domain}) ${r.content}`).slice(0, 5).join(' | ');
  const context_slice = memorySnippet.slice(0, 1500);
  return { memorySnippet: context_slice, folderSummary };
}