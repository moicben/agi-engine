// Minimal Supabase memory helper for AGI context
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY;

let supabase = null;
function getClient() {
  if (!supabase) {
    if (!supabaseUrl || !supabaseKey) {
      console.warn('[memories] Missing Supabase credentials. SUPABASE_URL set?', !!supabaseUrl, ' SERVICE/KEY set?', !!supabaseKey);
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY/SUPABASE_KEY');
    }
    console.log('[memories] Initializing Supabase client for memories table...');
    supabase = createClient(supabaseUrl, supabaseKey);
  }
  return supabase;
}

// Fetch recent memories for a session (table: agent_memory)
export async function fetchRecentMemories(sessionId, limit = 20) {
  console.log('[memories] fetchRecentMemories:', { sessionId, limit });
  const client = getClient();
  const { data, error } = await client
    .from('memories')
    .select('id, session_id, content, metadata, domain, importance_score, created_at')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.warn('[memories] fetchRecentMemories error:', error.message);
    throw error;
  }
  console.log('[memories] fetched rows:', data?.length ?? 0);
  return data ?? [];
}

// Insert a new memory row (no embedding for now)
export async function storeMemory({
  sessionId,
  content,
  metadata = {},
  domain = 'general',
  importance_score = 0.5,
}) {
  const normalizedContent = (typeof content === 'string') ? content : JSON.stringify(content ?? '');
  const metaImportance = (metadata && (metadata.importance ?? metadata.score));
  const normalizedImportance = Number.isFinite(Number(metaImportance))
    ? Number(metaImportance)
    : (Number.isFinite(Number(importance_score)) ? Number(importance_score) : 0.5);
  console.log('[memories] storeMemory:', { sessionId, domain, importance_score: normalizedImportance, hasContent: !!normalizedContent });
  const client = getClient();
  const payload = {
    session_id: sessionId,
    content: normalizedContent,
    metadata,
    domain,
    importance_score: normalizedImportance,
  };
  const { data, error } = await client.from('memories').insert(payload).select('*').single();
  if (error) {
    console.warn('[memories] storeMemory error:', error.message);
    throw error;
  }
  console.log('[memories] stored memory id:', data?.id);
  return data;
}

export async function fetchMemories({ sessionId, domains = [], since = null, limit = 50, search = null } = {}) {
  console.log('[memories] fetchMemories:', { sessionId, domains, since, limit, hasSearch: !!search });
  const client = getClient();
  let q = client
    .from('memories')
    .select('id, session_id, content, metadata, domain, importance_score, created_at')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (Array.isArray(domains) && domains.length) q = q.in('domain', domains);
  if (since) q = q.gte('created_at', since);
  if (search) q = q.ilike('content', `%${search}%`);
  const { data, error } = await q;
  if (error) {
    console.warn('[memories] fetchMemories error:', error.message);
    throw error;
  }
  return data ?? [];
}

export default { fetchRecentMemories, storeMemory, fetchMemories };


