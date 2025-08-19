// Main Workflow Orchestrator, using node runners/runner.js

import { execAsync, parseArgs, sleep } from '../../tools/whatsapp/helpers.js';
import { deviceService } from '../../tools/whatsapp/device-service.js';

async function main() {
  const args = parseArgs();
  const country = args.country || 'ca';

  // Phase 0: Discover BlueStacks devices using DiscoverDevice function
  console.log('🔍 Découverte automatique des instances BlueStacks...');
  const bluestacks = await deviceService.discoverBluestacksInstance();
  const master = 'emulator-5554';

  console.log(`✅ BlueStacks détectés: ${bluestacks.join(', ')}`);
  console.log(`🎯 Master device: ${master}`);

  // Launch master if needed
  await deviceService.launchStudioDevice('MASTER');

// Phase 1. "Setup" Workflow on all opened BlueStacks Instances in parallel (x2-x4 recommended)

  if (bluestacks.length > 0) {
    const setupCmd = `node workers/whatsapp/runner.js --workflow=setup --device=${bluestacks.join(',')} --country=${country}`;
    console.log(`Executing Phase 1: ${setupCmd}`);
    await execAsync(setupCmd);
  }

// Phases 2. [MAIN LOOP] - "Input" Workflow on all opened BlueStacks Instances in parallel (x2-x4 recommended)

  while (true) {
    // Phase 2: Input in parallel
    if (bluestacks.length > 0) {
      const inputCmd = `node workers/whatsapp/runner.js --workflow=input --device=${bluestacks.join(',')} --country=${country}`;
      console.log(`Executing Phase 2: ${inputCmd}`);
      await execAsync(inputCmd);
    }

    // Sequential processing for each BlueStacks
    for (const bs of bluestacks) {

// Phase 3. "Transfer" Workflow of verified WA account to Studio MASTER device (x1 recommended with queue)

      const transferCmd = `node workers/whatsapp/runner.js --workflow=transfer --device=${bs} --country=${country}`;
      console.log(`Executing Phase 3 for ${bs}: ${transferCmd}`);
      await execAsync(transferCmd);

// Phase 3.1 "Export" Workflow for each WA account received from Studio MASTER device (trigered after Phase 3)

      const exportCmd = `node workers/whatsapp/runner.js --workflow=extract --device=${master}`;
      console.log(`Executing Phase 3.1: ${exportCmd}`);
      await execAsync(exportCmd);

// Phase 3.2 "Clear" Workflow on Studio MASTER device (trigered after Phase 3.1)

      const clearMasterCmd = `node workers/whatsapp/runner.js --workflow=clear --device=${master}`;
      console.log(`Executing Phase 3.2: ${clearMasterCmd}`);
      await execAsync(clearMasterCmd);

    }

    // Small delay before next cycle
    await sleep(2000);
  }
}

main().catch(error => {
  console.error('Orchestrator error:', error);
  process.exit(1);
});