import axios from 'axios';

const SMS_API_URL = 'https://api.sms-activate.org/stubs/handler_api.php';

async function apiCall(params) {
  if (!process.env.SMS_ACTIVATE_API_KEY) throw new Error('SMS_ACTIVATE_API_KEY manquante');
  const { data } = await axios.get(SMS_API_URL, { params: { api_key: process.env.SMS_ACTIVATE_API_KEY, ...params } });
  return data;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  try {
    const { ids } = req.body || {};
    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ error: 'ids is required (array)' });
      return;
    }
    const results = [];
    for (const id of ids) {
      const r = await apiCall({ action: 'setStatus', id, status: 8 });
      results.push({ id, result: String(r) });
    }
    res.status(200).json({ results });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}


