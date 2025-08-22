import { storeEvent } from '../../../tools/supabase/events.js';
import { getCampaignById, incrementCounterOncePerContact, incrementContactOncePerCampaign } from '../../../tools/supabase/campaigns.js';
import { getContactByEmail } from '../../../tools/supabase/contacts.js';

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

    // Optionally associate a contact if email query is present, to enable per-contact counting for visits
    const { email = '' } = req.query || {};
    const contactId = email ? (await getContactByEmail(email).catch(()=>null))?.id || null : null;

    const eventResult = await storeEvent('visit', ip, { campaign: campaignId }, campaignId, contactId || null);

    // If we have a contact, ensure we increment only once per contact for visits
    if (contactId) {
      await incrementCounterOncePerContact(campaignId, contactId, 'visit');
      // Also track unique contact in campaign counters
      // (will increment total_contacts and, on first contact event, total_visits)
      await incrementContactOncePerCampaign(campaignId, contactId);
    }

    res.status(200).json({ success: true, eventId: eventResult.eventId, contactId: contactId || null });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
}
