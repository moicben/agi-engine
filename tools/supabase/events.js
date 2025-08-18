import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

// Track an event (e.g., visit, submission) - records all events
export async function storeEvent(eventType, ip, details = {}, campaignId, contactId) {
  if (!campaignId) throw new Error('campaignId is required for storeEvent');
  const { data, error } = await supabase
    .from('events')
    .insert({
      event_type: eventType,
      ip,
      details,
      campaign_id: campaignId,  
      contact_id: contactId,
      created_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error) throw error;
  return { success: true, eventId: data?.id };
}


