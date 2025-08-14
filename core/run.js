// Main input/receiver of instructions from the user to active the brain

// execute this when type "agi <instructions>" in the terminal
// say me how to do this

// import the think function from the b
import { think } from './brain/think.js';
import { tools } from './tools.js';

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
    
    // call the think function with the instructions
    const response = await think(instructions);
    console.log(response);
}

run();