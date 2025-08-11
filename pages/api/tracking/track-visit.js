const { trackEvent } = require('../../../utils/supabase');

export default async function handler(req, res) {
  try {
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
    const { campaign = '' } = req.query || {};
    const eventResult = await trackEvent('visit', ip, { campaign });
    res.status(200).json({ success: true, eventId: eventResult.eventId });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
}
