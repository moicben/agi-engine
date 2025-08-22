/**
 * SMS Service minimaliste
 * Interface avec SMS-Activate API
 */

import axios from 'axios';
import 'dotenv/config';
import https from "https";
import { execSync } from "node:child_process";
import dns from "node:dns";
import { config } from '../../core/config.js';

const SMS_API_URL = 'https://api.sms-activate.org/stubs/handler_api.php';
const activations = new Map();
const countryMap = { FR: 78, UK: 16, US: 187, PH: 4, DE: 43, ES: 56, CA: 36 };

const apiCall = async (params) => {
  if (!process.env.SMS_ACTIVATE_API_KEY) throw new Error('SMS_ACTIVATE_API_KEY manquante');
  const { data } = await axios.get(SMS_API_URL, { params: { api_key: process.env.SMS_ACTIVATE_API_KEY, ...params } });
  return data;
};

const findActivation = (phoneNumber) => [...activations.values()].find(a => a.phone === phoneNumber.replace('+', ''));

export async function getPhoneNumber(countryCode, retries = 5, byPassVpn = true) {
  const useRemote = !!(config?.sms?.remote?.enabled && config?.sms?.remote?.baseURL);

  if (useRemote) {
    try {
      const baseURL = String(config.sms.remote.baseURL).replace(/\/$/, '');
      const { data } = await axios.get(`${baseURL}/api/sms/get-number`, { params: { country: countryCode, bypass: byPassVpn ? 'true' : 'false' }, timeout: 10000 });
      if (data && data.id && data.phone) {
        activations.set(data.id, { id: data.id, phone: data.phone.replace('+', ''), country: countryCode });
        console.log(`📱 ${data.phone} (${countryCode}) via remote`);
        return data.phone;
      }
      throw new Error(`Remote get-number: ${JSON.stringify(data)}`);
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

  if (byPassVpn) {
    const en0 = execSync("ipconfig getifaddr en0 || echo").toString().trim();
    if (!en0) throw new Error("Adresse IP en0 introuvable. Assurez-vous que l'interface est active.");

    const agent = new https.Agent({ localAddress: en0, keepAlive: true });
    const ipv4Lookup = (hostname, opts, cb) => dns.lookup(hostname, { family: 4, all: false }, cb);

    axios.defaults.httpsAgent = agent;
    axios.defaults.proxy = false;
    axios.defaults.lookup = ipv4Lookup;
    axios.defaults.timeout = 7000;
  }

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
      return getPhoneNumber(countryCode, retries - 1, byPassVpn);
    }
    throw error;
  }
}

export async function requestSMS(countryCode, phoneNumber) {
  const activation = findActivation(phoneNumber);
  if (!activation) throw new Error(`Activation non trouvée pour ${phoneNumber}`);

  const useRemote = !!(config?.sms?.remote?.enabled && config?.sms?.remote?.baseURL);
  if (useRemote) {
    const baseURL = String(config.sms.remote.baseURL).replace(/\/$/, '');
    await axios.post(`${baseURL}/api/sms/request`, { id: activation.id }, { timeout: 10000 });
    return;
  }

  await apiCall({ action: 'setStatus', id: activation.id, status: 1 });
}

export async function waitForSMS(phoneNumber, timeout = 45000) {
  const activation = findActivation(phoneNumber);
  if (!activation) throw new Error('Activation non trouvée');

  const useRemote = !!(config?.sms?.remote?.enabled && config?.sms?.remote?.baseURL);

  console.log(`⏳ Attente SMS ${phoneNumber}...`);
  const start = Date.now();

  if (useRemote) {
    const baseURL = String(config.sms.remote.baseURL).replace(/\/$/, '');
    const { data } = await axios.get(`${baseURL}/api/sms/wait`, { params: { id: activation.id, timeout }, timeout: Math.max(timeout + 2000, 10000) });
    if (data && data.code) {
      const code = String(data.code);
      activations.delete(activation.id);
      return code;
    }
    throw new Error(data?.error ? String(data.error) : 'SMS non reçu (remote)');
  }

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

export async function cancelAllActivations() {
  const useRemote = !!(config?.sms?.remote?.enabled && config?.sms?.remote?.baseURL);
  const ids = [...activations.keys()];
  if (useRemote && ids.length > 0) {
    const baseURL = String(config.sms.remote.baseURL).replace(/\/$/, '');
    await axios.post(`${baseURL}/api/sms/cancel-all`, { ids }, { timeout: 15000 });
  } else {
    for (const [id] of activations) await apiCall({ action: 'setStatus', id, status: 8 });
  }
  activations.clear();
  console.log('🧹 Activations annulées');
}

const smsService = { getPhoneNumber, requestSMS, waitForSMS, cancelAllActivations };

export default smsService;