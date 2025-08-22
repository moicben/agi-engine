// Script de test local pour by-passer mon VPN

import axios from "axios";
import 'dotenv/config';
import https from "https";
import { execSync } from "node:child_process";

import { getPhoneNumber } from "../tools/whatsapp/sms-service.js";



// IP locale de l'interface non-VPN (ex: en0)
const en0 = execSync("ipconfig getifaddr en0").toString().trim();

const agent = new https.Agent({ localAddress: en0 });

 const SMS_API_URL = 'https://api.sms-activate.org/stubs/handler_api.php';
const apiCall = async (params) => {
  if (!process.env.SMS_ACTIVATE_API_KEY) throw new Error('SMS_ACTIVATE_API_KEY manquante');
  const { data } = await axios.get(SMS_API_URL, { params: { api_key: process.env.SMS_ACTIVATE_API_KEY, ...params }, httpsAgent: agent });
  console.log(JSON.stringify(data, null, 2));
  return data;
};

const result = await apiCall({ action: 'getBalance', service: 'wa', country: 16 });
console.log(result);


// await getPhoneNumber('CA');