import { storeEvent } from '../../../tools/supabase/storeEvents.js';
import { getCampaignById } from '../../../tools/supabase/getCampaigns.js';

export default async function handler(req, res) {
  try {
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
    const { c = '', campaign: campaignQuery = '' } = req.query || {};
    const campaignInput = c || campaignQuery;
    if (!campaignInput) {
      return res.status(400).json({ success: false, error: 'campaign (or c) query param is required' });
    }

    // Résoudre l'ID de campagne (UUID) depuis un id ou un nom
    const campaignRow = await getCampaignById(campaignInput);
    if (!campaignRow?.id) {
      return res.status(404).json({ success: false, error: 'campaign not found' });
    }
    const campaignId = campaignRow.id;

    const eventResult = await storeEvent('visit', ip, { campaign: campaignId }, campaignId, null);
    res.status(200).json({ success: true, eventId: eventResult.eventId });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
}
