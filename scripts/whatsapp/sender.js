// Runner du workflow send.js

import { sendWorkflow } from './send.js';
import { config } from '../../core/config.js';
import { parseArgs } from '../../tools/whatsapp/helpers.js';

let device = '127.0.0.1'
let campaign;



// Récupérer le device et la campagne
const args = parseArgs();

if (!args.device) {
    console.error('❌ Erreur: Device non spécifié, utiliser --device=<device> et --campaign=<campaign_id>');
    process.exit(1);
}

// Trouver le port du device dans la configuration
const deviceConfig = config.devicePorts.find(d => d.id === parseInt(args.device));
if (!deviceConfig) {
    console.error(`❌ Erreur: Device ${args.device} non trouvé dans la configuration`);
    process.exit(1);
}

device = `${device}:${deviceConfig.port}`;
campaign = config.send.find(campaign => campaign.id === parseInt(args.campaign));

if (!campaign) {
    console.error('❌ Erreur: Campagne non spécifiée, utiliser --campaign=<campaign_id>');
    process.exit(1);
}

console.log(`📱 Démarrage du workflow avec le device: ${device}`);

// Lancer le workflow avec gestion d'erreurs
try {
  await sendWorkflow(campaign, device);
} catch (error) {
  console.error('❌ Erreur fatale:', error.message);
  process.exit(1);
}