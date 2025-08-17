import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

// Retrieve campaign by id (UUID) or by name (fallback without throwing early)
export async function getCampaignById(idOrName) {
  if (!idOrName) return null;

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const looksLikeUuid = uuidRegex.test(String(idOrName));

  // Try by UUID id first if it matches the UUID shape
  if (looksLikeUuid) {
    const byId = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', idOrName)
      .limit(1)
      .maybeSingle();
    if (byId?.data) return byId.data;
    // If not found, continue to fallback by name
  }

  // Fallback by exact name match
  const byName = await supabase
    .from('campaigns')
    .select('*')
    .eq('name', idOrName)
    .limit(1)
    .maybeSingle();
  if (byName.error) throw byName.error;
  return byName.data || null;
}



export async function getCampaignName(idOrName) {
  const campaign = await getCampaignById(idOrName);
  return campaign?.name || null;
}
