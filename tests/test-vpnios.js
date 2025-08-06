// Test du service vpnios-service.js

const { sleep, parseArgs } = require('../utils/helpers');
const { vpnIosService } = require('../services/vpnios-service');

async function main() {
    const args = parseArgs();
    if (args.device) {
        console.log(`Device: ${args.device}`);
    }

    await vpnIosService.changeVPN("ca");
}

main().catch(console.error);