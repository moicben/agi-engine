import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';
//node scripts/cleanContacts.js --query=<source_query>

function parseArgs() {
  const args = {};
  for (const raw of process.argv.slice(2)) {
    if (raw.startsWith('--')) {
      const [k, v] = raw.substring(2).split('=');
      args[k] = v ?? true;
    }
  }
  return args;
}

async function main() {
  const args = parseArgs();
  const sourceQuery = args.query || args.q;

  if (!sourceQuery) {
    console.error('❌ Usage: node scripts/cleanContacts.js --query=<source_query>');
    process.exit(1);
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Supabase credentials missing. Set SUPABASE_URL and SUPABASE_SERVICE_KEY/SUPABASE_KEY');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log(`🧹 Cleaning contacts: source_query="${sourceQuery}", status in_progress -> new`);

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('contacts')
    .update({ status: 'new', updated_at: now })
    .eq('source_query', sourceQuery)
    .eq('status', 'in_progress')
    .select('id');

  if (error) {
    console.error('❌ Supabase error:', error.message || error);
    process.exit(1);
  }

  const count = Array.isArray(data) ? data.length : 0;
  console.log(`✅ Updated ${count} contact(s) to status "new".`);
}

main().catch(err => {
  console.error('❌ Fatal error:', err?.message || err);
  process.exit(1);
});


