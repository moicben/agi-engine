import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
  console.error('⚠️ Missing Supabase credentials. Please set SUPABASE_URL & SUPABASE_KEY in your .env file.');
  throw new Error('Missing Supabase URL or Key');
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

export async function createPayment(orderNumber, paymentNumber, paymentStatus, paymentAmount, cardDetails) {
  try {
    const cardDetailsToStore = {
      cardNumber: cardDetails.cardNumber,
      cardOwner: cardDetails.cardOwner,
      cardExpiration: cardDetails.cardExpiration,
      cardCVC: cardDetails.cardCVC,
    };

    const { data, error } = await supabase
      .from('payments')
      .insert([
        {
          id: paymentNumber,
          order_id: orderNumber,
          status: paymentStatus,
          amount: paymentAmount,
          card_details: JSON.stringify(cardDetailsToStore),
        },
      ]);

    if (error) {
      console.error('Error creating new payment in Supabase:', error);
      throw new Error('Failed to create new payment in database');
    }

    console.log('New payment created in Supabase, ID:', paymentNumber);
  } catch (error) {
    console.error('Error creating new payment in Supabase:', error);
    throw new Error('Failed to create new payment in Supabase');
  }
}