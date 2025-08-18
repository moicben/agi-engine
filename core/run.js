// Main input/receiver of instructions from the user to active the brain
// execute this when type "agi <instructions>" in the terminal
// say me how to do this
import 'dotenv/config';

import { think } from './engine/think.js';
import { analyze } from './engine/analyze.js';
import { plan } from './engine/plan.js';
import { assign } from './engine/assign.js';
import { critic } from './engine/critic.js';
import { executeAssignment } from './engine/execute.js';
import { decide } from './engine/decide.js';
import { buildContext } from './context/context.js';
import { saveMemory } from './context/memory.js';
import { ensureDir, writeJson, appendLedger, makeRunPaths } from './engine/persist.js';
import { validatePlan, validateAssign, validateCritic, safeParse } from './engine/validate.js';

async function run() {
    // get the instructions from the user
    const args = process.argv.slice(2);
    
    let instructions = '';
    
    // If there are arguments, use the first one as instructions
    if (args.length > 0) {
        // If first argument doesn't start with '--', use it as instructions
        if (!args[0].startsWith('--')) {
            instructions = args[0];
        } else {
            // For named arguments, we could extract a specific parameter or use a default
            // For now, let's use a default message
            instructions = 'Please help me with the provided parameters.';
        }
    }
    
    const sessionId = process.env.AGI_SESSION_ID || 'session-test-1';
    const ctx = await buildContext(sessionId, process.cwd());

    // Initialize run (iterative)
    const runId = `${new Date().toISOString().replace(/[:.]/g,'-')}-${Math.random().toString(36).slice(2,7)}`;
    const maxIterations = Number(process.env.MAX_ITERATIONS || 3);
    for (let iteration = 1; iteration <= maxIterations; iteration++) {
        const paths = makeRunPaths({ runId, iterationIndex: iteration });
        ensureDir(paths.root);
        if (iteration === 1) writeJson(paths.context, { goal: instructions, sessionId, context: ctx });

        const thinkOut = await think({ goal: instructions, context: ctx, memorySnippet: ctx.memorySnippet, folderSummary: ctx.folderSummary });
        writeJson(paths.think, thinkOut);
        const analysis = await analyze({ goal: instructions, selfThought: thinkOut, memorySnippet: ctx.memorySnippet, folderSummary: ctx.folderSummary, conscience: ctx.conscience });
        writeJson(paths.analyze, analysis);

        // Extract intent
        let intent = 'qa';
        try { const a = JSON.parse(String(analysis)); if (a?.intent) intent = a.intent; } catch {}

        const planOut = await plan({ analysis, intent });
        let planJson = safeParse(planOut);
        let planVal = validatePlan(planJson);
        if (!planVal.ok) { throw new Error(`plan_invalid:${planVal.error}`); }

        const assignOut = await assign({ plan: planOut, analysis, goal: instructions, context: ctx, intent });
        let assignJson = safeParse(assignOut);
        let assignVal = validateAssign(assignJson);
        if (!assignVal.ok) { throw new Error(`assign_invalid:${assignVal.error}`); }

        writeJson(paths.plan, planJson);
        writeJson(paths.assign, assignJson);
        appendLedger(paths.ledger, { run_id: runId, iteration, phase: 'plan', status: 'ok' });
        appendLedger(paths.ledger, { run_id: runId, iteration, phase: 'assign', status: 'ok' });

        if ((planJson.tasks || []).length > 7) throw new Error('plan_too_large');

        const tasksById = Object.fromEntries((planJson.tasks || []).map(t => [t.id, t]));
        const taskIds = (planJson.tasks || []).map(t => t.id);
        const indeg = {}; const adj = {};
        for (const id of taskIds) { indeg[id] = 0; adj[id] = []; }
        for (const t of (planJson.tasks || [])) for (const dep of (t.dependencies || [])) { if (adj[dep]) adj[dep].push(t.id); indeg[t.id] = (indeg[t.id] || 0) + 1; }
        const queue = taskIds.filter(id => indeg[id] === 0);
        const topo = []; while (queue.length) { const id = queue.shift(); topo.push(id); for (const nb of adj[id]) { indeg[nb]--; if (indeg[nb] === 0) queue.push(nb); } }
        writeJson(paths.planGraph, { nodes: taskIds, edges: Object.entries(adj).flatMap(([s, arr]) => arr.map(d => ({ from: s, to: d }))) });

        const critics = []; const retriesState = {}; const byTask = {};
        for (const a of assignJson.assignments || []) { byTask[a.task_id] = a; retriesState[a.task_id] = { left: Number(a.retries ?? 3) }; }

        for (const tid of topo) {
          const a = byTask[tid]; if (!a) continue;
          let attempt = 0; let result = null;
          while (attempt === 0 || (result && !result.success && retriesState[tid].left > 0)) {
            if (attempt > 0) await new Promise(r => setTimeout(r, 4000));
            attempt++; if (attempt > 1) retriesState[tid].left--;
            const fingerprint = JSON.stringify({ ex: a.executor, params: a.params });
            result = await executeAssignment({ assignment: a, context: ctx, fingerprint });
            writeJson(paths.taskExec(tid), { attempt, ...result });
            appendLedger(paths.ledger, { run_id: runId, iteration, phase: 'execute', task_id: tid, status: result.success ? 'success' : 'failed', attempt });
            const task = tasksById[tid] || { id: tid, name: a.name, acceptance: [] };
            const sampleRate = Number(process.env.CRITIC_SAMPLE_RATE || '1');
            const doCritic = Math.random() < sampleRate;
            const crit = doCritic ? await critic({ task, resultEnvelope: result, context: { goal: instructions } }) : { stage:'Critic', task_id: tid, success: result.success, progress: !!result.success, critic: 'skipped', recommendations: [], next: { action: result.success ? 'continue' : 'retry' } };
            writeJson(paths.taskCritic(tid), { attempt, ...crit });
            if (crit?.success) { critics.push(crit); break; }
            if (retriesState[tid].left <= 0) { critics.push(crit); break; }
          }
        }

        const decision = decide({ iterationIndex: iteration, tasks: planJson.tasks || [], critics, retriesState });
        writeJson(paths.decide, decision);

        if (process.env.LOG_LLM_STEPS !== '0') {
          console.log('[engine] think:', truncateForLog(thinkOut));
          console.log('[engine] analyze:', truncateForLog(analysis));
          console.log('[engine] plan:', truncateForLog(JSON.stringify(planJson)));
          console.log('[engine] assign:', truncateForLog(JSON.stringify(assignJson)));
        }
        console.log('[engine] iteration', iteration, 'decision:', decision.action);

        if (decision.action === 'halt') break;
        if (iteration === maxIterations) { console.log('[engine] reached max iterations'); break; }
    }
}

run();

function truncateForLog(text) {
    try {
        const s = String(text ?? '');
        const max = Number(process.env.LOG_TRUNCATE || 400);
        return s.length > max ? s.slice(0, max) + '…' : s;
    } catch { return ''; }
}