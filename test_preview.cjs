const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('BROWSER ERROR:', msg.text());
    } else {
      console.log('BROWSER LOG:', msg.text());
    }
  });

  page.on('pageerror', error => {
    console.log('PAGE CRASH ERROR:', error.message);
  });

  try {
    console.log('Navigating to http://localhost:4173...');
    await page.goto('http://localhost:4173/', { waitUntil: 'networkidle0', timeout: 15000 });
    console.log('Navigation complete.');
    
    // Wait an extra second to see if React crashes after initial mount
    await new Promise(r => setTimeout(r, 1500));
    
  } catch (e) {
    console.error('Puppeteer Navigation failed:', e.message);
  } finally {
    await browser.close();
    process.exit(0);
  }
})();
