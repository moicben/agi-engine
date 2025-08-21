import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';
import { getCampaignName } from './campaigns.js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

// Récupérer des nouveaux contacts par requête/source
export async function getNewContacts(query, count) {
    const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('source_query', query)
        .eq('status', 'new')
        .limit(count)
        .order('created_at', { ascending: true });

    if (error) {
        throw error;
    }

    return data;
}

// Obtenir un contact par son id
export async function getContactById(id) {
    const { data } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', id)
        .limit(1)
        .maybeSingle();
    return data;
}

// Obtenir un contact par son email
export async function getContactByEmail(email) {
    const { data } = await supabase
        .from('contacts')
        .select('*')
        .eq('email', email)
        .limit(1)
        .maybeSingle();
    return data;
}

// === Helpers génériques réutilisables pour tout le projet ===
// Normaliser un numéro FR: enlève espaces/ponctuation, convertit +33/33 en 0, valide forme 0XXXXXXXXX
export function normalizePhone(phone) {
  if (!phone) return phone;
  let normalized = String(phone).replace(/[\s.\-()]/g, '');
  if (normalized.startsWith('+33')) normalized = '0' + normalized.substring(3);
  if (normalized.startsWith('33') && normalized.length === 11) normalized = '0' + normalized.substring(2);
  return normalized;
}

// Chercher un contact par téléphone
export async function getContactByPhone(phone) {
  const normalized = normalizePhone(phone);
  const { data } = await supabase
    .from('contacts')
    .select('*')
    .eq('phone', normalized)
    .limit(1)
    .maybeSingle();
  return data;
}

// Calcul de score qualité inspiré des besoins du scraping
function calculateQualityScoreForLead(lead) {
  let score = 0;
  if (lead?.phone) score += 20;
  if (lead?.first_name) score += 15;
  if (lead?.last_name) score += 15;
  if (lead?.company) score += 20;
  if (lead?.title) score += 15;
  if (lead?.email) score += 15;
  return Math.min(score, 100);
}

// Merge des données contact existantes avec de nouvelles infos lead (champ non vide > vide)
function mergeContactData(existing, incoming) {
  const merged = { ...existing };

  const overwriteIfBetter = (field) => {
    if (incoming[field] && (!existing[field] || String(incoming[field]).length > String(existing[field] || '').length)) {
      merged[field] = incoming[field];
    }
  };

  // Champs classiques potentiels dans la table contacts
  ['name', 'first_name', 'last_name', 'company', 'title', 'email', 'city', 'source_type', 'source_platform', 'source_title', 'source_description', 'source_url', 'source_query', 'status']
    .forEach(overwriteIfBetter);

  // Merge des métadonnées additionnelles (JSON)
  const existingAdditional = existing?.additional_data || {};
  const incomingAdditional = incoming?.additional_data || {};
  merged.additional_data = { ...existingAdditional, ...incomingAdditional };

  // Qualité
  const newScore = calculateQualityScoreForLead({ ...existing, ...incoming });
  if (newScore > (existing?.quality_score || 0)) {
    merged.quality_score = newScore;
  }

  return merged;
}

function shallowEqual(objA, objB) {
  const a = objA || {};
  const b = objB || {};
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  for (const k of aKeys) {
    const av = a[k];
    const bv = b[k];
    if (typeof av === 'object' && typeof bv === 'object') {
      if (JSON.stringify(av) !== JSON.stringify(bv)) return false;
    } else if (av !== bv) {
      return false;
    }
  }
  return true;
}

// Upsert d'un lead (scraper, autres sources): identifie par téléphone puis email, ne requiert pas l'email
// Retourne { success, action: 'created'|'updated'|'duplicate', lead, message }
export async function upsertLeadContact(leadData, verbose = false) {
  const now = new Date().toISOString();

  // Construire un payload de base à partir du lead
  const normalizedPhone = leadData?.phone ? normalizePhone(leadData.phone) : null;
  const fullName = leadData?.name || [leadData?.first_name, leadData?.last_name].filter(Boolean).join(' ') || null;

  const basePayload = {
    name: fullName,
    email: leadData?.email || null,
    phone: normalizedPhone,
    company: leadData?.company || null,
    title: leadData?.title || null,
    city: leadData?.city || null,
    source_type: leadData?.source_type || null,
    source_platform: leadData?.source_platform || null,
    source_title: leadData?.source_title || null,
    source_description: leadData?.source_description || null,
    source_url: leadData?.source_url || null,
    source_query: leadData?.source_query || leadData?.source_term || null,
    status: leadData?.status || 'new',
    quality_score: calculateQualityScoreForLead({ ...leadData, phone: normalizedPhone }),
    additional_data: {
      ...(leadData?.additional_data || {}),
    }
  };

  // 1) Rechercher existant par téléphone puis email
  let existing = null;
  if (normalizedPhone) {
    existing = await getContactByPhone(normalizedPhone);
  }
  if (!existing && basePayload.email) {
    existing = await getContactByEmail(basePayload.email);
  }

  if (existing) {
    const merged = mergeContactData(existing, basePayload);
    // Enlever id et created_at de l'objet à mettre à jour
    const { id } = existing;
    const updateData = { ...merged, updated_at: now };
    delete updateData.id;
    delete updateData.created_at;

    // Déterminer s'il y a un changement
    const compareA = { ...existing };
    const compareB = { ...existing, ...updateData };
    if (shallowEqual(compareA, compareB)) {
      return { success: true, action: 'duplicate', lead: existing, message: 'Lead déjà existant' };
    }

    const { data: updData, error: updErr } = await supabase
      .from('contacts')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single();
    if (updErr) {
      return { success: false, action: 'error', error: updErr.message };
    }
    if (verbose) console.log(`♻️  Contact mis à jour: ${normalizedPhone || basePayload.email}`);
    return { success: true, action: 'updated', lead: updData };
  }

  // 2) Créer le contact
  const insertData = {
    ...basePayload,
    phone: normalizedPhone,
    created_at: now,
    updated_at: now,
  };

  const { data: insData, error: insErr } = await supabase
    .from('contacts')
    .insert(insertData)
    .select('*')
    .single();
  if (insErr) {
    return { success: false, action: 'error', error: insErr.message };
  }
  if (verbose) console.log(`🆕 Contact créé: ${normalizedPhone || basePayload.email}`);
  return { success: true, action: 'created', lead: insData };
}

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
}) {
  // storeContact reste orienté évènements (booking/login) et conserve la contrainte d'email requis
  const hasEmail = email && email.trim() !== '';
  if (!hasEmail) throw new Error('email is required for contact upsert');

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


