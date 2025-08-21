// Workflow d'envoi de messages à de nouveaux contacts

import { getNewContacts, updateContactStatus } from '../supabase/contacts.js';
import { senderService } from './sender-service.js';
import { randomSleep, sleep } from './helpers.js';
import { deviceService } from './device-service.js';

// Fonction principale du workflow
async function sendWorkflow(campaign, device) {
    try {
        // Service d'envoi WhatsApp

        // Étape 0 : Initialiter les informations du workflow
        console.log(`⚙️  Initialisation du workflow...`);
        console.log(`⚙️ Campagne: ${campaign.name}`);
        console.log(`⚙️ Device: ${device}`);
        console.log(`⚙️ Message: ${campaign.message}`);
        console.log(`⚙️ Query: ${campaign.query}`);
        console.log(`⚙️ Count: ${campaign.count}`);
        console.log(`\n`);

        // Étape 1 : Connexion adb au device (préventive)
        console.log(`⚙️ Connexion adb au device...`);
        await deviceService.connectDevice(device);

        // Étape 2 : Récupérer les nouveaux contacts à traiter
        const contacts = await getNewContacts(campaign.query, campaign.count);
        console.log(`📞 ${contacts.length} nouveaux contacts récupérés`);

        // Étape 3 : Définir le status de tous ces contacts à "in_progress"
        for (const contact of contacts) {
            await updateContactStatus(contact.id, 'in_progress', campaign);
        }

        // Étape 4 : Envoyer les messages à chaque contact séquentiellement
        let count = 0;
        for (const contact of contacts) {   
            try {
                //console.log(`📞 Envoi de message à ${contact.phone}...`);
                const contactedState = await senderService.sendMessage(device, contact.phone, campaign.message, campaign.id);
                console.log(`📲 ${contact.phone} - ${contactedState}`);

                // Mettre à jour le statut du contact
                await updateContactStatus(contact.id, contactedState, campaign);
                //console.log(`✅ Statut mis à jour pour ${contact.phone}`);

                count++;
                console.log(`\n⌛️ ${count} / ${contacts.length}\n`);

                // Délai avant le prochain contact
                await randomSleep(10000, 20000);
                //console.log(`\n⌛️ Délai avant le prochain contact...`);

            } catch (contactError) {
                console.error(`❌ Erreur pour le contact ${contact.phone}:`, contactError.message);
                
                // Mettre à jour le statut du contact
                await updateContactStatus(contact.id, 'error', campaign);
            }

        }
        
        console.log(`\n✅ Workflow terminé\n`);
    } catch (error) {
        console.error('❌ Erreur dans le workflow:', error.message);
        process.exit(1);
    }
}

// Exporter la fonction principale
export { sendWorkflow };
