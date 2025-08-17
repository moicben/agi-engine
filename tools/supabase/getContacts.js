import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

// Fonction complète récupèration de nouveaux contacts
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
    const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', id)
        .limit(1)
        .maybeSingle();
    return data;
}   



// Obtenir un contact par son email
export async function getContactByEmail(email) {
    const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('email', email)
        .limit(1)
        .maybeSingle();
    return data;
}