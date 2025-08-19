// Runner des workflows input, clear, brand, send
// Exemples d'utilisation:
// SETUP: node workers/whatsapp/runner.js --workflow=setup --device=emulator-5554
// INPUT: node workers/whatsapp/runner.js --workflow=input --device=6075 --country=ca
// BRAND: node workers/whatsapp/runner.js --workflow=brand --device=emulator-5554,127.0.0.1:6075
// SEND: node workers/whatsapp/runner.js --workflow=send --device=émulateur-5554
// CLEAR: node workers/whatsapp/runner.js --workflow=clear --device=all
// TRANSFER: node workers/whatsapp/runner.js --workflow=transfer --device=6085 --target=emulator-5554 --country=ca
// EXTRACT: node workers/whatsapp/runner.js --workflow=extract --device=emulator-5554
// IMPORT: node workers/whatsapp/runner.js --workflow=import --device=emulator-5554 --session=+12362062469

import { parseArgs, sleep } from '../../tools/whatsapp/helpers.js';
import { deviceService } from '../../tools/whatsapp/device-service.js';


// Récupérer le device et le pays
const args = parseArgs();

if (!args.device) {
    console.error('❌ Erreur: Device non spécifié, utiliser node runners/runner.js --workflow=<workflow> --device=<device> et --country=<country> --phone=<phone> --session=<session_phone>');
    process.exit(1);
}

// Exécuter le workflow pour un device unique
async function runSingleDevice(workflow, device, country, target) {
    try {
        console.log(`🚀 Démarrage du workflow ${workflow} pour device ${device}...`);

        if (workflow === 'input') {
            const { inputWorkflow } = await import('./input.js');
            await inputWorkflow(device, country);
        } else if (workflow === 'clear') {
            const { clearWorkflow } = await import('./clear.js');
            await clearWorkflow(device);
        } else if (workflow === 'brand') {
            const { brandWorkflow } = await import('./brand.js');
            await brandWorkflow(device);
        } else if (workflow === 'send') {
            const { sendWorkflow } = await import('./send.js');
            await sendWorkflow(device);
        } else if (workflow === 'setup') {
            const { setupWorkflow } = await import('./setup.js');
            await setupWorkflow(device, country);
        }
        else if (workflow === 'transfer') {
            const { transferWorkflow } = await import('./transfer.js');
            await transferWorkflow(device, country, target);
        }
        else if (workflow === 'extract') {
            const { extractWorkflow } = await import('./extract.js');
            await extractWorkflow(device);
        }
        else if (workflow === 'import') {
            const { importWorkflow } = await import('./import.js');
            const sessionDir = new URL('../../assets/wa-sessions/', import.meta.url);
            await importWorkflow(device, `${sessionDir.pathname}${args.session}`);
        }

        console.log(`✅ Device ${device}: Workflow ${workflow} terminé avec succès`);
        return { device, success: true };
    } catch (error) {
        console.error(`❌ Device ${device}: Erreur dans le workflow ${workflow}:`, error.message);
        return { device, success: false, error: error.message };
    }
}

async function run(workflow) {
    const rawDevices = Array.isArray(args.device) ? args.device : [args.device];
    const devices = rawDevices.map(deviceService.getDevice);
    const country = args.country;
    const target = args.target;
    // console.log(`📱 Devices bruts reçus: ${rawDevices.join(', ')}`);
    // console.log(`📱 Devices normalisés: ${devices.join(', ')}`);
    console.log(`\n📱 Device(s): ${devices.join(', ')}`);
    console.log(`${target ? `🎯 Target: ${target}` : ''}`);
    console.log(`${country ? `🌍 Pays: ${country}` : ''}`);
    
    if (devices.length === 1) {
        // Un seul device - exécution simple
        await runSingleDevice(workflow, devices[0], country, target);
    } else {
        // Plusieurs devices - exécution en parallèle
        console.log('🔄 Exécution en parallèle...\n');
        
        const promises = devices.map((device, index) => {
            // Délai échelonné pour éviter la surcharge
            return sleep(index * 100).then(() => runSingleDevice(workflow, device, country, target));
        });
        
        const results = await Promise.allSettled(promises);
        
        // Afficher le résumé
        console.log('\n📊 RÉSUMÉ DES RÉSULTATS:');
        console.log('═'.repeat(40));
        
        let successful = 0;
        let failed = 0;
        
        results.forEach((result, index) => {
            if (result.status === 'fulfilled') {
                const { device, success, error } = result.value;
                if (success) {
                    console.log(`✅ Device ${device}: Succès`);
                    successful++;
                } else {
                    console.log(`❌ Device ${device}: Échec - ${error}`);
                    failed++;
                }
            } else {
                console.log(`❌ Device ${devices[index]}: Erreur critique - ${result.reason}`);
                failed++;
            }
        });
        
        console.log(`\n🎯 Total: ${successful} succès, ${failed} échecs`);
        
        if (failed > 0) {
            process.exit(1);
        }
    } 

    
}

// Exécuter le workflow si le fichier est lancé directement
if (import.meta.url === `file://${process.argv[1]}`) {
    run(args.workflow).catch(error => {
        console.error('❌ Erreur:', error.message);
    process.exit(1);
    });
}

export { run };