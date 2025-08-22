export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  try {
    res.status(200).json({ ok: true, ts: Date.now() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}


