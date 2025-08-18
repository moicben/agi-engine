// Main input/receiver of instructions from the user to active the brain

// execute this when type "agi <instructions>" in the terminal
// say me how to do this

import { think } from './engine/think.js';
import { analyze } from './engine/analyze.js';
import { plan } from './engine/plan.js';
import { assign } from './engine/assign.js';
import { buildContext } from './context/context.js';
import { saveMemory } from './context/memory.js';

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

    let selfThought = await think(`Pensée libre. Mémoire de contexte: ${ctx.memorySnippet}. Dossiers: ${ctx.environment?.map?.(e=>e.name).slice(0,10).join(', ')}. Objectif: ${instructions}`);
    
    const analysis = await analyze({ goal: instructions, selfThought, memorySnippet: ctx.memorySnippet, folderSummary: ctx.environment, conscience: ctx.conscience });
    const planOut = await plan({ analysis });
    const assignments = await assign({ plan: planOut, analysis, goal: instructions, context: ctx });

    // Persist conversation artifacts into Supabase memories
    try { await saveMemory(sessionId, `Goal: ${instructions}`, { step: 'goal', format: 'text' }); } catch {}
    try { await saveMemory(sessionId, String(selfThought || ''), { step: 'think', format: 'text' }); } catch {}
    try { await saveMemory(sessionId, String(analysis || ''), { step: 'analyze', format: 'json' }); } catch {}
    try { await saveMemory(sessionId, String(planOut || ''), { step: 'plan', format: 'json' }); } catch {}
    try { await saveMemory(sessionId, String(assignments || ''), { step: 'assign', format: 'json' }); } catch {}

    const result = {
        goal: instructions,
        selfThought,
        conscience: ctx.conscience,
        analysis,
        plan: planOut,
        assignments,
    };
    console.log('--------------------------------');
    console.log('selfThought:', selfThought);
    console.log('--------------------------------');
    console.log('analysis:', analysis);
    console.log('--------------------------------');
    console.log('plan:', planOut);
    console.log('--------------------------------');
    console.log('assignments:', assignments);
    console.log('--------------------------------');
    console.log('\n\n');
}

run();