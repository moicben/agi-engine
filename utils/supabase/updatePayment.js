import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
  console.error('⚠️ Missing Supabase credentials. Please set SUPABASE_URL & SUPABASE_KEY in your .env file.');
  throw new Error('Missing Supabase URL or Key');
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

export async function updatePayment(paymentId, paymentStatus) {
  try {

    const { data, error } = await supabase
      .from('payments')
      .update({
        status:paymentStatus,
      })
      .eq('id', paymentId);

    if (error) {
      console.error('Error updating payment in Supabase:', error);
      throw new Error('Failed to update payment in database');
    }

    console.log('Payment updated in Supabase, ID:', paymentId);
    return data;
  } catch (error) {
    console.error('Error updating payment in Supabase:', error);
    throw new Error('Failed to update payment in Supabase');
  }
}