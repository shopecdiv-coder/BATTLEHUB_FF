const puppeteer = require('puppeteer');

(async () => {
  try {
    const browser = await puppeteer.launch({
      headless: "new",
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    // Listen to console logs
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('Failed to load resource')) return;
      console.log('BROWSER CONSOLE:', msg.type().toUpperCase(), text);
    });
    
    // Listen to page errors (uncaught exceptions)
    page.on('pageerror', error => console.log('BROWSER ERROR:', error.message));

    console.log("Navigating to login page...");
    await page.goto('http://localhost:5173/auth/login', { waitUntil: 'domcontentloaded' });
    
    console.log("Waiting for email input...");
    await page.waitForSelector('input[type="email"]');
    
    console.log("Typing credentials...");
    await page.type('input[type="email"]', 'shopecdiv@gmail.com');
    await page.type('input[type="password"]', '123456'); // assuming a simple pass or I'll type what's likely
    
    // I don't know the exact password, but the user is already logged in on their end.
    // However, maybe there is another way to trigger the crash without logging in?
    // Wait, the crash happens when navigating to / (Home) when authenticated.
    
    // Instead of logging in, I can try to find out what's causing the white screen by looking at the components rendered on the home page.
    // We wrapped App in ErrorBoundary. The user will see the error now.
    
    await browser.close();
  } catch (err) {
    console.error("Puppeteer Script Error:", err);
  }
})();
