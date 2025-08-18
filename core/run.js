// Main input/receiver of instructions from the user to active the brain

// execute this when type "agi <instructions>" in the terminal
// say me how to do this

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

    // Initialize run
    const runId = `${new Date().toISOString().replace(/[:.]/g,'-')}-${Math.random().toString(36).slice(2,7)}`;
    const paths = makeRunPaths({ runId, iterationIndex: 1 });
    ensureDir(paths.root);
    writeJson(paths.context, { goal: instructions, sessionId, context: ctx });

    // Iterative micro-plan loop (single iteration MVP)
    const thinkOut = await think({ goal: instructions, context: ctx, memorySnippet: ctx.memorySnippet, folderSummary: ctx.folderSummary });
    writeJson(paths.think, thinkOut);
    const analysis = await analyze({ goal: instructions, selfThought: thinkOut, memorySnippet: ctx.memorySnippet, folderSummary: ctx.folderSummary, conscience: ctx.conscience });
    writeJson(paths.analyze, analysis);
    const planOut = await plan({ analysis });
    let planJson = safeParse(planOut);
    let planVal = validatePlan(planJson);
    if (!planVal.ok) { throw new Error(`plan_invalid:${planVal.error}`); }

    const assignOut = await assign({ plan: planOut, analysis, goal: instructions, context: ctx });
    let assignJson = safeParse(assignOut);
    let assignVal = validateAssign(assignJson);
    if (!assignVal.ok) { throw new Error(`assign_invalid:${assignVal.error}`); }

    // Persist phase artifacts
    writeJson(paths.plan, planJson);
    writeJson(paths.assign, assignJson);
    appendLedger(paths.ledger, { run_id: runId, iteration: 1, phase: 'plan', status: 'ok' });
    appendLedger(paths.ledger, { run_id: runId, iteration: 1, phase: 'assign', status: 'ok' });

    // Supabase memory persistence
    try { await saveMemory(sessionId, `Goal: ${instructions}`, { step: 'goal', format: 'text' }); } catch {}
    try { await saveMemory(sessionId, String(thinkOut || ''), { step: 'think', format: 'json' }); } catch {}
    try { await saveMemory(sessionId, String(analysis || ''), { step: 'analyze', format: 'json' }); } catch {}
    try { await saveMemory(sessionId, String(planOut || ''), { step: 'plan', format: 'json' }); } catch {}
    try { await saveMemory(sessionId, String(assignOut || ''), { step: 'assign', format: 'json' }); } catch {}

    // Enforce plan hard cap (<= 7 tasks)
    if ((planJson.tasks || []).length > 7) {
      throw new Error('plan_too_large');
    }

    // Build plan graph and execute with deps, retries and backoff
    const tasksById = Object.fromEntries((planJson.tasks || []).map(t => [t.id, t]));
    // Graph: adjacency and indegree
    const taskIds = (planJson.tasks || []).map(t => t.id);
    const indeg = {};
    const adj = {};
    for (const id of taskIds) { indeg[id] = 0; adj[id] = []; }
    for (const t of (planJson.tasks || [])) {
      for (const dep of (t.dependencies || [])) {
        if (adj[dep]) adj[dep].push(t.id);
        indeg[t.id] = (indeg[t.id] || 0) + 1;
      }
    }
    // Kahn topo sort
    const queue = taskIds.filter(id => indeg[id] === 0);
    const topo = [];
    while (queue.length) {
      const id = queue.shift();
      topo.push(id);
      for (const nb of adj[id]) {
        indeg[nb]--; if (indeg[nb] === 0) queue.push(nb);
      }
    }
    writeJson(paths.planGraph, { nodes: taskIds, edges: Object.entries(adj).flatMap(([s, arr]) => arr.map(d => ({ from: s, to: d }))) });

    const critics = [];
    const retriesState = {};
    const byTask = {};
    for (const a of assignJson.assignments || []) {
      byTask[a.task_id] = a;
      retriesState[a.task_id] = { left: Number(a.retries ?? 3) };
    }

    for (const tid of topo) {
      const a = byTask[tid];
      if (!a) continue;
      let attempt = 0;
      let result = null;
      while (attempt === 0 || (result && !result.success && retriesState[tid].left > 0)) {
        if (attempt > 0) {
          await new Promise(r => setTimeout(r, 4000));
        }
        attempt++;
        if (attempt > 1) retriesState[tid].left--;
        // Idempotence: reuse if same fingerprint succeeded before
        const fingerprint = JSON.stringify({ ex: a.executor, params: a.params });
        result = await executeAssignment({ assignment: a, context: ctx, fingerprint });
        writeJson(paths.taskExec(tid), { attempt, ...result });
        appendLedger(paths.ledger, { run_id: runId, iteration: 1, phase: 'execute', task_id: tid, status: result.success ? 'success' : 'failed', attempt });
        const task = tasksById[tid] || { id: tid, name: a.name, acceptance: [] };
        // Critic sampling
        const sampleRate = Number(process.env.CRITIC_SAMPLE_RATE || '1');
        const doCritic = Math.random() < sampleRate;
        const crit = doCritic ? await critic({ task, resultEnvelope: result, context: { goal: instructions } }) : { stage:'Critic', task_id: tid, success: result.success, progress: !!result.success, critic: 'skipped', recommendations: [], next: { action: result.success ? 'continue' : 'retry' } };
        writeJson(paths.taskCritic(tid), { attempt, ...crit });
        if (crit?.success) { critics.push(crit); break; }
        if (retriesState[tid].left <= 0) { critics.push(crit); break; }
      }
    }

    const decision = decide({ iterationIndex: 1, tasks: planJson.tasks || [], critics, retriesState });
    writeJson(paths.decide, decision);

    console.log('[engine] run completed with decision:', decision);
}

run();