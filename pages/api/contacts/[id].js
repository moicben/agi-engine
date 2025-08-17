import { getContactById } from '../../../tools/supabase/getContacts.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id } = req.query;
    
    if (!id) {
      return res.status(400).json({ error: 'Contact ID is required' });
    }

    const contact = await getContactById(id);
    
    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    return res.status(200).json(contact);
  } catch (error) {
    console.error('Error getting contact by ID:', error);
    return res.status(500).json({ error: error.message });
  }
}
