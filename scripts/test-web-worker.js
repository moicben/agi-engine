import { search } from '../workers/web/search.js';

async function main(){
  const query = process.argv.slice(2).join(' ') || 'site officiel mairie de paris';
  const started = Date.now();
  const res = await search({ query, maxResults: 5 });
  const ms = Date.now() - started;
  console.log(JSON.stringify({ ok: !!res?.success, ms, results: res?.data?.results?.slice(0,3) || [] }, null, 2));
}

main();


