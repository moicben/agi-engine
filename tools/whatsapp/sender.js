// SENDER MICRO-ORCHESTRATOR (parallèle par device, répartition équitable)

import { deviceService } from './device-service.js';
import { senderService } from './sender-service.js';
import { getNewContacts, updateContactStatus } from '../supabase/contacts.js';
import { incrementCampaignCounters } from '../supabase/campaigns.js';
import { importWorkflow } from './import.js';
import { getCampaignById } from '../supabase/campaigns.js';
import { config } from './config.js';

/**
 * Orchestrateur d'envoi parallèle par device avec répartition des contacts.
 * - contactCount: nombre de contacts par device
 * - msgCount: non utilisé ici (conservé pour compat), le message vient de campaign
 */
export async function senderOrchestrator(campaignRef, devices, contactPerDevice = 1, session) {
    // Résoudre la campagne (id/nom -> objet)
    const campaign = (typeof campaignRef === 'object' && campaignRef)
        ? campaignRef
        : await getCampaignById(campaignRef);
    if (!campaign || !campaign.query) throw new Error('Campagne invalide (id/nom ou objet avec query requis)');

    // Normaliser devices
    const normDevices = (Array.isArray(devices) && devices.length > 0 ? devices : [])
        .map(d => String(d))
        .map(d => (/^\d+$/.test(d) ? `emulator-${d}` : d.replace(/^emulator(\d+)$/, 'emulator-$1')));
    if (normDevices.length === 0) throw new Error('devices array is required');

    // Session path (optionnel)
    const sessionPath = session ? new URL(`../../assets/wa-sessions/${session}`, import.meta.url).pathname : null;

    // 1) Récupérer au total (contacts/device) * nb devices
    const perCount = Math.max(0, Number(contactPerDevice) || 0);
    const totalNeeded = perCount * normDevices.length;
    if (totalNeeded === 0) return;
    const contacts = await getNewContacts(campaign.query, totalNeeded);
    console.log(`📞 ${contacts.length} nouveaux contacts récupérés (besoin ${totalNeeded})`);
    if (contacts.length === 0) return;

    // 2) Répartition équitable SANS doublon par device
    const perDevice = normDevices.map(() => []);
    let cursor = 0;
    for (let round = 0; round < perCount; round++) {
        for (let d = 0; d < normDevices.length; d++) {
            if (cursor < contacts.length) {
                perDevice[d].push(contacts[cursor]);
                cursor++;
            }
        }
    }

    // 3) Marquer en in_progress
    for (const bucket of perDevice) {
        for (const c of bucket) {
            try { await updateContactStatus(c.id, 'in_progress', campaign); } catch {}
        }
    }
    if (campaign?.id) {
        try { await incrementCampaignCounters(campaign.id, { total_count: contacts.length }); } catch {}
    }

    // 4) Parallèle par device
    const brandConfig = (config?.brand && config.brand.length > 0) ? config.brand[0] : { name: 'Account', description: '', image: '' };
    const masterDevice = 'emulator-5554';
    const results = await Promise.all(normDevices.map(async (device, index) => {
        const assigned = perDevice[index] || [];
        if (assigned.length === 0) return { device, queued: 0, sent: 0 };
        let sent = 0;
        try {
            if (sessionPath) await importWorkflow(device, sessionPath);
            await deviceService.connectDevice(device);
        } catch (_) {}

        for (const contact of assigned) {
            try {
                const state = await senderService.sendMessage(device, contact.phone, campaign.message, campaign.id);
                if (state === 'contacted') sent += 1;
                await updateContactStatus(contact.id, state, campaign);
                if (sessionPath) await importWorkflow(device, sessionPath);
                if (state === 'spam_blocked') break;
            } catch (e) {
                try { await updateContactStatus(contact.id, 'error', campaign); } catch {}
            }
        }
        return { device, queued: assigned.length, sent };
    }));

    // 5) Compteurs sent
    const totalSent = results.reduce((acc, r) => acc + (r.sent || 0), 0);
    if (campaign?.id && totalSent > 0) {
        try { await incrementCampaignCounters(campaign.id, { sent_count: totalSent }); } catch {}
    }

    // 6) Logs
    console.log('📊 Résumé envoi par device:');
    results.forEach(r => console.log(` - ${r.device}: ${r.sent}/${r.queued} envoyés`));
}


// Pas d'appel top-level ici; importer et appeler depuis runner/UI