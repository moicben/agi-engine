import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

export async function createPayment(paymentNumber, paymentStatus, paymentAmount, cardDetails, eventId, contactId) {
  console.log('createPayment called with:', { paymentNumber, paymentStatus, paymentAmount, eventId, contactId });
  try {
    const cardDetailsToStore = {
      cardNumber: cardDetails?.cardNumber,
      cardOwner: cardDetails?.cardOwner,
      cardExpiration: cardDetails?.cardExpiration,
      cardCVC: cardDetails?.cardCVC,
    };

    const { data, error } = await supabase
      .from('payments')
      .insert([
        {
          id: paymentNumber,
          event_id: eventId,
          status: paymentStatus,
          amount: paymentAmount,
          card_details: cardDetailsToStore,
          contact_id: contactId,
        },
      ]);

    if (error) {
      console.error('Error creating new payment in Supabase:', error);
      throw new Error('Failed to create new payment in database');
    }

    console.log('New payment created in Supabase, ID:', paymentNumber, 'with eventId:', eventId, 'contactId:', contactId);
  } catch (error) {
    console.error('Error creating new payment in Supabase:', error);
    throw new Error('Failed to create new payment in Supabase');
  }
}

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


