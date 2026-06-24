const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  // Capture console messages
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('BROWSER ERROR:', msg.text());
    } else {
      console.log('BROWSER LOG:', msg.text());
    }
  });

  // Capture page errors (uncaught exceptions)
  page.on('pageerror', error => {
    console.log('PAGE ERROR:', error.message);
  });

  // Capture request failures
  page.on('requestfailed', request => {
    console.log('REQUEST FAILED:', request.url(), request.failure().errorText);
  });

  try {
    await page.goto('http://localhost:4173', { waitUntil: 'networkidle0', timeout: 10000 });
    console.log('Page loaded completely.');
    
    // Also try to go to /game just in case
    await page.goto('http://localhost:4173/game', { waitUntil: 'networkidle0', timeout: 10000 });
    console.log('Game page loaded completely.');

  } catch (e) {
    console.error('Navigation error:', e.message);
  } finally {
    await browser.close();
  }
})();
