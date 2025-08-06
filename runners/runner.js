// Runner des workflows input, clear, brand, send
// node runners/runner.js --workflow=input --device=6075 --country=ca

const { inputWorkflow } = require('../workflows/input');
const { clearWorkflow } = require('../workflows/clear');
const { brandWorkflow } = require('../workflows/brand');
const { sendWorkflow } = require('../workflows/send');
const { setupWorkflow } = require('../workflows/setup');
const { parseArgs, sleep } = require('../utils/helpers');
const { getDevice } = require('../services/device-service');


// Récupérer le device et le pays
const args = parseArgs();

if (!args.device) {
    console.error('❌ Erreur: Device non spécifié, utiliser node runners/runner.js --workflow=<workflow> --device=<device> ou --device=<device1,device2,device3> et --country=<country>');
    process.exit(1);
}

// Exécuter le workflow pour un device unique
async function runSingleDevice(workflow, device, country) {

    try {
        console.log(`🚀 Démarrage du workflow ${workflow} pour device ${device}...`);

        if (workflow === 'input') {
            await inputWorkflow(device, country);
        } else if (workflow === 'clear') {
            await clearWorkflow(device);
        } else if (workflow === 'brand') {
            await brandWorkflow(device);
        } else if (workflow === 'send') {
            await sendWorkflow(device);
        } else if (workflow === 'setup') {
            await setupWorkflow(device, country);
        }

        console.log(`✅ Device ${device}: Workflow ${workflow} terminé avec succès`);
        return { device, success: true };
    } catch (error) {
        console.error(`❌ Device ${device}: Erreur dans le workflow ${workflow}:`, error.message);
        return { device, success: false, error: error.message };
    }
}

async function run(workflow) {
    const devices = Array.isArray(args.device) ? args.device.map(getDevice) : [getDevice(args.device)];
    const country = args.country;
    
    console.log(`📱 Lancement sur ${devices.length} device(s): ${devices.join(', ')}`);
    console.log(`🌍 Pays: ${country || 'défaut'}\n`);
    
    if (devices.length === 1) {
        // Un seul device - exécution simple
        await runSingleDevice(workflow, devices[0], country);
    } else {
        // Plusieurs devices - exécution en parallèle
        console.log('🔄 Exécution en parallèle...\n');
        
        const promises = devices.map((device, index) => {
            // Délai échelonné pour éviter la surcharge
            return sleep(index * 2000).then(() => runSingleDevice(workflow, device, country));
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
if (require.main === module) {
    run(args.workflow);
}

module.exports = { run };