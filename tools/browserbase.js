import puppeteer from 'puppeteer';
import dotenv from 'dotenv';

dotenv.config();

const BROWSERBASE_API_URL = 'https://api.browserbase.com/v1';
const { BROWSERBASE_API_KEY, BROWSERBASE_PROJECT_ID } = process.env;

if (!BROWSERBASE_API_KEY) throw new Error('Missing BROWSERBASE_API_KEY');
if (!BROWSERBASE_PROJECT_ID) throw new Error('Missing BROWSERBASE_PROJECT_ID');

async function createBrowserBaseSession(options = {}) {
  const {
    projectId = BROWSERBASE_PROJECT_ID,
    proxies = false,
    region = 'eu-central-1',
    timeout = 3600,
    keepAlive = false
  } = options;

  const sessionConfig = {
    projectId,
    ...(Array.isArray(proxies) ? { proxies } : (proxies ? { proxies: true } : {})),
    ...(region && { region }),
    ...(timeout && { timeout }),
    ...(keepAlive && { keepAlive })
  };

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
  return {
    sessionId: session.id,
    connectUrl: session.connectUrl,
    status: session.status
  };
}

export async function launchBrowserBase(options = {}) {
  const {
    headless = false,
    useProxy = false,
    region = 'eu-central-1',
    userAgent = null,
    viewport = { width: 1920, height: 1080 },
    timeout = 3600,
    puppeteerTimeout = 60000,
    keepAlive = false
  } = options;

  const session = await createBrowserBaseSession({
    proxies: useProxy,
    region,
    timeout,
    keepAlive
  });

  const browser = await puppeteer.connect({
    browserWSEndpoint: session.connectUrl,
    defaultViewport: viewport,
    protocolTimeout: puppeteerTimeout
  });

  const page = await browser.newPage();
  const defaultUA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  await page.setUserAgent(userAgent || defaultUA);

  return {
    browser,
    page,
    sessionId: session.sessionId,
    connectUrl: session.connectUrl
  };
}

export function waitForTimeout(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function closeBrowserBase(browser, sessionId = null) {
  if (browser) {
    await browser.disconnect();
  }
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
      if (!response.ok) {
        // Swallow non-OK without throwing
      }
    } catch {
      // ignore
    }
  }
}

// --- Geolocation helpers ---
export async function createSessionWithGeoLocation({ city, state, country, projectId = BROWSERBASE_PROJECT_ID, timeout = 3600, keepAlive = false } = {}) {
  const proxies = [
    {
      type: 'external',
      server: 'https://fr806.nordvpn.com:89',
      username: 'J9V53mafzdpm9JqsWndPD6Tf',
      password: '8Ck3oGLmhZGfLFA4JzKAiEWQ'
    }
  ];
  return await createBrowserBaseSession({ projectId, proxies, timeout, keepAlive });
}

export async function launchBrowserBaseWithGeoLocation({ city, state, country, viewport = { width: 1920, height: 1080 }, userAgent = null, puppeteerTimeout = 60000, timeout = 3600, keepAlive = false } = {}) {
  const session = await createSessionWithGeoLocation({ city, state, country, timeout, keepAlive });

  const browser = await puppeteer.connect({
    browserWSEndpoint: session.connectUrl,
    defaultViewport: viewport,
    protocolTimeout: puppeteerTimeout
  });

  const page = await browser.newPage();
  const defaultUA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  await page.setUserAgent(userAgent || defaultUA);

  return {
    browser,
    page,
    sessionId: session.sessionId,
    connectUrl: session.connectUrl
  };
}