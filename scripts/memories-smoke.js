import { fetchRecentMemories, storeMemory } from '../tools/supabase/memories.js';

async function main() {
  const sessionId = process.env.AGI_SESSION_ID || 'session-test-1';
  console.log('[smoke] Using sessionId:', sessionId);

  try {
    const before = await fetchRecentMemories(sessionId, 3);
    console.log('[smoke] Recent before:', before.map(r => ({ id: r.id, created_at: r.created_at })));

    const saved = await storeMemory({ sessionId, content: 'Smoke test memory entry', metadata: { source: 'smoke' }, domain: 'engine', importance_score: 0.4 });
    console.log('[smoke] Inserted id:', saved?.id);

    const after = await fetchRecentMemories(sessionId, 3);
    console.log('[smoke] Recent after:', after.map(r => ({ id: r.id, created_at: r.created_at })));
  } catch (e) {
    console.error('[smoke] Error:', e?.message || e);
    process.exitCode = 1;
  }
}

main();


