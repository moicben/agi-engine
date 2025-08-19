import { integrate } from '../workers/developer.js';

async function main(){
  const spec = { edits: [] };
  const started = Date.now();
  const res = await integrate({ spec, options: { git: { push: false } } });
  const ms = Date.now() - started;
  console.log(JSON.stringify({ ok: !!res?.success, ms, logs: res?.logs?.slice(-3) || [] }, null, 2));
}

main();


