import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { exec as execCb } from 'child_process';
import { promisify } from 'util';
import { launchBrowser } from './puppeteer/client.js';
import { extractRawTextFromImage, checkKeywords } from './ocr.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const exec = promisify(execCb);

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
}

function timestamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return (
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}` +
    `-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
  );
}

export async function takeWebScreenshot(url, options = {}) {
  const {
    outDir = path.resolve(process.cwd(), 'screenshots', 'vision'),
    label = 'capture',
    fullPage = true,
    headless = true
  } = options;

  ensureDir(outDir);
  const filename = `${label}-${timestamp()}.png`;
  const outPath = path.join(outDir, filename);

  const { browser, page } = await launchBrowser(headless);
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    await page.screenshot({ path: outPath, fullPage });
    return outPath;
  } finally {
    await browser.close();
  }
}

async function commandExists(cmd) {
  try {
    await exec(`command -v ${cmd} >/dev/null 2>&1`);
    return true;
  } catch {
    return false;
  }
}

async function tryExec(command) {
  try {
    await exec(command);
    return true;
  } catch {
    return false;
  }
}

export async function takeDesktopScreenshot(options = {}) {
  const {
    outDir = path.resolve(process.cwd(), 'screenshots', 'desktop'),
    label = 'desktop',
  } = options;

  if (process.platform !== 'linux') {
    throw new Error('takeDesktopScreenshot is supported on Linux only');
  }

  ensureDir(outDir);
  const filename = `${label}-${timestamp()}.png`;
  const outPath = path.join(outDir, filename);

  // Try common Wayland/X11 tools in order
  const candidates = [];
  // grim (Wayland)
  candidates.push(async () => (await commandExists('grim')) && await tryExec(`grim "${outPath}"`));
  // gnome-screenshot
  candidates.push(async () => (await commandExists('gnome-screenshot')) && await tryExec(`gnome-screenshot -f "${outPath}"`));
  // scrot
  candidates.push(async () => (await commandExists('scrot')) && await tryExec(`scrot "${outPath}"`));
  // ImageMagick import (X11)
  candidates.push(async () => (await commandExists('import')) && await tryExec(`import -window root "${outPath}"`));
  // xwd + convert
  candidates.push(async () => (await commandExists('xwd')) && (await commandExists('convert')) && await tryExec(`bash -lc 'xwd -root -silent | convert xwd:- png:"${outPath}"'`));

  for (const attempt of candidates) {
    const ok = await attempt();
    if (ok && fs.existsSync(outPath)) {
      return outPath;
    }
  }

  throw new Error('No suitable screenshot tool found (tried grim, gnome-screenshot, scrot, import, xwd+convert)');
}

export async function extractTextFromScreenshot(imagePath, lang = 'eng') {
  const { success, text, error } = await extractRawTextFromImage(imagePath, lang);
  if (!success) {
    return { success: false, text: '', error };
  }
  return { success: true, text };
}

export async function analyzeScreenshot(imagePath, { accept = [], reject = [], lang = 'eng' } = {}) {
  const { success, text, error } = await extractTextFromScreenshot(imagePath, lang);
  if (!success) {
    return { success: false, reason: error || 'OCR failed', text: '' };
  }
  const verdict = checkKeywords(text, accept, reject);
  return { success: true, text, verdict };
}

export default { takeWebScreenshot, takeDesktopScreenshot, extractTextFromScreenshot, analyzeScreenshot };

