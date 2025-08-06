/**
 * SMS Service minimaliste
 * Interface avec SMS-Activate API
 */

const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

// Configuration
const SMS_API_URL = 'https://api.sms-activate.org/stubs/handler_api.php';
const WHATSAPP_SERVICE_ID = 'wa';

// Cache des activations en cours
const activations = new Map();

/**
 * Obtenir un numéro de téléphone pour un pays
 */
async function getPhoneNumber(countryCode, retries = 5, initialRetries = retries) {
  const apiKey = process.env.SMS_ACTIVATE_API_KEY;
  if (!apiKey) {
    throw new Error('SMS_ACTIVATE_API_KEY non définie');
  }

  // Mapping des codes pays
  const countryMap = {
    'FR': 78,  // France (corrigé - 1 était pour Ukraine)
    'UK': 16,  // United Kingdom  
    'US': 187, // USA
    'PH': 4,   // Philippines
    'DE': 43,  // Germany
    'ES': 56,  // Spain
    'CA': 36,  // Canada
  };

  const country = countryMap[countryCode] || 16; // UK par défaut

  try {
    // Demander un numéro
    const response = await axios.get(SMS_API_URL, {
      params: {
        api_key: apiKey,
        action: 'getNumber',
        service: WHATSAPP_SERVICE_ID,
        country: country
      }
    });

    const data = response.data;
    
    if (data.includes('ACCESS_NUMBER')) {
      const [, activationId, phoneNumber] = data.split(':');
      
      // Sauvegarder l'activation
      activations.set(activationId, {
        id: activationId,
        phone: phoneNumber,
        country: countryCode,
        status: 'waiting'
      });

      console.log(`📱 Numéro obtenu: +${phoneNumber} (${countryCode})`);
      return `+${phoneNumber}`;
    } else {
      throw new Error(`Erreur SMS-Activate: ${data}`);
    }
  } catch (error) {
    console.error('❌ Erreur obtention numéro:', error.message);

    // Logique de retry if NO_NUMBERS
    if (error.message.includes('NO_NUMBERS')) {
      if (retries > 0) {
        const attemptNumber = (initialRetries - retries) + 1; // Calcul du numéro de tentative correct
        console.log(`🔄 Tentative ${attemptNumber} de récupération du numéro...`);
        return await getPhoneNumber(countryCode, retries - 1, initialRetries);
      } else {
        throw new Error('Nombre maximum de tentatives atteint');
      }
    }
    throw error;
  }
}

/**
 * Demander l'envoi d'un SMS
 */
async function requestSMS(countryCode, phoneNumber) {
  // Trouver l'activation correspondante
  let activation = null;
  for (const [id, act] of activations.entries()) {
    if (act.phone === phoneNumber.replace('+', '')) {
      activation = act;
      break;
    }
  }

  if (!activation) {
    // Si pas d'activation, en créer une nouvelle
    const newPhone = await getPhoneNumber(countryCode);
    return await waitForSMS(newPhone);
  }

  // Marquer comme prêt à recevoir
  await setStatus(activation.id, 1); // Status "ready"
  
  // Attendre le SMS
  return await waitForSMS(phoneNumber);
}

/**
 * Attendre la réception d'un SMS
 */
async function waitForSMS(phoneNumber, timeout = 120000) {
  const apiKey = process.env.SMS_ACTIVATE_API_KEY;
  if (!apiKey) {
    throw new Error('SMS_ACTIVATE_API_KEY non définie');
  }

  // Trouver l'activation
  let activation = null;
  for (const [id, act] of activations.entries()) {
    if (act.phone === phoneNumber.replace('+', '')) {
      activation = act;
      break;
    }
  }

  if (!activation) {
    throw new Error('Activation non trouvée pour ce numéro');
  }

  const startTime = Date.now();
  const checkInterval = 5000; // 5 secondes

  console.log(`⏳ Attente du SMS pour ${phoneNumber}...`);

  while (Date.now() - startTime < timeout) {
    try {
      const response = await axios.get(SMS_API_URL, {
        params: {
          api_key: apiKey,
          action: 'getStatus',
          id: activation.id
        }
      });

      const data = response.data;

      if (data.includes('STATUS_OK')) {
        const code = data.split(':')[1];
        console.log(`✅ Code SMS reçu: ${code}`);
        
        // Marquer comme terminé
        await setStatus(activation.id, 6); // Status "done"
        activations.delete(activation.id);
        
        return code;
      } else if (data === 'STATUS_WAIT_CODE') {
        // Continuer à attendre
        await new Promise(resolve => setTimeout(resolve, checkInterval));
      } else {
        throw new Error(`Status inattendu: ${data}`);
      }
    } catch (error) {
      console.error('❌ Erreur vérification SMS:', error.message);
      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }
  }

  throw new Error('Timeout: SMS non reçu');
}

/**
 * Changer le status d'une activation
 */
async function setStatus(activationId, status) {
  const apiKey = process.env.SMS_ACTIVATE_API_KEY;
  if (!apiKey) return;

  try {
    await axios.get(SMS_API_URL, {
      params: {
        api_key: apiKey,
        action: 'setStatus',
        id: activationId,
        status: status
      }
    });
  } catch (error) {
    console.warn('⚠️ Erreur changement status:', error.message);
  }
}

/**
 * Annuler toutes les activations en cours
 */
async function cancelAllActivations() {
  for (const [id, activation] of activations.entries()) {
    await setStatus(id, 8); // Status "cancel"
  }
  activations.clear();
  console.log('🧹 Toutes les activations annulées');
}

const smsService = {
  getPhoneNumber,
  requestSMS,
  waitForSMS,
  cancelAllActivations
};

// Export du service
module.exports = { smsService };