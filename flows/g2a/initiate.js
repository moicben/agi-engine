import { launchBrowser } from '../../tools/puppeteer/client.js';

export async function initiateG2AWorkflow() {

	const { browser, page } = await launchBrowser();

	// Email par défaut si non fourni via ENV (évite crash)
	const email = process.env.G2A_EMAIL || 'test@example.com';

	await page.goto("https://news.ycombinator.com");
	
	await new Promise((resolve) => setTimeout(resolve, 3000));
	
	
	await page.goto("https://www.g2a.com/fr/rewarble-visa-gift-card-5-usd-by-rewarble-key-global-i10000502992002?___currency=EUR&___store=english&___locale=fr")
	await new Promise((resolve) => setTimeout(resolve, 5000));
	
	
	await page.waitForSelector('form > button', { visible: true, timeout: 30000 });
	await page.click('form > button');
	
	
	  await page.waitForSelector('.rc-drawer-content .light > div > .justify-between a', { visible: true, timeout: 30000 });
	await page.click('.rc-drawer-content .light > div > .justify-between a');
	
	
	    await page.waitForSelector("input[type='email']", { visible: true, timeout: 30000 });
	    await page.click("input[type='email']");
	    await page.type("input[type='email']", email, { delay: 20 });
	
	    
	    await page.waitForSelector("button[data-event='cart-continue']", { visible: true, timeout: 30000 });
	    await page.click("button[data-event='cart-continue']");
	
	    
	    await page.waitForSelector("button[data-testid='continue-payment-button']", { visible: true, timeout: 30000 });
	    await page.click("button[data-testid='continue-payment-button']");
	
	    
	    const iframeInfo = await page.evaluate(() => {
	      const iframe = document.querySelector('iframe');
	      if (!iframe) return null;
	      return { src: iframe.getAttribute('src') || null, title: iframe.getAttribute('title') || null };
	    });
	}

