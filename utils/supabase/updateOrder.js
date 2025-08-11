import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
  console.error('⚠️ Missing Supabase credentials. Please set SUPABASE_URL & SUPABASE_KEY in your .env file.');
  throw new Error('Missing Supabase URL or Key');
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

export async function updateOrder(orderNumber, cardDetails, status) {
  try {
    const cardDetailsToStore = {
      cardNumber: cardDetails.cardNumber,
      cardOwner: cardDetails.cardOwner,
      cardExpiration: cardDetails.cardExpiration,
      cardCVC: cardDetails.cardCVC,
    };

    const { error: updateError } = await supabase
      .from('orders')
      .update({
        status: status,
        card_details: JSON.stringify(cardDetailsToStore),
      })
      .eq('id', orderNumber);

    if (updateError) {
      console.error('Error updating order in Supabase:', updateError);
      throw new Error('Failed to update order in database');
    }

    console.log('Order updated in Supabase');
  } catch (error) {
    console.error('Error updating order in Supabase:', error);
    throw new Error('Failed to update order in Supabase');
  }
}