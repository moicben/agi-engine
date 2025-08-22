/**
 * SMS HTTP Client - Module réutilisable pour les appels SMS distants
 * Interface avec l'API SMS-Activate via HTTP/HTTPS
 */

import axios from 'axios';
import https from "https";
import dns from "node:dns";

/**
 * Fonction helper pour forcer IPv4
 */
export function buildIpv4Lookup() {
  return (hostname, opts, cb) => dns.lookup(hostname, { family: 4, all: false }, cb);
}

/**
 * Crée un client axios configuré pour les appels distants
 */
export function buildRemoteAxios(timeoutMs = 10000) {
  const insecure = process.env.SMS_REMOTE_INSECURE === 'true';
  const httpsAgent = new https.Agent({
    keepAlive: true,
    rejectUnauthorized: !insecure
  });
  return axios.create({
    httpsAgent,
    proxy: false,
    timeout: timeoutMs
  });
}

/**
 * Crée un client axios pour bypass VPN local
 */
export function buildLocalAxios(timeoutMs = 7000, localAddress = null) {
  const agent = new https.Agent({
    localAddress,
    keepAlive: true
  });
  return axios.create({
    httpsAgent: agent,
    proxy: false,
    timeout: timeoutMs
  });
}

/**
 * Interface pour les appels API SMS distants
 */
export class SmsHttpClient {
  constructor(baseURL = null, options = {}) {
    this.baseURL = baseURL || process.env.SMS_REMOTE_BASE_URL;
    this.timeout = options.timeout || 10000;
    this.insecure = options.insecure || (process.env.SMS_REMOTE_INSECURE === 'true');
  }

  /**
   * Obtenir un numéro de téléphone
   */
  async getPhoneNumber(countryCode, bypassVpn = false) {
    if (!this.baseURL) {
      throw new Error('SMS_REMOTE_BASE_URL non configuré');
    }

    try {
      const client = buildRemoteAxios(this.timeout);
      const lookup = buildIpv4Lookup();

      const { data } = await client.get(`${this.baseURL}/api/sms/get-number`, {
        params: { country: countryCode, bypass: bypassVpn ? 'true' : 'false' },
        lookup
      });

      if (data && data.id && data.phone) {
        return {
          success: true,
          id: data.id,
          phone: data.phone,
          country: data.country || countryCode
        };
      }

      return {
        success: false,
        error: data?.error || JSON.stringify(data)
      };

    } catch (error) {
      return {
        success: false,
        error: `${error?.response?.status || ''} ${error?.response?.statusText || ''} ${error?.code || ''} ${error.message || ''}`.trim()
      };
    }
  }

  /**
   * Demander l'envoi du SMS
   */
  async requestSms(activationId) {
    if (!this.baseURL) {
      throw new Error('SMS_REMOTE_BASE_URL non configuré');
    }

    try {
      const client = buildRemoteAxios(this.timeout);
      const lookup = buildIpv4Lookup();

      await client.post(`${this.baseURL}/api/sms/request`, { id: activationId }, { lookup });

      return { success: true };

    } catch (error) {
      return {
        success: false,
        error: `${error?.response?.status || ''} ${error?.response?.statusText || ''} ${error?.code || ''} ${error.message || ''}`.trim()
      };
    }
  }

  /**
   * Attendre la réception du SMS
   */
  async waitForSms(activationId, timeoutMs = 45000) {
    if (!this.baseURL) {
      throw new Error('SMS_REMOTE_BASE_URL non configuré');
    }

    try {
      const client = buildRemoteAxios(Math.max(timeoutMs + 2000, this.timeout));
      const lookup = buildIpv4Lookup();

      const { data } = await client.get(`${this.baseURL}/api/sms/wait`, {
        params: { id: activationId, timeout: timeoutMs },
        lookup
      });

      if (data && data.code) {
        return {
          success: true,
          code: data.code
        };
      }

      return {
        success: false,
        error: data?.error || 'SMS non reçu'
      };

    } catch (error) {
      return {
        success: false,
        error: `${error?.response?.status || ''} ${error?.response?.statusText || ''} ${error?.code || ''} ${error.message || ''}`.trim()
      };
    }
  }

  /**
   * Annuler toutes les activations
   */
  async cancelAllActivations(activationIds = []) {
    if (!this.baseURL) {
      throw new Error('SMS_REMOTE_BASE_URL non configuré');
    }

    if (activationIds.length === 0) {
      return { success: true, message: 'Aucune activation à annuler' };
    }

    try {
      const client = buildRemoteAxios(this.timeout);
      const lookup = buildIpv4Lookup();

      await client.post(`${this.baseURL}/api/sms/cancel-all`, { ids: activationIds }, { lookup });

      return { success: true };

    } catch (error) {
      return {
        success: false,
        error: `${error?.response?.status || ''} ${error?.response?.statusText || ''} ${error?.code || ''} ${error.message || ''}`.trim()
      };
    }
  }

  /**
   * Test de santé de l'API
   */
  async healthCheck() {
    if (!this.baseURL) {
      throw new Error('SMS_REMOTE_BASE_URL non configuré');
    }

    try {
      const client = buildRemoteAxios(5000);
      const lookup = buildIpv4Lookup();

      const { data } = await client.get(`${this.baseURL}/api/sms/health`, { lookup });

      return {
        success: true,
        data: data
      };

    } catch (error) {
      return {
        success: false,
        error: `${error?.response?.status || ''} ${error?.response?.statusText || ''} ${error?.code || ''} ${error.message || ''}`.trim()
      };
    }
  }
}

/**
 * Interface pour les appels SMS locaux avec bypass VPN
 */
export class SmsLocalClient {
  constructor(options = {}) {
    this.timeout = options.timeout || 7000;
    this.localAddress = options.localAddress || null;
  }

  /**
   * Obtenir un numéro via l'API SMS-Activate locale avec bypass VPN
   */
  async getPhoneNumber(countryCode) {
    try {
      // Détecter automatiquement l'adresse locale en0
      const { execSync } = await import("node:child_process");
      const en0 = execSync("ipconfig getifaddr en0 || echo").toString().trim();

      if (!en0) {
        throw new Error("Adresse IP en0 introuvable. Assurez-vous que l'interface est active.");
      }

      const client = buildLocalAxios(this.timeout, en0);
      const lookup = buildIpv4Lookup();

      // URL de l'API SMS-Activate
      const SMS_API_URL = 'https://api.sms-activate.org/stubs/handler_api.php';

      if (!process.env.SMS_ACTIVATE_API_KEY) {
        throw new Error('SMS_ACTIVATE_API_KEY manquante');
      }

      const { data } = await client.get(SMS_API_URL, {
        params: {
          api_key: process.env.SMS_ACTIVATE_API_KEY,
          action: 'getNumber',
          service: 'wa',
          country: this.getCountryCode(countryCode)
        },
        lookup
      });

      if (typeof data === 'string' && data.includes('ACCESS_NUMBER')) {
        const [, id, phone] = data.split(':');
        return {
          success: true,
          id: id,
          phone: `+${phone}`,
          country: countryCode
        };
      }

      return {
        success: false,
        error: data
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Convertir code pays en code numérique SMS-Activate
   */
  getCountryCode(country) {
    const countryMap = {
      FR: 78, UK: 16, US: 187, PH: 4, DE: 43,
      ES: 56, CA: 36, IT: 39, AU: 61, NL: 31
    };
    return countryMap[country] || 16; // UK par défaut
  }
}

// Export des utilitaires
export default {
  SmsHttpClient,
  SmsLocalClient,
  buildIpv4Lookup,
  buildRemoteAxios,
  buildLocalAxios
};
