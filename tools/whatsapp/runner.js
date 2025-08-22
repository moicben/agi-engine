// Runner des workflows input, clear, brand, send
// Exemples d'utilisation:
// SETUP: node tools/whatsapp/runner.js --workflow=setup --device=emulator-5554
// INPUT: node tools/whatsapp/runner.js --workflow=input --device=6075 --country=ca
// BRAND: node tools/whatsapp/runner.js --workflow=brand --device=emulator-5556 --masterDevice=emulator-5554 --brand=ID_BRAND
// SEND: node tools/whatsapp/runner.js --workflow=send --device=emulator-5554 --campaign=ID_CAMPAGNE
// CLEAR: node tools/whatsapp/runner.js --workflow=clear --device=all
// TRANSFER: node tools/whatsapp/runner.js --workflow=transfer --device=6085 --target=emulator-5554 --country=ca
// EXTRACT: node tools/whatsapp/runner.js --workflow=extract --device=emulator-5554
// UPDATE: node tools/whatsapp/runner.js --workflow=update --device=emulator-5556 --session=+12362061930
// IMPORT: node tools/whatsapp/runner.js --workflow=import --device=emulator-5556 --session=+12362061930

import { parseArgs, sleep } from './helpers.js';
import { deviceService } from './device-service.js';
import { config as sendConfig } from './config.js';


// Récupérer le device et le pays
const args = parseArgs();

if (!args.device) {
    console.error('❌ Erreur: Device non spécifié, utiliser node runners/runner.js --workflow=<workflow> --device=<device> et --country=<country> --phone=<phone> --session=<session_phone>');
    process.exit(1);
}

// Exécuter le workflow pour un device unique
async function runSingleDevice(workflow, device, country, target, masterDevice, session) {
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
            const brandId = parseInt(args.brand);
            if (!args.brand || Number.isNaN(brandId)) {
                console.error('❌ Erreur: Brand non spécifié, utiliser --brand=<brand_id>');
                process.exit(1);
            }
            const brandConfig = sendConfig.brand?.find(b => b.id === brandId);
            if (!brandConfig) {
                console.error(`❌ Erreur: Brand ${args.brand} non trouvé dans la configuration`);
                process.exit(1);
            }
            await brandWorkflow(brandConfig, device, masterDevice || 'emulator-5554');
        } else if (workflow === 'send') {
            const { sendWorkflow } = await import('./send.js');
            // Récupération et validation de la campagne
            const campaignId = parseInt(args.campaign);
            if (!args.campaign || Number.isNaN(campaignId)) {
                console.error('❌ Erreur: Campagne non spécifiée ou invalide, utiliser --campaign=<campaign_id>');
                process.exit(1);
            }
            const campaign = sendConfig.send.find(c => c.id === campaignId);
            if (!campaign) {
                console.error(`❌ Erreur: Campagne ${args.campaign} non trouvée dans la configuration`);
                process.exit(1);
            }
            await sendWorkflow(campaign, device);
        } else if (workflow === 'setup') {
            const { setupWorkflow } = await import('./setup.js');
            await setupWorkflow(device, country);
        }
        else if (workflow === 'transfer') {
            const { transferWorkflow } = await import('./transfer.js');
            await transferWorkflow(device, country, target);
        }
        else if (workflow === 'update') {
            const { updateWorkflow } = await import('./update.js');
            await updateWorkflow(device,session);
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
    const masterDevice = args.masterDevice;
    const session = args.session;
    // console.log(`📱 Devices bruts reçus: ${rawDevices.join(', ')}`);
    // console.log(`📱 Devices normalisés: ${devices.join(', ')}`);
    console.log(`\n📱 Device(s): ${devices.join(', ')}`);
    console.log(`${target ? `🎯 Target: ${target}` : ''}`);
    console.log(`${country ? `🌍 Pays: ${country}` : ''}`);
    console.log(`${masterDevice ? `🎯 Master Device: ${masterDevice}` : ''}`);
    console.log(`${session ? `🔗 Session: ${session}` : ''}`);
    
    if (devices.length === 1) {
        // Un seul device - exécution simple
        await runSingleDevice(workflow, devices[0], country, target, masterDevice, session);
    } else {
        // Plusieurs devices - exécution en parallèle
        console.log('🔄 Exécution en parallèle...\n');
        
        const promises = devices.map((device, index) => {
            if (workflow === 'send') {
                // Délai échelonné pour éviter les doublons d'envoi
                return sleep(index * 5000).then(() => runSingleDevice(workflow, device, country, target, masterDevice, session));
            } else {
                // Délai léger pour les autres workflows
                return sleep(index * 1000).then(() => runSingleDevice(workflow, device, country, target, masterDevice, session));
            }
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