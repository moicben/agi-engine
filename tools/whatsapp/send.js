// Workflow d'envoi de messages à de nouveaux contacts

import { getNewContacts, updateContactStatus } from '../supabase/contacts.js';
import { senderService } from './sender-service.js';
import { randomSleep, sleep } from './helpers.js';
import { deviceService } from './device-service.js';
import { incrementCampaignCounters } from '../supabase/campaigns.js';

// Fonction principale du workflow
async function sendWorkflow(campaign, device, count, options = {contactsOverride: null}) {
    try {
        // Service d'envoi WhatsApp

        // Récupérer le nombre de messages à envoyer
        const countMsg = count ? count : campaign.count;

        // Étape 0 : Initialiter les informations du workflow
        console.log(`⚙️  Initialisation du workflow...`);
        console.log(`⚙️ Campagne: ${campaign.name}`);
        console.log(`⚙️ Device: ${device}`);    
        const msgPreview = typeof campaign.message === 'string' ? campaign.message.slice(0, 30) : '[message objet]';
        console.log(`⚙️ Message: ${msgPreview}...`);
        console.log(`⚙️ Query: ${campaign.query}`);
        console.log(`⚙️ Count: ${countMsg}`);
        console.log(`\n`);

        // Étape 1 : Connexion adb au device (préventive)
        console.log(`⚙️ Connexion adb au device...`);
        await deviceService.connectDevice(device);

        // Étape 2 : Récupérer les nouveaux contacts à traiter (ou simuler)
        let contacts = [];
        const contactsOverride = options?.contactsOverride;
        if (contactsOverride) {
            contacts = contactsOverride;
            console.log(`📞 ${contacts.length} contacts récupérés`);
        } else {
            contacts = await getNewContacts(campaign.query, countMsg);
            console.log(`📞 ${contacts.length} nouveaux contacts récupérés`);
        }

        // Étape 3 : Définir le status de tous ces contacts à "in_progress"
        const BATCH = 10;
        if (!simulate) {
            for (let i = 0; i < contacts.length; i += BATCH) {
                const slice = contacts.slice(i, i + BATCH);
                await Promise.allSettled(slice.map(c => updateContactStatus(c.id, 'in_progress', campaign)));
            }
        } else {
            console.log('⚙️ [SIM] Contacts marqués in_progress (virtuel)');
        }

        // Incrémenter le compteur total_count de la campagne (nombre de contacts mis en in_progress)
        if (campaign?.id && contacts.length > 0) {
            await incrementCampaignCounters(campaign.id, { total_count: contacts.length });
        }

        // Étape 4 : Envoyer les messages à chaque contact séquentiellement
        let processed = 0;
        let sentCount = 0;
        for (let idx = 0; idx < contacts.length; idx++) {   
            const contact = contacts[idx];
            try {
                //console.log(`📞 Envoi de message à ${contact.phone}...`);
                const contactedState = simulate
                    ? (options?.forceSpamAtIndex === idx ? 'spam_blocked' : ((options?.sentDecider ? options.sentDecider(contact) : (Math.random() < 0.7)) ? 'contacted' : 'not_registered'))
                    : await senderService.sendMessage(device, contact.phone, campaign.message, campaign.id);
                console.log(`📲 ${contact.phone} - ${contactedState}`);

                // Mettre à jour le statut du contact
                if (!simulate) {
                    await updateContactStatus(contact.id, contactedState, campaign);
                }
                //console.log(`✅ Statut mis à jour pour ${contact.phone}`);

                processed++;
                console.log(`⌛️ ${processed} / ${contacts.length}`);

                if (contactedState === 'contacted') {
                    sentCount++;
                }

                // Si détecté spam -> arrêter et remettre le contact courant et les restants à 'new'
                if (contactedState === 'spam_blocked') {
                    console.warn('🛑 Envoi interrompu: indication SPAM détectée par OCR. Requeue des contacts restants.');
                    // Remettre le contact en cours
                    if (!simulate) {
                        await updateContactStatus(contact.id, 'new', campaign);
                    }
                    // Remettre les restants
                    const remaining = contacts.slice(idx + 1);
                    if (!simulate && remaining.length) {
                        const B = 10;
                        for (let j = 0; j < remaining.length; j += B) {
                            const slice = remaining.slice(j, j + B);
                            await Promise.allSettled(slice.map(c => updateContactStatus(c.id, 'new', campaign)));
                        }
                    }
                    break;
                }

            } catch (contactError) {
                console.error(`❌ Erreur pour le contact ${contact.phone}:`, contactError.message);
                
                // Mettre à jour le statut du contact
                await updateContactStatus(contact.id, 'error', campaign);
            }

        }

        // Incrémenter le compteur sent_count de la campagne (contacts effectivement contactés)
        if (campaign?.id && sentCount > 0) {
            await incrementCampaignCounters(campaign.id, { sent_count: sentCount });
        }
        
        console.log(`\n✅ Workflow terminé\n`);
    } catch (error) {
        console.error('❌ Erreur dans le workflow:', error.message);
        process.exit(1);
    }
}

// Exporter la fonction principale
export { sendWorkflow };
