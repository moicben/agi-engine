import playwright from "playwright";
const BROWSERBASE_API_KEY = "bb_live_m-T9VnahBkG3X3JgErytfc-VUFY";
const BROWSERBASE_PROJECT_ID = "df923009-d142-47d6-b496-a335041e601f";

(async () => {
  const browser = await playwright.chromium.connectOverCDP(`wss://connect.browserbase.com?apiKey=${BROWSERBASE_API_KEY}`);
	const context = await browser.newContext();
	const page = await context.newPage();

console.info("Launching browser...");
	
	/* To make things easier, we've setup Playwright using the window variables.
	 You can access it and your API key using playwright or `wss://connect.browserbase.com?apiKey=${BROWSERBASE_API_KEY}`. */
	console.info('Connected!');
	
	
	await new Promise((resolve) => setTimeout(resolve, 1000));
	
	
	await page.goto("https://news.ycombinator.com");
	
	await new Promise((resolve) => setTimeout(resolve, 3000));
	
	
	await page.goto("https://www.g2a.com/fr/rewarble-visa-gift-card-5-usd-by-rewarble-key-global-i10000502992002?___currency=EUR&___store=english&___locale=fr")
	await new Promise((resolve) => setTimeout(resolve, 5000));
	
	
	await page.waitForSelector('form > button', { visible: true, timeout: 30000 });
	await page.click('form > button');xx
	
	
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
	
	
})();