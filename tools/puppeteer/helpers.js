import fs from 'fs';
import path from 'path';

const DEFAULT_SHOT_DIR = process.env.SCREENSHOT_DIR || path.join(process.cwd(), 'screenshots', 'g2a');

export function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

export function stamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return (
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}` +
    `-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
  );
}

export function makeSafe(label) {
  return String(label).toLowerCase().replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '');
}

export async function takeShot(page, label, dir = DEFAULT_SHOT_DIR) {
  try {
    ensureDir(dir);
    const file = path.join(dir, `${makeSafe(label)}-${stamp()}.png`);
    await page.screenshot({ path: file, fullPage: true });
    console.log(`[G2A] 📸 ${file}`);
    return file;
  } catch (e) {
    console.warn('[G2A] ⚠️ Screenshot failed:', e.message);
    return null;
  }
}

export function attachLogging(page) {
  page.on('console', (msg) => console.log('[G2A][console]', msg.type(), msg.text()));
  page.on('pageerror', (err) => console.log('[G2A][pageerror]', err.message));
  page.on('requestfailed', (req) => console.log('[G2A][requestfailed]', req.url(), req.failure()?.errorText));
}

export async function waitVisible(pageOrFrame, selector, timeout = 30000) {
  await pageOrFrame.waitForSelector(selector, { visible: true, timeout });
}

export async function clickSafe(page, selector, opts = {}) {
  const { timeout = 30000, delay = 0 } = opts;
  await waitVisible(page, selector, timeout);
  if (delay) await new Promise((r) => setTimeout(r, delay));
  await page.click(selector);
}

export async function typeSafe(pageOrFrame, selector, text, opts = {}) {
  const { timeout = 30000, delay = 100, clear = false } = opts;
  await waitVisible(pageOrFrame, selector, timeout);
  const el = await pageOrFrame.$(selector);
  if (!el) throw new Error(`Selector not found: ${selector}`);
  if (clear) {
    await el.click({ clickCount: 3 });
    await pageOrFrame.keyboard.press('Backspace');
  }
  await el.type(text, { delay });
}



export async function saveSession(sourceUrl, page, filePath) {
  if (!sourceUrl) {
    sourceUrl = await page.url();
  }
  const pageUrl = await page.url();
  const { lstore, sstore } = await page.evaluate(() => ({
    lstore: Object.assign({}, ...Object.keys(localStorage).map(k => ({ [k]: localStorage.getItem(k) }))),
    sstore: Object.assign({}, ...Object.keys(sessionStorage).map(k => ({ [k]: sessionStorage.getItem(k) }))),
  }));
  const cookies = await page.cookies();
  const payload = { savedAt: Date.now(), source: sourceUrl, url: pageUrl, cookies, lstore, sstore };
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2));
  return payload;
}



export async function restoreSession(browser, session) {
  let { url, cookies, lstore, sstore } = session;

  // We use the default page of new browser instance
  let page = await browser.newPage();
  
  // Import cookies
  await page.setCookie(...cookies);

  // Go to the saved URL 
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

  // Restore localStorage and sessionStorage
  await page.evaluate((data) => {
    for (const [k, v] of Object.entries(data.lstore || {})) localStorage.setItem(k, v);
    for (const [k, v] of Object.entries(data.sstore || {})) sessionStorage.setItem(k, v);
  }, { lstore, sstore });
  
  //console.log('Session restored successfully');
  return page;
}

export async function clickByText(page, tags, keywords) {
  return page.evaluate(({ tags, keywords }) => {
    const lower = (s) => (s || '').toLowerCase();
    const set = new Set(tags);
    const nodes = Array.from(document.querySelectorAll(tags.join(',')));
    for (const n of nodes) {
      if (!set.has(n.tagName.toLowerCase())) continue;
      const txt = lower(n.innerText || n.textContent || '');
      if (keywords.some(k => txt.includes(lower(k)))) {
        (n).click();
        return true;
      }
    }
    return false;
  }, { tags, keywords });
}





