import axios from 'axios';
import https from 'https';
import dns from 'node:dns';

const SMS_API_URL = 'https://api.sms-activate.org/stubs/handler_api.php';
const countryMap = { FR: 78, UK: 16, US: 187, PH: 4, DE: 43, ES: 56, CA: 36 };

async function apiCall(params, agent, ipv4Lookup) {
  if (!process.env.SMS_ACTIVATE_API_KEY) throw new Error('SMS_ACTIVATE_API_KEY manquante');
  const client = axios.create({ httpsAgent: agent, proxy: false, timeout: 7000 });
  // axios ne supporte pas lookup directement, on privilégie IPv4 via family=4 côté système
  const { data } = await client.get(SMS_API_URL, { params: { api_key: process.env.SMS_ACTIVATE_API_KEY, ...params } });
  return data;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const country = String(req.query.country || 'UK').toUpperCase();
    const byPassVpn = String(req.query.bypass || 'true') === 'true';

    let agent = undefined;
    if (byPassVpn) {
      // Tentative de sortie par interface locale standard; sur serveur pod, laisser défaut
      try {
        const localAddress = process.env.SMS_LOCAL_ADDRESS || undefined;
        agent = new https.Agent({ localAddress, keepAlive: true });
      } catch {}
    }

    const data = await apiCall({ action: 'getNumber', service: 'wa', country: countryMap[country] || 16 }, agent);
    if (typeof data === 'string' && data.includes('ACCESS_NUMBER')) {
      const [, id, phone] = data.split(':');
      res.status(200).json({ id, phone: `+${phone}`, country });
      return;
    }
    res.status(200).json({ error: String(data) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}


