import { getCampaignById } from '../../../tools/supabase/campaigns.js';

export default async function handler(req, res) {
  try {
    const { id, c } = req.query || {};
    const key = id || c;
    if (!key || key === 'null' || key === 'undefined') {
      return res.status(400).json({ error: 'Missing campaign id' });
    }

    const row = await getCampaignById(key);
    if (!row) return res.status(404).json({ error: 'Campaign not found' });
  
    const mapped = {
      id: row.id,
      name: row.name || '',
      first_name: row.first_name || '',
      last_name: row.last_name || '',
      email: row.email || '',
      profile_image: row.profile_image || '',
      title: row.title || '',
      description: row.description || '',
      iframe_url: row.iframe_url || '',
      // Expose counters for verification/tests
      total_visits: row.total_visits ?? 0,
      total_bookings: row.total_bookings ?? 0,
      total_logins: row.total_logins ?? 0,
      total_verifications: row.total_verifications ?? 0,
      total_contacts: row.total_contacts ?? 0,
    };

    return res.status(200).json(mapped);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}


