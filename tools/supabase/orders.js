import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

export async function updateOrder(orderId, cardDetails, status) {
  const now = new Date().toISOString();
  try {
    const payload = {
      id: orderId,
      status: status || null,
      card_details: cardDetails || null,
      updated_at: now,
    };

    const { data, error } = await supabase
      .from('orders')
      .upsert(payload, { onConflict: 'id' });

    if (error) {
      console.error('[updateOrder] Supabase error:', error.message);
      throw new Error('Failed to upsert order');
    }

    return data;
  } catch (e) {
    console.error('[updateOrder] Exception:', e.message);
    throw e;
  }
}


