import { assign } from '../core/engine/assign.js';
import { validateAssign } from '../core/engine/validate.js';

async function main() {
  const plan = { stage: 'Plan', iteration: 'it-0001', tasks: [{ id: 't1', name: 'Demo', objective: 'demo', inputs: {}, outputs: {}, actions: [], dependencies: [], acceptance: [] }] };
  const out = await assign({ plan: JSON.stringify(plan), analysis: '{"stage":"Analyze"}', goal: 'demo', context: { } });
  const obj = typeof out === 'string' ? JSON.parse(out) : out;
  const v = validateAssign(obj);
  if (v.ok && v.data.assignments.length > 0) {
    console.log('OK: Assign valid with', v.data.assignments.length, 'assignment(s)');
    process.exit(0);
  }
  console.error('FAIL: Assign invalid', v.error);
  process.exit(2);
}

main().catch(e => { console.error('FAIL:', e.message); process.exit(2); });


