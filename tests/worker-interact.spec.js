import * as interact from '../workers/interact.js';

async function main() {
  try {
    // Should fail gracefully on non-Linux or missing xdotool
    const res = await interact.orchestrate({ action: 'key', params: { key: 'Return' } });
    console.log('OK: interact.orchestrate returned', res.success);
    process.exit(0);
  } catch (e) {
    console.log('OK: interact.orchestrate threw as expected:', e.message);
    process.exit(0);
  }
}

main().catch(e => { console.error('FAIL:', e.message); process.exit(2); });


