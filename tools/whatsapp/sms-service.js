/**
 * SMS Service - Service SMS principal minimaliste
 * Utilise soit les appels HTTP directs, soit les commandes curl selon la configuration
 */

import 'dotenv/config';
import { SmsHttpClient, SmsLocalClient } from './sms-http-client.js';
import { execSync } from 'node:child_process';

const activations = new Map();

// Configuration
const SMS_REMOTE_ENABLED = process.env.SMS_REMOTE_ENABLED === 'true';
const SMS_REMOTE_BASE_URL = process.env.SMS_REMOTE_BASE_URL;
const SMS_ACTIVATE_API_KEY = process.env.SMS_ACTIVATE_API_KEY;

/**
 * Obtenir un numéro de téléphone
 */
export async function getPhoneNumber(countryCode, retries = 5, byPassVpn = true) {
  // Si routing distant activé, utiliser le client HTTP
  if (SMS_REMOTE_ENABLED && SMS_REMOTE_BASE_URL) {
    try {
      const client = new SmsHttpClient(SMS_REMOTE_BASE_URL, { timeout: 15000 });
      const result = await client.getPhoneNumber(countryCode, byPassVpn);

      if (result.success) {
        activations.set(result.id, {
          id: result.id,
          phone: result.phone.replace('+', ''),
          country: result.country
        });
        console.log(`📱 ${result.phone} (${result.country}) via remote`);
        return result.phone;
      }

      throw new Error(result.error);
    } catch (error) {
      if (retries > 0) {
        const delay = 5;
        console.log(`🔄 Remote error ${error.message} - Retry ${delay}s...`);
        await new Promise(r => setTimeout(r, delay * 1000));
        return getPhoneNumber(countryCode, retries - 1, byPassVpn);
      }
      throw error;
    }
  }

  // Mode local avec bypass VPN
  if (byPassVpn) {
    try {
      const client = new SmsLocalClient({ timeout: 7000 });
      const result = await client.getPhoneNumber(countryCode);

      if (result.success) {
        activations.set(result.id, {
          id: result.id,
          phone: result.phone.replace('+', ''),
          country: result.country
        });
        console.log(`📱 ${result.phone} (${result.country})`);
        return result.phone;
      }

      throw new Error(result.error);
    } catch (error) {
      if (retries > 0) {
        const delay = error.message.includes('NO_NUMBERS') ? 5 : 5;
        console.log(`🔄 ${error.message} - Retry ${delay}s...`);
        await new Promise(r => setTimeout(r, delay * 1000));
        return getPhoneNumber(countryCode, retries - 1, byPassVpn);
      }
      throw error;
    }
  }

  throw new Error('Configuration SMS invalide');
}

/**
 * Demander l'envoi du SMS
 */
export async function requestSMS(countryCode, phoneNumber) {
  const activation = findActivation(phoneNumber);
  if (!activation) throw new Error(`Activation non trouvée pour ${phoneNumber}`);

  if (SMS_REMOTE_ENABLED && SMS_REMOTE_BASE_URL) {
    const client = new SmsHttpClient(SMS_REMOTE_BASE_URL);
    const result = await client.requestSms(activation.id);
    if (!result.success) throw new Error(result.error);
    return;
  }

  // Mode local
  if (!SMS_ACTIVATE_API_KEY) throw new Error('SMS_ACTIVATE_API_KEY manquante');
  const { data } = await import('axios').then(axios =>
    axios.get('https://api.sms-activate.org/stubs/handler_api.php', {
      params: { api_key: SMS_ACTIVATE_API_KEY, action: 'setStatus', id: activation.id, status: 1 }
    })
  );
  console.log(`SMS demandé pour ${phoneNumber}`);
}

/**
 * Attendre la réception du SMS
 */
export async function waitForSMS(phoneNumber, timeout = 45000) {
  const activation = findActivation(phoneNumber);
  if (!activation) throw new Error('Activation non trouvée');

  console.log(`⏳ Attente SMS ${phoneNumber}...`);
  const start = Date.now();

  if (SMS_REMOTE_ENABLED && SMS_REMOTE_BASE_URL) {
    const client = new SmsHttpClient(SMS_REMOTE_BASE_URL, { timeout: Math.max(timeout + 2000, 15000) });
    const result = await client.waitForSms(activation.id, timeout);

    if (result.success) {
      activations.delete(activation.id);
      return result.code;
    }
    throw new Error(result.error);
  }

  // Mode local
  while (Date.now() - start < timeout) {
    try {
      if (!SMS_ACTIVATE_API_KEY) throw new Error('SMS_ACTIVATE_API_KEY manquante');
      const { data } = await import('axios').then(axios =>
        axios.get('https://api.sms-activate.org/stubs/handler_api.php', {
          params: { api_key: SMS_ACTIVATE_API_KEY, action: 'getStatus', id: activation.id }
        })
      );

      if (data.includes('STATUS_OK')) {
        const code = data.split(':')[1];
        console.log(`✅ Code: ${code}`);
        activations.delete(activation.id);
        return code;
      }

      if (data !== 'STATUS_WAIT_CODE') throw new Error(`Status: ${data}`);
    } catch (error) {
      console.error('❌', error.message);
    }

    await new Promise(r => setTimeout(r, 5000));
  }

  throw new Error('Timeout: SMS non reçu');
}

/**
 * Annuler toutes les activations
 */
export async function cancelAllActivations() {
  const ids = [...activations.keys()];

  if (SMS_REMOTE_ENABLED && SMS_REMOTE_BASE_URL && ids.length > 0) {
    const client = new SmsHttpClient(SMS_REMOTE_BASE_URL);
    const result = await client.cancelAllActivations(ids);
    if (!result.success) console.error('Erreur annulation remote:', result.error);
  } else if (SMS_ACTIVATE_API_KEY) {
    for (const id of ids) {
      try {
        await import('axios').then(axios =>
          axios.get('https://api.sms-activate.org/stubs/handler_api.php', {
            params: { api_key: SMS_ACTIVATE_API_KEY, action: 'setStatus', id, status: 8 }
          })
        );
      } catch (error) {
        console.error(`Erreur annulation ${id}:`, error.message);
      }
    }
  }

  activations.clear();
  console.log('🧹 Activations annulées');
}

/**
 * Trouver une activation par numéro de téléphone
 */
function findActivation(phoneNumber) {
  return [...activations.values()].find(a => a.phone === phoneNumber.replace('+', ''));
}

const smsService = { getPhoneNumber, requestSMS, waitForSMS, cancelAllActivations };
export default smsService;