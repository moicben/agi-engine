import puppeteer from 'puppeteer-core';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration BrowserBase
const BROWSERBASE_API_KEY = process.env.BROWSERBASE_API_KEY || '';
const BROWSERBASE_PROJECT_ID = process.env.BROWSERBASE_PROJECT_ID || '';
const BROWSERBASE_API_URL = 'https://api.browserbase.com/v1';

// Charger les sessions aléatoires
const sessionsPath = path.join(__dirname, '..', 'puppeteer', 'sessions.json');
const sessionsData = JSON.parse(fs.readFileSync(sessionsPath, 'utf8'));
const randomSession = sessionsData[Math.floor(Math.random() * sessionsData.length)].session;

/**
 * Crée une session BrowserBase via l'API REST
 * @param {Object} options - Options de création de session
 * @returns {Promise<Object>} - Session créée avec connectUrl et sessionId
 */
async function createBrowserBaseSession(options = {}) {
  const {
    projectId = BROWSERBASE_PROJECT_ID,
    proxies = false,
    region = 'eu-central-1', // Europe (Frankfurt) - plus proche de la France
    timeout = 3600, // 1 heure en secondes (21600 max)
    keepAlive = false
  } = options;

  const sessionConfig = {
    projectId,
    ...(proxies && { proxies: true }),
    ...(region && { region }),
    ...(timeout && { timeout }),
    ...(keepAlive && { keepAlive })
  };

  console.log('🚀 Création de session BrowserBase...');
  console.log('📋 Configuration:', JSON.stringify(sessionConfig, null, 2));

  try {
    const response = await fetch(`${BROWSERBASE_API_URL}/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-BB-API-Key': BROWSERBASE_API_KEY
      },
      body: JSON.stringify(sessionConfig)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erreur API BrowserBase: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const session = await response.json();
    console.log('✅ Session BrowserBase créée avec succès');
    console.log('🆔 Session ID:', session.id);
    console.log('🔗 Connect URL:', session.connectUrl);

    return {
      sessionId: session.id,
      connectUrl: session.connectUrl,
      status: session.status
    };

  } catch (error) {
    console.error('❌ Erreur lors de la création de session BrowserBase:', error.message);
    throw error;
  }
}

/**
 * Lance un navigateur BrowserBase (équivalent à launchBrowser)
 * @param {Object} options - Options de lancement
 * @returns {Promise<Object>} - Browser et page Puppeteer
 */
export async function launchBrowserBase(options = {}) {
  const {
    headless = false,
    useProxy = false,
    region = 'eu-central-1', // Europe (Frankfurt) - plus proche de la France
    userAgent = null,
    viewport = { width: 1920, height: 1080 },
    timeout = 3600, // Timeout de session en secondes (max 21600)
    puppeteerTimeout = 60000, // Timeout de connexion Puppeteer en millisecondes
    keepAlive = false
  } = options;

  console.log('🚀 Lancement du navigateur BrowserBase...');

  try {
    // Créer une session BrowserBase
    const session = await createBrowserBaseSession({
      proxies: useProxy,
      region,
      timeout, // Timeout de session en secondes
      keepAlive
    });

    // Se connecter au navigateur via l'URL WebSocket
    const browser = await puppeteer.connect({
      browserWSEndpoint: session.connectUrl,
      defaultViewport: viewport,
      timeout: puppeteerTimeout // Timeout de connexion en millisecondes
    });

    console.log('✅ Connexion au navigateur BrowserBase réussie');

    // Créer une nouvelle page
    const page = await browser.newPage();

    // Définir le user agent
    if (userAgent) {
      await page.setUserAgent(userAgent);
    } else {
      await page.setUserAgent(randomSession.userAgent || 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    }

    // Configurer les headers
    // await page.setExtraHTTPHeaders({
    //   'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
    //   'Accept-Encoding': 'gzip, deflate, br',
    //   'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    // });

    // Scripts anti-détection
    // await page.evaluateOnNewDocument(() => {
    //   Object.defineProperty(navigator, 'webdriver', { get: () => false });
    //   window.chrome = { runtime: {} };
    //   Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
    //   Object.defineProperty(navigator, 'languages', { get: () => ['fr-FR', 'fr', 'en'] });
      
    //   // Masquer les propriétés de détection d'automation
    //   const originalQuery = window.navigator.permissions.query;
    //   window.navigator.permissions.query = (parameters) =>
    //     parameters.name === 'notifications'
    //       ? Promise.resolve({ state: Notification.permission })
    //       : originalQuery(parameters);
    // });

    console.log('✅ Navigateur BrowserBase configuré et prêt');

    return { 
      browser, 
      page,
      sessionId: session.sessionId,
      connectUrl: session.connectUrl
    };

  } catch (error) {
    console.error('❌ Erreur lors de la connexion à BrowserBase:', error.message);
    throw error;
  }
}

/**
 * Fonction utilitaire pour attendre un délai
 * @param {number} ms - Délai en millisecondes
 * @returns {Promise<void>}
 */
export function waitForTimeout(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fermer proprement le navigateur BrowserBase
 * @param {Object} browser - Instance du navigateur
 * @param {string} sessionId - ID de la session (optionnel)
 * @returns {Promise<void>}
 */
export async function closeBrowserBase(browser, sessionId = null) {
  if (browser) {
    await browser.disconnect();
    console.log('🔌 Navigateur BrowserBase déconnecté');
  }

  // Optionnel: fermer la session via l'API si nécessaire
  if (sessionId && BROWSERBASE_API_KEY) {
    try {
      const response = await fetch(`${BROWSERBASE_API_URL}/sessions/${sessionId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-BB-API-Key': BROWSERBASE_API_KEY
        },
        body: JSON.stringify({ status: 'REQUEST_RELEASE' })
      });

      if (response.ok) {
        console.log('✅ Session BrowserBase fermée');
      }
    } catch (error) {
      console.log('⚠️ Erreur lors de la fermeture de session:', error.message);
    }
  }
}

/**
 * Obtenir les informations d'une session BrowserBase
 * @param {string} sessionId - ID de la session
 * @returns {Promise<Object>} - Informations de la session
 */
export async function getBrowserBaseSession(sessionId) {
  try {
    const response = await fetch(`${BROWSERBASE_API_URL}/sessions/${sessionId}`, {
      method: 'GET',
      headers: {
        'X-BB-API-Key': BROWSERBASE_API_KEY
      }
    });

    if (!response.ok) {
      throw new Error(`Erreur API: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('❌ Erreur lors de la récupération de session:', error.message);
    throw error;
  }
} 