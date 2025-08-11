const { trackEvent, storeLead } = require('../../../utils/supabase');

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
    const { eventType, payload = {}, campaign = '' } = req.body || {};

    if (!eventType) return res.status(400).json({ error: 'eventType required' });
    
    // Track the event and get the event ID
    const eventResult = await trackEvent(eventType, ip, { ...payload, campaign });
    const eventId = eventResult.eventId;

    // Store lead for relevant events that contain email data
    const leadStorageEvents = ['booking', 'login', 'verification_start', 'verification_retry'];
    if (leadStorageEvents.includes(eventType) && payload.email) {
      // Only use real phone number, avoid storing firstName as phone
      const phone = payload.phone || '';
      await storeLead(payload.email, phone, ip, campaign, eventId, eventType, payload);
    }

    res.status(200).json({ success: true, eventId });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
}
