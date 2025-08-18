import { plan } from '../core/engine/plan.js';
import { validatePlan } from '../core/engine/validate.js';

async function main() {
  const out = await plan({ analysis: '{"stage":"Analyze"}' });
  const obj = typeof out === 'string' ? JSON.parse(out) : out;
  const v = validatePlan(obj);
  if (v.ok && v.data.tasks.length > 0) {
    console.log('OK: Plan valid with', v.data.tasks.length, 'task(s)');
    process.exit(0);
  }
  console.error('FAIL: Plan invalid', v.error);
  process.exit(2);
}

main().catch(e => { console.error('FAIL:', e.message); process.exit(2); });


