import puppeteer from 'puppeteer-core';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration Browserless
const BROWSERLESS_ENDPOINT = process.env.BROWSERLESS_ENDPOINT || 'wss://production-sfo.browserless.io';
const BROWSERLESS_TOKEN = process.env.BROWSERLESS_API_KEY;

// Charger les sessions aléatoires
const sessionsPath = path.join(__dirname, '..', 'puppeteer', 'sessions.json');
const sessionsData = JSON.parse(fs.readFileSync(sessionsPath, 'utf8'));
const randomSession = sessionsData[Math.floor(Math.random() * sessionsData.length)].session;

/**
 * Lance un navigateur Browserless (équivalent à launchBrowser)
 */
export async function launchBrowserless(options = {}) {
  const {
    headless = false,
    useProxy = false,
    proxyCountry = 'fr',
    proxySticky = true,
    userAgent = null,
    viewport = null,
    timeout = 120000
  } = options;

  // console.log('🚀 Lancement du navigateur Browserless...');
  // console.log('📡 Endpoint:', BROWSERLESS_ENDPOINT);

  // Construire l'URL WebSocket avec les paramètres
  const urlParams = new URLSearchParams({
    token: BROWSERLESS_TOKEN,
    headless: headless.toString()
  });

  // Ajouter le proxy résidentiel si demandé
  if (useProxy) {
    urlParams.append('proxy', 'residential');
    urlParams.append('proxyCountry', proxyCountry);
    if (proxySticky) {
      urlParams.append('proxySticky', 'true');
    }
    // console.log(`🌐 Proxy résidentiel activé : ${proxyCountry.toUpperCase()}`);
  }

  const wsEndpoint = `${BROWSERLESS_ENDPOINT}/?${urlParams.toString()}`;
  // console.log('🔗 Connexion à:', wsEndpoint.replace(BROWSERLESS_TOKEN, '***'));

  try {
    // Se connecter au navigateur Browserless
    const browser = await puppeteer.connect({
      browserWSEndpoint: wsEndpoint,
      defaultViewport: viewport || { width: 1920, height: 1080 },
      timeout: timeout
    });

    // console.log('✅ Connexion au navigateur Browserless réussie');

    // Créer une nouvelle page
    const page = await browser.newPage();

    // Définir le user agent
    if (userAgent) {
      await page.setUserAgent(userAgent);
    } else {
      await page.setUserAgent(randomSession.userAgent || 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    }

    // Configurer les headers
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    });

    // Scripts anti-détection
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
      window.chrome = { runtime: {} };
      Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
      Object.defineProperty(navigator, 'languages', { get: () => ['fr-FR', 'fr', 'en'] });
    });

    console.log('✅ Navigateur Browserless configuré et prêt');

    return { browser, page };

  } catch (error) {
    console.error('❌ Erreur lors de la connexion à Browserless:', error.message);
    throw error;
  }
}

/**
 * Fonction utilitaire pour attendre un délai
 */
export function waitForTimeout(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fermer proprement le navigateur
 */
export async function closeBrowserless(browser) {
  if (browser) {
    await browser.disconnect();
    console.log('🔌 Navigateur Browserless déconnecté');
  }
}

