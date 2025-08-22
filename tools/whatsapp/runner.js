// Runner des workflows input, clear, brand, send
// Exemples d'utilisation:
// SETUP: node tools/whatsapp/runner.js --workflow=setup --device=5554
// INPUT: node tools/whatsapp/runner.js --workflow=input --device=6075 --country=ca
// BRAND: node tools/whatsapp/runner.js --workflow=brand --device=5556 --masterDevice=5554 --brand=ID_BRAND
// SEND: node tools/whatsapp/runner.js --workflow=send --device=5554 --campaign=6 --count=3 --style=simple --session=+6285758033963
// CLEAR: node tools/whatsapp/runner.js --workflow=clear --device=all
// TRANSFER: node tools/whatsapp/runner.js --workflow=transfer --device=6085 --target=5554 --country=ca
// EXTRACT: node tools/whatsapp/runner.js --workflow=extract --device=5554
// UPDATE: node tools/whatsapp/runner.js --workflow=update --device=5556 --session=+15197047235
// IMPORT: node tools/whatsapp/runner.js --workflow=import --device=5556 --session=+6285758033963


// SENDER: node tools/whatsapp/runner.js --workflow=send --device=5554 --campaign=6 --count=3 --style=simple --session=+6285758033963
// CREATE: node tools/whatsapp/runner.js --workflow=create --device=5554 --country=ca



// LOCAL WORKFLOW :
//
// IMPORT SUR MASTER: node tools/whatsapp/runner.js --workflow=import --device=5562 --session=+17052017869
// UPDATE SUR MASTER: node tools/whatsapp/runner.js --workflow=update --device=5562 --session=+17052017869
// IMPORTS SLAVES: node tools/whatsapp/runner.js --workflow=import --device=5554,5556,5558,5560,5562 --session=+17052017869
// SENDS SLAVES: node tools/whatsapp/runner.js --workflow=send --device=5554,5556,5558,5560,5562 --campaign=ID --count=3


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
async function runSingleDevice(workflow, device, country, target, masterDevice, session, style) {


    // TEMPORAIRE
    device = 'emulator-' + device;


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
            await brandWorkflow(brandConfig, device, style, masterDevice || 'emulator-5554');
        } 
        else if (workflow === 'create') {
            const { createOrchestrator } = await import('./create.js');
            await createOrchestrator(device, country, target, masterDevice, session, style);
        }
        else if (workflow === 'send') {
            const { senderOrchestrator } = await import('./sender.js');
            // Récupération et validation de la campagne
            const campaignId = parseInt(args.campaign);
            const countNum = Number(args.count);
            if (!args.campaign || Number.isNaN(campaignId) || Number.isNaN(countNum)) {
                console.error('❌ Erreur: Paramètres invalides. Utiliser --campaign=<campaign_id> et --count=<nombre_de_messages>');
                process.exit(1);
            }
            const campaign = sendConfig.send.find(c => c.id === campaignId);
            if (!campaign) {
                console.error(`❌ Erreur: Campagne ${args.campaign} non trouvée dans la configuration`);
                process.exit(1);
            }
            // senderOrchestrator attend un tableau de devices
            await senderOrchestrator(campaign, [device], countNum, session);
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
    const count = args.count;
    const style = args.style;
    // console.log(`📱 Devices bruts reçus: ${rawDevices.join(', ')}`);
    // console.log(`📱 Devices normalisés: ${devices.join(', ')}`);
    console.log(`\n📱 Device(s): ${devices.join(', ')}`);
    target && console.log(`🎯 Target: ${target}`);
    country && console.log(`🌍 Pays: ${country}`);
    masterDevice && console.log(`🎯 Master Device: ${masterDevice}`);
    session && console.log(`🔗 Session: ${session}`);
    count && console.log(`🔄 Nombre de messages: ${count}`);
    style && console.log(`🔄 Style: ${style}`);
    console.log(`🔄 Workflow: ${workflow}`);
    
    // Cas spécial: SEND doit orchestrer tous les devices en une seule passe pour éviter les doublons
    if (workflow === 'send') {
        const { senderOrchestrator } = await import('./sender.js');
        const campaignId = parseInt(args.campaign);
        const countNum = Number(args.count);
        if (!args.campaign || Number.isNaN(campaignId) || Number.isNaN(countNum)) {
            console.error('❌ Erreur: Paramètres invalides. Utiliser --campaign=<campaign_id> et --count=<nombre_de_messages>');
            process.exit(1);
        }
        const campaign = sendConfig.send.find(c => c.id === campaignId);
        if (!campaign) {
            console.error(`❌ Erreur: Campagne ${args.campaign} non trouvée dans la configuration`);
            process.exit(1);
        }
        await senderOrchestrator(campaign, devices, countNum, session);
        return;
    }

    if (devices.length === 1) {
        // Un seul device - exécution simple
        await runSingleDevice(workflow, devices[0], country, target, masterDevice, session, style);
    } else {
        // Plusieurs devices - exécution en parallèle
        console.log('🔄 Exécution en parallèle...\n');
        
        const promises = devices.map((device, index) => {
            // Délai léger pour les autres workflows
            return sleep(index * 1000).then(() => runSingleDevice(workflow, device, country, target, masterDevice, session, style));
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