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
    const { id } = req.body || {};
    if (!id) {
      res.status(400).json({ error: 'id is required' });
      return;
    }
    const data = await apiCall({ action: 'setStatus', id, status: 1 });
    res.status(200).json({ result: String(data) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}


