/**
 * SMS Curl Service - Service SMS utilisant des commandes curl
 * Alternative au service HTTP pour les environnements avec restrictions réseau
 */

import 'dotenv/config';
import { execSync } from 'node:child_process';

const activations = new Map();

// Configuration
const SMS_REMOTE_BASE_URL = process.env.SMS_REMOTE_BASE_URL;
const SMS_ACTIVATE_API_KEY = process.env.SMS_ACTIVATE_API_KEY;
const SMS_REMOTE_INSECURE = process.env.SMS_REMOTE_INSECURE === 'true';

/**
 * Exécuter une commande curl et parser la réponse JSON
 */
async function curlRequest(method, url, data = null) {
  try {
    let cmd = `curl -s -X ${method}`;

    // Options de sécurité
    if (SMS_REMOTE_INSECURE || url.includes('localhost') || url.includes('127.0.0.1')) {
      cmd += ' -k'; // --insecure
    }

    // Headers
    cmd += ' -H "Content-Type: application/json"';
    cmd += ' -H "Accept: application/json"';
    cmd += ' -H "User-Agent: sms-curl-service/1.0"';

    // Timeout
    cmd += ' --connect-timeout 10 --max-time 30';

    // Données pour POST
    if (method === 'POST' && data) {
      const jsonData = JSON.stringify(data).replace(/'/g, "'\\''");
      cmd += ` -d '${jsonData}'`;
    }

    // URL
    cmd += ` "${url}"`;

    // Exécution
    const output = execSync(cmd, { encoding: 'utf8' });

    if (!output.trim()) {
      return { success: false, error: 'Réponse vide' };
    }

    try {
      const parsed = JSON.parse(output);
      return { success: true, data: parsed };
    } catch (parseError) {
      return { success: false, error: `Erreur parsing JSON: ${output}` };
    }

  } catch (error) {
    return {
      success: false,
      error: `${error.status || ''} ${error.stderr || error.message || ''}`.trim()
    };
  }
}

/**
 * Obtenir un numéro de téléphone via curl
 */
export async function getPhoneNumber(countryCode, retries = 5, byPassVpn = true) {
  if (!SMS_REMOTE_BASE_URL) {
    throw new Error('SMS_REMOTE_BASE_URL non configuré pour le mode curl');
  }

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const url = `${SMS_REMOTE_BASE_URL.replace(/\/$/, '')}/api/sms/get-number?country=${countryCode}&bypass=${byPassVpn}`;
      console.log(`🔄 Tentative curl ${attempt + 1}/${retries + 1}: ${url}`);

      const result = await curlRequest('GET', url);

      if (result.success && result.data && result.data.id && result.data.phone) {
        activations.set(result.data.id, {
          id: result.data.id,
          phone: result.data.phone.replace('+', ''),
          country: result.data.country || countryCode
        });

        console.log(`📱 ${result.data.phone} (${result.data.country}) via curl`);
        return result.data.phone;
      }

      const errorMsg = result.data?.error || result.error || 'Erreur inconnue';
      console.log(`❌ Curl error: ${errorMsg}`);

      if (attempt < retries) {
        const delay = 5;
        console.log(`🔄 Retry ${delay}s...`);
        await new Promise(r => setTimeout(r, delay * 1000));
      } else {
        throw new Error(errorMsg);
      }

    } catch (error) {
      if (attempt < retries) {
        const delay = 5;
        console.log(`🔄 Curl error ${error.message} - Retry ${delay}s...`);
        await new Promise(r => setTimeout(r, delay * 1000));
      } else {
        throw error;
      }
    }
  }
}

/**
 * Demander l'envoi du SMS via curl
 */
export async function requestSMS(countryCode, phoneNumber) {
  const activation = findActivation(phoneNumber);
  if (!activation) throw new Error(`Activation non trouvée pour ${phoneNumber}`);

  if (!SMS_REMOTE_BASE_URL) {
    throw new Error('SMS_REMOTE_BASE_URL non configuré');
  }

  const url = `${SMS_REMOTE_BASE_URL.replace(/\/$/, '')}/api/sms/request`;
  const result = await curlRequest('POST', url, { id: activation.id });

  if (!result.success) {
    throw new Error(result.data?.error || result.error || 'Erreur lors de la demande SMS');
  }

  console.log(`📤 SMS demandé pour ${phoneNumber} via curl`);
}

/**
 * Attendre la réception du SMS via curl
 */
export async function waitForSMS(phoneNumber, timeout = 45000) {
  const activation = findActivation(phoneNumber);
  if (!activation) throw new Error('Activation non trouvée');

  if (!SMS_REMOTE_BASE_URL) {
    throw new Error('SMS_REMOTE_BASE_URL non configuré');
  }

  console.log(`⏳ Attente SMS ${phoneNumber} via curl...`);
  const start = Date.now();

  while (Date.now() - start < timeout) {
    try {
      const url = `${SMS_REMOTE_BASE_URL.replace(/\/$/, '')}/api/sms/wait?id=${activation.id}&timeout=${timeout}`;
      const result = await curlRequest('GET', url);

      if (result.success && result.data && result.data.code) {
        const code = result.data.code;
        console.log(`✅ Code reçu via curl: ${code}`);
        activations.delete(activation.id);
        return code;
      }

      if (result.data?.error) {
        throw new Error(result.data.error);
      }

    } catch (error) {
      console.error('❌ Curl error:', error.message);
    }

    await new Promise(r => setTimeout(r, 5000));
  }

  throw new Error('Timeout: SMS non reçu via curl');
}

/**
 * Annuler toutes les activations via curl
 */
export async function cancelAllActivations() {
  const ids = [...activations.keys()];

  if (!SMS_REMOTE_BASE_URL || ids.length === 0) {
    activations.clear();
    console.log('🧹 Activations nettoyées (curl mode)');
    return;
  }

  const url = `${SMS_REMOTE_BASE_URL.replace(/\/$/, '')}/api/sms/cancel-all`;
  const result = await curlRequest('POST', url, { ids });

  if (!result.success) {
    console.error('Erreur annulation curl:', result.data?.error || result.error);
  }

  activations.clear();
  console.log('🧹 Activations annulées via curl');
}

/**
 * Test de santé de l'API via curl
 */
export async function healthCheck() {
  if (!SMS_REMOTE_BASE_URL) {
    throw new Error('SMS_REMOTE_BASE_URL non configuré');
  }

  const url = `${SMS_REMOTE_BASE_URL.replace(/\/$/, '')}/api/sms/health`;
  const result = await curlRequest('GET', url);

  if (result.success) {
    console.log('✅ API accessible via curl:', result.data);
    return result.data;
  } else {
    console.error('❌ API non accessible via curl:', result.error);
    throw new Error(result.error);
  }
}

/**
 * Trouver une activation par numéro de téléphone
 */
function findActivation(phoneNumber) {
  return [...activations.values()].find(a => a.phone === phoneNumber.replace('+', ''));
}

/**
 * Obtenir les statistiques des activations
 */
export function getActivationsStats() {
  return {
    total: activations.size,
    ids: [...activations.keys()],
    details: [...activations.values()]
  };
}

const smsCurlService = {
  getPhoneNumber,
  requestSMS,
  waitForSMS,
  cancelAllActivations,
  healthCheck,
  getActivationsStats
};

export default smsCurlService;
