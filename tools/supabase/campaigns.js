import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY;

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



// Map logical event type to campaign counter column and grouping key
function mapEventToCounter(eventType) {
  if (!eventType) return { group: null, column: null };
  const t = String(eventType);
  if (t === 'visit') return { group: 'visit', column: 'total_visits' };
  if (t === 'booking') return { group: 'booking', column: 'total_bookings' };
  if (t === 'login') return { group: 'login', column: 'total_logins' };
  if (t.startsWith('verification')) return { group: 'verification', column: 'total_verifications' };
  return { group: null, column: null };
}

// Increment one or multiple counters on a campaign row
export async function incrementCampaignCounters(campaignId, increments = {}) {
  if (!campaignId) return { success: false, error: 'campaignId required' };

  // Fetch current values to compute the increment
  const { data: current, error: selErr } = await supabase
    .from('campaigns')
    .select('id,total_visits,total_bookings,total_logins,total_verifications,total_contacts')
    .eq('id', campaignId)
    .single();
  if (selErr) return { success: false, error: selErr.message };

  const update = {};
  const add = (key) => {
    const inc = Number(increments[key] || 0);
    if (!inc) return;
    update[key] = Number(current?.[key] || 0) + inc;
  };
  add('total_visits');
  add('total_bookings');
  add('total_logins');
  add('total_verifications');
  add('total_contacts');

  if (Object.keys(update).length === 0) return { success: true };

  const { error: updErr } = await supabase
    .from('campaigns')
    .update(update)
    .eq('id', campaignId);
  if (updErr) return { success: false, error: updErr.message };
  return { success: true };
}

// Increment a campaign counter only the first time a given contact triggers the logical event group
export async function incrementCounterOncePerContact(campaignId, contactId, eventType) {
  if (!campaignId || !contactId) return { success: false, skipped: true };
  const { group, column } = mapEventToCounter(eventType);
  if (!group || !column) return { success: false, skipped: true };

  // Count events for this contact/campaign in the logical group
  let query = supabase
    .from('events')
    .select('id', { count: 'exact' })
    .eq('campaign_id', campaignId)
    .eq('contact_id', contactId);

  if (group === 'verification') {
    query = query.ilike('event_type', 'verification%');
  } else {
    query = query.eq('event_type', group);
  }

  const { count, error } = await query;
  if (error) return { success: false, error: error.message };

  // If this is the first event of this type for the contact, increment the counter
  if (Number(count || 0) === 1) {
    const res = await incrementCampaignCounters(campaignId, { [column]: 1 });
    return { success: res.success, incremented: true };
  }
  return { success: true, incremented: false };
}

// Increment total_contacts once per contact for a given campaign (first ever event by contact)
export async function incrementContactOncePerCampaign(campaignId, contactId) {
  if (!campaignId || !contactId) return { success: false, skipped: true };
  const { count, error } = await supabase
    .from('events')
    .select('id', { count: 'exact' })
    .eq('campaign_id', campaignId)
    .eq('contact_id', contactId);
  if (error) return { success: false, error: error.message };
  if (Number(count || 0) === 1) {
    const res = await incrementCampaignCounters(campaignId, { total_contacts: 1 });
    return { success: res.success, incremented: true };
  }
  return { success: true, incremented: false };
}

