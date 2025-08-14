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
	
	console.info("Success!");
	
})();