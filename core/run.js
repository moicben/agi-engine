// Orchestrator entrypoint for the AI engineering pipeline
// Usage (CLI): agi <instructions>
// High-level loop: THINK -> ANALYZE -> PLAN -> ASSIGN -> EXECUTE(+CRITIC) -> DECIDE
// Persists artifacts under core/runs/<runId>/ and prints concise progress logs
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
import { config } from './config.js';

/**
 * Execute a single run of the engine for the provided user instructions.
 *
 * Environment knobs:
 * - MAX_ITERATIONS: max loop iterations (default from config.engine.maxIterations or 3)
 * - LOG_LLM_STEPS=1: prints full step outputs (think/analyze/plan/assign) in console
 * - BACKOFF_MS: delay between retries (default from config.engine.backoffMs or 1000)
 * - CRITIC_SAMPLE_RATE: fraction of task results to pass to critic (default 1)
 */
async function run() {
    // 1) Read CLI input as the goal/instructions
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
    
    // 2) Build execution context (memory + environment scan + conscience)
    const sessionId = config?.runtime?.sessionIdDefault || 'session-test-1';
    const ctx = await buildContext(sessionId, process.cwd(), instructions);

    // 3) Initialize run (iterative micro-planning/execution)
    const runId = `${new Date().toISOString().replace(/[:.]/g,'-')}-${Math.random().toString(36).slice(2,7)}`;
    const maxIterations = Number(config.engine.maxIterations || 3);
    const shouldLogSteps = !!config?.logging?.llmSteps;
    for (let iteration = 1; iteration <= maxIterations; iteration++) {
        const paths = makeRunPaths({ runId, iterationIndex: iteration });
        ensureDir(paths.root);
        if (iteration === 1) writeJson(paths.context, { goal: instructions, sessionId, context: ctx });

        // THINK: contextualize goal
        const thinkOut = await think({ goal: instructions, context: { conscience: ctx.conscienceLite }, memorySnippet: ctx.memorySnippet, folderSummary: ctx.folderSummaryShort });
        writeJson(paths.think, thinkOut);
        // ANALYZE: classify intent and analyze problem
        const analysis = await analyze({ goal: instructions, selfThought: thinkOut, memorySnippet: ctx.memorySnippet, folderSummary: ctx.folderSummaryShort, conscience: ctx.conscienceLite });
        writeJson(paths.analyze, analysis);

        // Extract intent with simple heuristic override for QA
        let intent = 'qa';
        try { const a = JSON.parse(String(analysis)); if (a?.intent) intent = a.intent; } catch {}
        const goalStr = String(instructions || '').toLowerCase();
        const looksLikeQuestion = /\?$/.test(goalStr) || goalStr.startsWith('réponds') || goalStr.startsWith('reponds') || goalStr.startsWith('question');
        if (looksLikeQuestion) intent = 'qa';

        // QA FAST-PATH: directly answer without planning/assign when enabled
        if (intent === 'qa' && !!config?.engine?.qaFastpath) {
          const fastAssignment = { executor: 'workers/qa.answer', params: { question: instructions, context: ctx.memorySnippet }, timeout_ms: 30000 };
          const result = await executeAssignment({ assignment: fastAssignment, context: ctx, fingerprint: JSON.stringify({ ex: fastAssignment.executor, params: fastAssignment.params }) });
          writeJson(paths.taskExec('qa-fastpath'), { attempt: 1, ...result });
          try {
            const preview = result?.data?.answer ?? '';
            console.log('[result]', fastAssignment.executor, '-', truncateForLog(preview));
          } catch {}
          console.log('[engine] iteration', iteration, 'decision:', 'halt');
          break;
        }

        // PLAN: derive small, machine-actionable task graph (1–3 tasks)
        const planOut = await plan({ analysis, intent });
        let planJson = safeParse(planOut);
        let planVal = validatePlan(planJson);
        if (!planVal.ok) { throw new Error(`plan_invalid:${planVal.error}`); }

        // ASSIGN: map tasks to concrete workers/capabilities
        const assignOut = await assign({ plan: planOut, analysis, goal: instructions, context: ctx, intent });
        let assignJson = safeParse(assignOut);
        let assignVal = validateAssign(assignJson);
        if (!assignVal.ok) { throw new Error(`assign_invalid:${assignVal.error}`); }

        writeJson(paths.plan, planJson);
        writeJson(paths.assign, assignJson);
        appendLedger(paths.ledger, { run_id: runId, iteration, phase: 'plan', status: 'ok' });
        appendLedger(paths.ledger, { run_id: runId, iteration, phase: 'assign', status: 'ok' });

        if ((planJson.tasks || []).length > 7) throw new Error('plan_too_large');

        // Build topological execution order for the plan graph
        const tasksById = Object.fromEntries((planJson.tasks || []).map(t => [t.id, t]));
        const { taskIds, adjacency, topo, levels } = buildTaskGraph(planJson.tasks || []);
        const persistLevel = config?.engine?.persistLevel || 'full';
        if (persistLevel !== 'minimal') {
          writeJson(paths.planGraph, { nodes: taskIds, edges: Object.entries(adjacency).flatMap(([s, arr]) => arr.map(d => ({ from: s, to: d }))) });
        }

        const critics = []; const retriesState = {}; const byTask = {};
        for (const a of assignJson.assignments || []) { byTask[a.task_id] = a; retriesState[a.task_id] = { left: Number(a.retries ?? 3) }; }

        // EXECUTE: run assignments by levels (parallel within level, limited concurrency)
        const concurrency = Number(config?.engine?.maxConcurrency || 2);
        for (const level of levels) {
          for (let i = 0; i < level.length; i += concurrency) {
            const batch = level.slice(i, i + concurrency);
            await Promise.all(batch.map(async (tid) => {
              const a = byTask[tid]; if (!a) return;
              let attempt = 0; let result = null;
              while (attempt === 0 || (result && !result.success && retriesState[tid].left > 0)) {
                const backoff = Number(config.engine.backoffMs || 1000);
                if (attempt > 0) await new Promise(r => setTimeout(r, backoff));
                attempt++; if (attempt > 1) retriesState[tid].left--;
                const fingerprint = JSON.stringify({ ex: a.executor, params: a.params });
                result = await executeAssignment({ assignment: a, context: ctx, fingerprint });
                writeJson(paths.taskExec(tid), { attempt, ...result });
                // Concise result log
                try {
                  const ex = String(a.executor || '');
                  const preview = result?.data?.answer ?? result?.data?.note ?? result?.data?.summary ?? '';
                  const msg = preview ? String(preview) : JSON.stringify(result?.data ?? {});
                  console.log('[result]', ex, '-', truncateForLog(msg));
                } catch {}
                appendLedger(paths.ledger, { run_id: runId, iteration, phase: 'execute', task_id: tid, status: result.success ? 'success' : 'failed', attempt });
                const task = tasksById[tid] || { id: tid, name: a.name, acceptance: [] };
                const sampleRate = Number(config.engine.criticSampleRate || 1);
                const doCritic = Math.random() < sampleRate;
                const crit = doCritic ? await critic({ task, resultEnvelope: result, context: { goal: instructions } }) : { stage:'Critic', task_id: tid, success: result.success, progress: !!result.success, critic: 'skipped', recommendations: [], next: { action: result.success ? 'continue' : 'retry' } };
                if ((config?.engine?.persistLevel || 'full') !== 'minimal' || !crit.success) {
                  writeJson(paths.taskCritic(tid), { attempt, ...crit });
                }
                if (crit?.success) { critics.push(crit); break; }
                if (retriesState[tid].left <= 0) { critics.push(crit); break; }
              }
            }));
          }
        }

        // DECIDE: aggregate critics and choose next action
        const decision = decide({ iterationIndex: iteration, tasks: planJson.tasks || [], critics, retriesState, intent });
        writeJson(paths.decide, decision);

        if (shouldLogSteps) {
          console.log('[engine] think:', truncateForLog(thinkOut));
          console.log('[engine] analyze:', truncateForLog(analysis));
          console.log('[engine] plan:', truncateForLog(JSON.stringify(planJson)));
          console.log('[engine] assign:', truncateForLog(JSON.stringify(assignJson)));
        }
        console.log('[engine] iteration', iteration, 'decision:', decision.action);

        if (decision.action === 'halt') break;
        const capByIntent = (config.engine.maxIterationsByIntent && config.engine.maxIterationsByIntent[intent]) || maxIterations;
        if (iteration >= capByIntent) { console.log('[engine] reached max iterations for intent', intent); break; }
    }
}

