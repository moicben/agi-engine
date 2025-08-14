import puppeteer from 'puppeteer';
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// const sessionsData = JSON.parse(fs.readFileSync(path.join(__dirname, 'sessions.json'), 'utf8'));
// const randomSession = sessionsData[Math.floor(Math.random() * sessionsData.length)].session;

// Proxy Configuration 
// const proxyAddress = 'proxy.oculus-proxy.com';
// const proxyPort = '31112';
// const proxyPassword = 'sxjozu794g50';
// const proxyUsername = 'oc-0b3b58f5de2c1506ce227d596c3517f6586af56e3fc513b2c187e07ba94b765e-country-FR-session-8e1a1'


export async function launchBrowser(proxy = false) {
  const wantHeadless = (process.env.HEADLESS ?? 'true').toLowerCase() !== 'false';

  // If running in a headless server with no DISPLAY and we want headful,
  // boot a virtual X server (Xvfb) automatically.
  let xvfbProcess = null;
  const needDisplay = !wantHeadless && !process.env.DISPLAY && process.platform !== 'darwin';
  if (needDisplay) {
    try {
      const displayNumber = process.env.XVFB_DISPLAY || ':99';
      const screen = process.env.XVFB_SCREEN || '0';
      const resolution = process.env.XVFB_RESOLUTION || '1920x1080x24';

      xvfbProcess = spawn('Xvfb', [displayNumber, '-screen', screen, resolution, '-ac', '+extension', 'RANDR'], {
        stdio: ['ignore', 'inherit', 'inherit']
      });

      // Give Xvfb a moment to start
      await new Promise((resolve) => setTimeout(resolve, 500));
      process.env.DISPLAY = displayNumber;

      // Ensure clean shutdown
      const cleanup = () => {
        if (xvfbProcess && !xvfbProcess.killed) {
          xvfbProcess.kill('SIGTERM');
          xvfbProcess = null;
        }
      };
      process.on('exit', cleanup);
      process.on('SIGINT', () => { cleanup(); process.exit(130); });
      process.on('SIGTERM', () => { cleanup(); process.exit(143); });
      process.on('uncaughtException', () => cleanup());
      console.log(`✅ Xvfb started on DISPLAY=${displayNumber}`);
    } catch (error) {
      console.warn('⚠️ Unable to start Xvfb. Falling back to headless mode. Error:', error.message);
    }
  }

  const chromeArgs = [
    '--start-maximized',
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-blink-features=AutomationControlled',
    '--disable-infobars',
    '--disable-web-security',
    '--disable-features=IsolateOrigins,site-per-process',
    '--ignore-certificate-errors',
    '--disable-software-rasterizer',
    '--disable-dev-shm-usage',
    '--disable-breakpad',
    '--disable-extensions',
    '--disable-gpu',
    '--remote-debugging-port=9222',
  ];

  // Optional proxy wiring kept for future use
  // if (proxy) chromeArgs.push(`--proxy-server=${proxyAddress}:${proxyPort}`);
  // if (process.env.PUPPETEER_PROFIL_PATH) chromeArgs.push(`--user-data-dir=${process.env.PUPPETEER_PROFIL_PATH}`);

  const launchOptions = {
    headless: wantHeadless,
    ignoreHTTPSErrors: true,
    defaultViewport: null,
    args: chromeArgs,
  };

  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
  }

  const browser = await puppeteer.launch(launchOptions);

  // Utiliser l'onglet par défaut créé lors du launch
  const pages = await browser.pages();
  const page = pages.length ? pages[0] : await browser.newPage();

  // Authentification par proxy (si besoin)
  // await page.authenticate({
  //   username: proxyUsername,
  //   password: proxyPassword,
  // });

  // Injecter des scripts pour tromper certaines détections
  // await page.evaluateOnNewDocument(() => {
  //   Object.defineProperty(navigator, 'webdriver', { get: () => false });
  //   window.chrome = { runtime: {} };
  //   const originalQuery = window.navigator.permissions.query;
  //   window.navigator.permissions.query = (parameters) =>
  //     parameters.name === 'notifications'
  //       ? Promise.resolve({ state: Notification.permission })
  //       : originalQuery(parameters);
  //   Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
  //   Object.defineProperty(navigator, 'languages', { get: () => ['fr-FR', 'fr'] });
  //   const getParameter = WebGLRenderingContext.prototype.getParameter;
  //   WebGLRenderingContext.prototype.getParameter = function(parameter) {
  //     if (parameter === 37445) return 'Intel Inc.';
  //     if (parameter === 37446) return 'Intel Iris OpenGL Engine';
  //     return getParameter(parameter);
  //   };
  //   Object.defineProperty(navigator, 'mediaDevices', {
  //     get: () => ({
  //       enumerateDevices: () =>
  //         Promise.resolve([
  //           { kind: 'videoinput' },
  //           { kind: 'audioinput' },
  //           { kind: 'audiooutput' }
  //         ])
  //     })
  //   });
  // });

  return { browser, page };
}
