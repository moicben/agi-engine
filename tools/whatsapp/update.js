// Workflow de mise à jour d'une session WhatsApp déjà existante

import { deviceService } from './device-service.js';
import { sessionService } from './session-service.js';

export async function updateWorkflow(device, session) {
    try {
        console.log(`🚀 Démarrage du workflow update pour device ${device}...`);

        // Étape 1 : Connexion adb au device
        console.log(`⚙️ Connexion adb au device...`);
        await deviceService.connectDevice(device);

        // Étape 2 : Extraire les données de la session du device
        console.log(`⚙️ Extraire les données de la session...`);
        const sessionPath = await sessionService.extractSession(device, session);
        console.log("Session extraite: " + sessionPath);

    }
    catch (error) {
        console.error(`❌ Device ${device}: Erreur dans le workflow update:`, error.message);
        return { device, success: false, error: error.message };
    }
}