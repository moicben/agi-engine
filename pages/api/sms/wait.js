import axios from 'axios';

const SMS_API_URL = 'https://api.sms-activate.org/stubs/handler_api.php';

async function apiCall(params) {
  if (!process.env.SMS_ACTIVATE_API_KEY) throw new Error('SMS_ACTIVATE_API_KEY manquante');
  const { data } = await axios.get(SMS_API_URL, { params: { api_key: process.env.SMS_ACTIVATE_API_KEY, ...params } });
  return data;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const id = String(req.query.id || '');
    const timeoutMs = Number(req.query.timeout || 45000);
    if (!id) {
      res.status(400).json({ error: 'id is required' });
      return;
    }

    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const data = await apiCall({ action: 'getStatus', id });
      if (typeof data === 'string' && data.includes('STATUS_OK')) {
        const code = data.split(':')[1];
        await apiCall({ action: 'setStatus', id, status: 6 });
        res.status(200).json({ code });
        return;
      }
      if (data !== 'STATUS_WAIT_CODE') {
        res.status(200).json({ status: String(data) });
        return;
      }
      await new Promise(r => setTimeout(r, 5000));
    }
    res.status(408).json({ error: 'Timeout: SMS non reçu' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}


