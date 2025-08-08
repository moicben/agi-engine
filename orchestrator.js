// Main Workflow Orchestrator, using node runners/runner.js

const { runner } = require('./runners/runner');

// NECESSITIES: Start the orchestrator with already some BlueStacks running


// Phase 1. "Setup" Workflow on all opened BlueStacks Instances in parallel (x2-x4 recommended)

// Phases 2. [MAIN LOOP] - "Input" Workflow on all opened BlueStacks Instances in parallel (x2-x4 recommended)

// Phase 3. "Transfer" Workflow of verified WA account to Studio MASTER device (x1 recommended with queue)

// Phase 3.1 "Export" Workflow for each WA account received from Studio MASTER device (trigered after Phase 3)

// Phase 3.2 "Clear" Workflow on Studio MASTER device (trigered after Phase 3.1)



runner();