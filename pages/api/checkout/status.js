import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { paymentId } = req.query;
  if (!paymentId) {
    return res.status(400).json({ error: 'paymentId is required' });
  }

  try {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
    const { data, error } = await supabase
      .from('payments')
      .select('status')
      .eq('id', paymentId)
      .single();

    if (error) {
      console.error('Supabase error on status fetch:', error);
      // Par sécurité, renvoyer pending si la ligne n'est pas trouvée
      return res.status(200).json({ status: 'pending' });
    }

    return res.status(200).json({ status: data?.status || 'pending' });
  } catch (e) {
    console.error('Status API error:', e);
    return res.status(200).json({ status: 'pending' });
  }
}
