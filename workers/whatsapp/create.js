// Version simplifiée: création de compte WhatsApp (mono-device, sans VPN)
import { clearWorkflow } from './clear.js';
import { inputWorkflow } from './input.js';
import { extractWorkflow } from './extract.js';

// Orchestrateur mono-device sans VPN
export async function createOrchestrator(device, country = 'ca') {
  console.log(`🚦 Création WhatsApp (mono-device) pour ${device} (${country})`);

  try {
    // 1) Nettoyage/Reset de l'app
    await clearWorkflow(device);

    // 2) Entrée du numéro + validation SMS (sans VPN) et récupérer le numéro accepté
    const phoneNumber = await inputWorkflow(device, country, false);

    // 3) Extraire la session (utilise le numéro si fourni)
    const sessionPath = await extractWorkflow(device, phoneNumber); 


    console.log(`✅ Création terminée pour ${device}`);
    return { sessionPath, phoneNumber };

  } catch (e) {
    console.error(`❌ Erreur création WhatsApp: ${e.message}`);
    throw e;
  }
}








