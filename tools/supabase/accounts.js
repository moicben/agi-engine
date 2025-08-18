import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('⚠️ Missing Supabase credentials. Please set SUPABASE_URL & SUPABASE_SERVICE_KEY/SUPABASE_KEY in your .env file.');
  throw new Error('Missing Supabase URL or Key');
}

const supabase = createClient(supabaseUrl, supabaseKey);

export async function storeAccount(orderNumber, source, email, status, comment) {
  try {
    // Backward compatibility: if called with 4 args, treat second as email
    if (arguments.length === 4) {
      const emailArg = source;
      const statusArg = email;
      const commentArg = status;
      source = 'unknown';
      email = emailArg;
      status = statusArg;
      comment = commentArg;
    }

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