run();

/**
 * Truncate long strings for compact logging while preserving signal.
 * Controlled by LOG_TRUNCATE (default 400 chars).
 */
function truncateForLog(text) {
    try {
        const s = String(text ?? '');
        const max = Number(config?.logging?.truncate ?? 400);
        return s.length > max ? s.slice(0, max) + '…' : s;
    } catch { return ''; }
}

/**
 * Build a directed acyclic task graph and return stable execution order (topo).
 * @param {Array<{id:string,dependencies?:string[]}>} tasks
 * @returns {{ taskIds: string[], adjacency: Record<string,string[]>, topo: string[] }}
 */
function buildTaskGraph(tasks) {
    const taskIds = (tasks || []).map(t => t.id);
    const inDegree = {}; const adjacency = {};
    for (const id of taskIds) { inDegree[id] = 0; adjacency[id] = []; }
    for (const t of (tasks || [])) {
        for (const dep of (t.dependencies || [])) {
            if (adjacency[dep]) adjacency[dep].push(t.id);
            inDegree[t.id] = (inDegree[t.id] || 0) + 1;
        }
    }
    const queue = taskIds.filter(id => inDegree[id] === 0);
    const topo = [];
    const levels = [];
    while (queue.length) {
        const levelSize = queue.length;
        const level = [];
        for (let i = 0; i < levelSize; i++) {
            const id = queue.shift();
            level.push(id);
            topo.push(id);
            for (const nb of adjacency[id]) {
                inDegree[nb]--;
                if (inDegree[nb] === 0) queue.push(nb);
            }
        }
        levels.push(level);
    }
    return { taskIds, adjacency, topo, levels };
}