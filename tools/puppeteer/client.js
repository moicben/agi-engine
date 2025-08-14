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


export async function launchBrowser(headlessMode = false, proxy = false) {


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
    headless: headlessMode,
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
