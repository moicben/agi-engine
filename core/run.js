// Main input/receiver of instructions from the user to active the brain

// execute this when type "agi <instructions>" in the terminal
// say me how to do this

import { think } from './engine/think.js';
import { analyze } from './engine/analyze.js';
import { plan } from './engine/plan.js';
import { todolize } from './engine/todolize.js';
import { assign } from './engine/assign.js';
import { buildContext } from './context/context.js';
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

    const node = await think(`Free-thinking. Context memory: ${ctx.memorySnippet}. Folder: ${ctx.environment?.map?.(e=>e.name).slice(0,10).join(', ')}. Goal: ${instructions}`);
    const analysis = await analyze({ goal: instructions, memorySnippet: ctx.memorySnippet, folderSummary: ctx.environment, conscience: ctx.conscience });
    const planOut = await plan({ analysis });
    const tasksOut = await todolize({ plan: planOut });
    const assignments = await assign({ tasks: tasksOut });

    const result = {
        goal: instructions,
        selfThought,
        conscience: ctx.conscience,
        analysis,
        plan: planOut,
        tasks: tasksOut,
        assignments,
    };
    console.log(JSON.stringify(result, null, 2));
}

run();