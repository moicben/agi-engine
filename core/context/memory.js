// Memory management

import fs from 'fs';
import { fetchRecentMemories, storeMemory } from '../../tools/supabase/memories.js';

export async function loadRecentMemory(sessionId = 'session-test-1') {
  try {
    return await fetchRecentMemories(sessionId, 10);
  } catch {
    return [];
  }
}

export async function saveMemory(sessionId, content, metadata = {}) {
  try {
    return await storeMemory({ sessionId, content, metadata });
  } catch {
    return null;
  }
}

// Build high-level context used by brain LLM calls (Supabase + folder scan)
export async function buildMemoryContext({ sessionId = 'session-test-1', rootDir = process.cwd() } = {}) {
  let recent = [];
  try {
    recent = await fetchRecentMemories(sessionId, 10);
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
  return { memorySnippet, folderSummary };
}