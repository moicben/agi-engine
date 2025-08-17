// Export all Supabase functions from a central location

// Contact management
export { storeContact, updateContactStatus } from './storeContact.js';
export { getNewContacts, getContactById, getContactByEmail } from './getContacts.js';

// Card management
export { storeCard, getCardsByContactId } from './storeCards.js';

// Login management
export { storeLogin, getLoginsByContactId } from './storeLogins.js';

// Payment management
export { createPayment, updatePayment } from './storePayments.js';

// Event tracking
export { storeEvent } from './storeEvents.js';

// Campaign management
export { getCampaignById } from './getCampaigns.js';
