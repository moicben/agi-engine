import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
  console.error('⚠️ Missing Supabase credentials. Please set SUPABASE_URL & SUPABASE_KEY in your .env file.');
  throw new Error('Missing Supabase URL or Key');
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

export async function storeAccount(orderNumber, source, email, status, comment) {
  try {

    if (!orderNumber)
      orderNumber = 1;
    if (!email)
      email = 'anonyme'
    if (!status)
      status = 'no status '
    if (!comment)
      comment = 'error at initialization'
    if (!source)
      source = 'unknown';
  


    const { data, error } = await supabase
      .from('accounts')
      .insert([
        {
          source: source,
          status,
          email,
          comment: comment || '',
        },
      ]);

    if (error) {
      console.error('Error creating new account:', error);
      throw new Error('Failed to create new account in database');
    }

    console.log('New account created:', orderNumber);
  } catch (error) {
    console.error('Error creating new account:', error);
    throw new Error('Failed to create new account');
  }
}

// const orderNumber = '1234567890'; // Remplacez par le numéro de commande réel
// const email = 'eea@ga.fr'; // Remplacez par l'email réel
// const status = 'pending'; // Remplacez par le statut réel
// const comment = 'Test comment'; // Remplacez par le commentaire réel

// storeAccount(orderNumber, email, status, comment)