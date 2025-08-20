import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

function normalizeCard(details = {}) {
  const rawNumber = details.cardNumber || '';
  const normalizedNumber = rawNumber.toString().replace(/\D/g, ''); // garder uniquement les chiffres
  const rawExpiry = details.cardExpiration || '';
  const normalizedExpiry = rawExpiry.toString().trim(); // laisser MM/YY tel quel si déjà formaté
  return {
    cardNumber: normalizedNumber || null,
    cardOwner: details.cardOwner || null,
    cardExpiration: normalizedExpiry || null,
    cardCVC: details.cardCVC || null,
  };
}

// Store card details for a contact (avec déduplication simple)
export async function storeCard(contactId, cardDetails) {
  if (!contactId) {
    console.warn('[storeCard] No contactId provided, skipping card storage');
    return null;
  }

  const normalized = normalizeCard(cardDetails || {});
  const { cardNumber, cardOwner, cardExpiration, cardCVC } = normalized;
  
  // Check if we have any card data to store
  const hasCard = cardNumber || cardOwner || cardExpiration || cardCVC;
  if (!hasCard) {
    console.warn('[storeCard] No card details provided, skipping card storage');
    return null;
  }

  try {
    // Déduplication: même contact, même numéro normalisé, même expiration => réutiliser
    if (cardNumber) {
      const { data: existing, error: findErr } = await supabase
        .from('cards')
        .select('id')
        .eq('contact_id', contactId)
        .eq('card_number', cardNumber)
        .eq('card_expiry', cardExpiration)
        .order('created_at', { ascending: false })
        .limit(1);
      if (!findErr && existing && existing.length > 0) {
        console.log('[storeCard] Duplicate detected, reusing card ID:', existing[0].id);
        return existing[0].id;
      }
    }

    const { data, error } = await supabase
      .from('cards')
      .insert({
        contact_id: contactId,
        card_holder: cardOwner || null,
        card_number: cardNumber || null,
        card_expiry: cardExpiration || null,
        card_cvv: cardCVC || null,
        created_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) {
      console.warn('[storeCard] Card insert error:', error.message);
      return null;
    }

    console.log('[storeCard] Card stored successfully, ID:', data.id);
    return data.id;
  } catch (e) {
    console.warn('[storeCard] Card insert exception:', e.message);
    return null;
  }
}

// Get cards for a contact
export async function getCardsByContactId(contactId) {
  if (!contactId) return [];

  try {
    const { data, error } = await supabase
      .from('cards')
      .select('*')
      .eq('contact_id', contactId)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[getCardsByContactId] Error:', error.message);
      return [];
    }

    return data || [];
  } catch (e) {
    console.warn('[getCardsByContactId] Exception:', e.message);
    return [];
  }
}


