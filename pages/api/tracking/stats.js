import { createClient } from '@supabase/supabase-js';

// Use service key server-side for safe aggregation
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

export default async function handler(req, res) {
  try {
    const { data, error } = await supabase.from('events').select('event_type');
    if (error) throw error;
    const stats = data.reduce((acc, row) => {
      acc[row.event_type] = (acc[row.event_type] || 0) + 1;
      return acc;
    }, {});
    res.status(200).json({ success: true, stats });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
}
