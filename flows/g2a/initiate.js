import { launchBrowser } from '../../tools/puppeteer/client.js';
import fs from 'fs';
import path from 'path';

export async function initiateG2AWorkflow() {

	const { browser, page } = await launchBrowser();

	// Email par défaut si non fourni via ENV (évite crash)
	const email = process.env.G2A_EMAIL || 'test@example.com';

	// Préparer dossier screenshots
	const screenshotDir = process.env.SCREENSHOT_DIR || path.join(process.cwd(), 'screenshots', 'g2a');
	if (!fs.existsSync(screenshotDir)) {
		fs.mkdirSync(screenshotDir, { recursive: true });
	}

	const shortStamp = () => {
		const d = new Date();
		const pad = (n) => String(n).padStart(2, '0');
		return (
			`${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}` +
			`-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
		);
	};
	const log = (...args) => console.log('[G2A]', ...args);
	const makeSafe = (label) => String(label).toLowerCase().replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '');

	async function snap(label) {
		const safe = makeSafe(label);
		const file = path.join(screenshotDir, `${safe}-${shortStamp()}.png`);
		try {
			await page.screenshot({ path: file, fullPage: true });
			log(`📸 Screenshot: ${file}`);
		} catch (e) {
			log(`⚠️ Screenshot failed (${label}):`, e.message);
		}
	}

	// Page console piping
	page.on('console', (msg) => log(`🖥️ page console:`, msg.type(), msg.text()));
	page.on('pageerror', (err) => log('💥 page error:', err.message));

	log('🌐 Navigating to HN...');
	await page.goto("https://news.ycombinator.com");
	await snap('after-hn');
	
	await new Promise((resolve) => setTimeout(resolve, 1000));
	
	
	log('🛒 Navigating to G2A product...');
	await page.goto("https://www.g2a.com/fr/rewarble-visa-gift-card-5-usd-by-rewarble-key-global-i10000502992002?___currency=EUR&___store=english&___locale=fr")
	await snap('after-product');
	await new Promise((resolve) => setTimeout(resolve, 8000));
	 
	
	log('🟠 Click add-to-cart');
	await page.waitForSelector('form > button', { visible: true, timeout: 30000 });
	await snap('before-add-to-cart');
	await page.click('form > button');
	await snap('after-add-to-cart');

	await new Promise((resolve) => setTimeout(resolve, 3000));
	
	
	log('🟠 Open cart drawer');
	await page.waitForSelector('.rc-drawer-content .light > div > .justify-between a', { visible: true, timeout: 30000 });
	await snap('before-open-cart');
	await page.click('.rc-drawer-content .light > div > .justify-between a');
	await snap('after-open-cart');

	await new Promise((resolve) => setTimeout(resolve, 3000));
	
	log('✉️ Fill email');
	await page.waitForSelector("input[type='email']", { visible: true, timeout: 30000 });
	await page.click("input[type='email']");
	await page.type("input[type='email']", email, { delay: 20 });
	await snap('after-email');
	
	await new Promise((resolve) => setTimeout(resolve, 3000));
	    
	log('➡️ Continue cart');
	await page.waitForSelector("button[data-event='cart-continue']", { visible: true, timeout: 30000 });
	await snap('before-cart-continue');
	await page.click("button[data-event='cart-continue']");
	await snap('after-cart-continue');

	await new Promise((resolve) => setTimeout(resolve, 3000));
	
	    
	log('➡️ Continue payment');
	await page.waitForSelector("button[data-testid='continue-payment-button']", { visible: true, timeout: 30000 });
	await snap('before-continue-payment');
	await page.click("button[data-testid='continue-payment-button']");
	await snap('after-continue-payment');

	await new Promise((resolve) => setTimeout(resolve, 6000));
	
	    
	log('🔎 Inspect iframe');
	const iframeInfo = await page.evaluate(() => {
	  const iframe = document.querySelector('iframe');
	  if (!iframe) return null;
	  return { src: iframe.getAttribute('src') || null, title: iframe.getAttribute('title') || null };
	});
	log('🔎 iframeInfo:', iframeInfo);
	await snap('after-iframe-inspect');
	}

