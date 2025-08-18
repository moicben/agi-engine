// Minimal Supabase memory helper for AGI context
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

let supabase = null;
function getClient() {
  if (!supabase) {
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
    }
    supabase = createClient(supabaseUrl, supabaseKey);
  }
  return supabase;
}

// Fetch recent memories for a session (table: agent_memory)
export async function fetchRecentMemories(sessionId, limit = 20) {
  const client = getClient();
  const { data, error } = await client
    .from('memories')
    .select('id, session_id, content, metadata, domain, importance_score, created_at')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
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
  const client = getClient();
  const payload = {
    session_id: sessionId,
    content,
    metadata,
    domain,
    importance_score,
  };
  const { data, error } = await client.from('memories').insert(payload).select('*').single();
  if (error) throw error;
  return data;
}

export default { fetchRecentMemories, storeMemory };


