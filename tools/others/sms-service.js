/**
 * SMS Service minimaliste
 * Interface avec SMS-Activate API
 */

const axios = require('axios');
require('dotenv').config();

const SMS_API_URL = 'https://api.sms-activate.org/stubs/handler_api.php';
const activations = new Map();
const countryMap = { FR: 78, UK: 16, US: 187, PH: 4, DE: 43, ES: 56, CA: 36 };

const apiCall = async (params) => {
  if (!process.env.SMS_ACTIVATE_API_KEY) throw new Error('SMS_ACTIVATE_API_KEY manquante');
  const { data } = await axios.get(SMS_API_URL, { params: { api_key: process.env.SMS_ACTIVATE_API_KEY, ...params } });
  return data;
};

const findActivation = (phoneNumber) => [...activations.values()].find(a => a.phone === phoneNumber.replace('+', ''));

async function getPhoneNumber(countryCode, retries = 5) {
  try {
    const data = await apiCall({ action: 'getNumber', service: 'wa', country: countryMap[countryCode] || 16 });
    
    if (data.includes('ACCESS_NUMBER')) {
      const [, id, phone] = data.split(':');
      activations.set(id, { id, phone, country: countryCode });
      console.log(`📱 +${phone} (${countryCode})`);
      return `+${phone}`;
    }
    throw new Error(`SMS-Activate: ${data}`);
  } catch (error) {
    if (retries > 0) {
      const delay = error.message.includes('NO_NUMBERS') ? 5 : 5;
      console.log(`🔄 ${error.message} - Retry ${delay}s...`);
      await new Promise(r => setTimeout(r, delay * 1000));
      return getPhoneNumber(countryCode, retries - 1);
    }
    throw error;
  }
}

async function requestSMS(countryCode, phoneNumber) {
  const activation = findActivation(phoneNumber);
  if (!activation) throw new Error(`Activation non trouvée pour ${phoneNumber}`);
  
  await apiCall({ action: 'setStatus', id: activation.id, status: 1 });
}

async function waitForSMS(phoneNumber, timeout = 45000) {
  const activation = findActivation(phoneNumber);
  if (!activation) throw new Error('Activation non trouvée');

  console.log(`⏳ Attente SMS ${phoneNumber}...`);
  const start = Date.now();

  while (Date.now() - start < timeout) {
    try {
      const data = await apiCall({ action: 'getStatus', id: activation.id });
      
      if (data.includes('STATUS_OK')) {
        const code = data.split(':')[1];
        console.log(`✅ Code: ${code}`);
        await apiCall({ action: 'setStatus', id: activation.id, status: 6 });
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

async function cancelAllActivations() {
  for (const [id] of activations) await apiCall({ action: 'setStatus', id, status: 8 });
  activations.clear();
  console.log('🧹 Activations annulées');
}

const smsService = { getPhoneNumber, requestSMS, waitForSMS, cancelAllActivations };

// Export du service
module.exports = { smsService };