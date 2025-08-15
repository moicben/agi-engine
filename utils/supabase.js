// Utility for connecting to Supabase and simple data ops
require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseKey) {
  // Defer throwing until first call to avoid build-time crash in some envs
  // but log a warning for visibility.
  // eslint-disable-next-line no-console
  console.warn('Supabase env vars missing: SUPABASE_URL and SUPABASE_SERVICE_KEY/ANON_KEY');
}
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

function requireClient() {
  if (!supabase) {
    throw new Error('Supabase client not configured. Set SUPABASE_URL and SUPABASE_SERVICE_KEY/ANON_KEY');
  }
  return supabase;
}

// Track an event (visit, submission, etc.)
async function trackEvent(eventType, ip, details = {}) {
  const db = requireClient();
  const { data, error } = await db
    .from('events')
    .insert({ event_type: eventType, ip, details, created_at: new Date().toISOString() })
    .select('id')
    .single();
  if (error) throw error;
  return { success: true, eventId: data?.id };
}

// Store or update a lead keyed by IP (very simple upsert logic)
async function storeLead(email, phone, ip, campaignId, eventId = null, eventType = '', payload = {}) {
  const db = requireClient();
  const { data: existingLead } = await db
    .from('leads')
    .select('*')
    .eq('ip', ip)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const now = new Date().toISOString();

  const counterUpdates = {};
  if (eventType === 'booking') counterUpdates.booking_count = (existingLead?.booking_count || 0) + 1;
  if (eventType === 'login') counterUpdates.login_count = (existingLead?.login_count || 0) + 1;
  if (eventType === 'verification_start' || eventType === 'verification_retry') {
    counterUpdates.verification_count = (existingLead?.verification_count || 0) + 1;
  }

  if (existingLead) {
    const updateData = {
      ...counterUpdates,
      email: email || existingLead.email,
      phone: phone || existingLead.phone,
      campaign_id: campaignId || existingLead.campaign_id,
      event_id: eventId || existingLead.event_id,
      updated_at: now,
    };
    const { error } = await db.from('leads').update(updateData).eq('id', existingLead.id);
    if (error) throw error;
    return { success: true, action: 'updated' };
  }

  const newLeadData = {
    email,
    phone,
    ip,
    campaign_id: campaignId,
    event_id: eventId,
    ...counterUpdates,
    created_at: now,
    updated_at: now,
  };
  const { error } = await db.from('leads').insert(newLeadData);
  if (error) throw error;
  return { success: true, action: 'created' };
}

// Retrieve campaign by UUID or by exact name
async function getCampaignById(idOrName) {
  const db = requireClient();
  if (!idOrName) return null;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const looksLikeUuid = uuidRegex.test(String(idOrName));
  if (looksLikeUuid) {
    const byId = await db
      .from('campaigns')
      .select('*')
      .eq('id', idOrName)
      .limit(1)
      .maybeSingle();
    if (byId?.data) return byId.data;
  }
  const byName = await db
    .from('campaigns')
    .select('*')
    .eq('name', idOrName)
    .limit(1)
    .maybeSingle();
  if (byName.error) throw byName.error;
  return byName.data || null;
}

module.exports = {
  trackEvent,
  storeLead,
  getCampaignById,
};
