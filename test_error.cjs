const puppeteer = require('puppeteer');
const { spawn } = require('child_process');

(async () => {
  console.log('Starting dev server...');
  const server = spawn('npm', ['run', 'dev'], { shell: true });
  
  let targetUrl = 'http://localhost:5173';
  let serverReady = false;

  server.stdout.on('data', (data) => {
    const msg = data.toString();
    console.log('[SERVER]', msg.trim());
    
    // Strip ANSI codes
    const cleanMsg = msg.replace(/\x1B\[\d+m/g, '');
    
    const match = cleanMsg.match(/localhost:(\d+)/);
    if (match) {
      targetUrl = 'http://localhost:' + match[1];
      serverReady = true;
    }
  });

  server.stderr.on('data', (data) => {
    console.error('[SERVER ERROR]', data.toString().trim());
  });

  let attempts = 0;
  while (!serverReady && attempts < 20) {
    await new Promise(r => setTimeout(r, 1000));
    attempts++;
  }

  if (!serverReady) {
    console.error('Server failed to start.');
    server.kill();
    process.exit(1);
  }

  console.log('Server is ready on ' + targetUrl + '. Launching Puppeteer...');
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('BROWSER ERROR:', msg.text());
    }
  });

  page.on('pageerror', error => {
    console.log('PAGE ERROR:', error.message);
  });

  try {
    await page.goto(targetUrl, { waitUntil: 'networkidle0', timeout: 15000 });
    console.log('Root loaded.');
    await new Promise(r => setTimeout(r, 2000)); 
    
    await page.goto(targetUrl + '/game', { waitUntil: 'networkidle0', timeout: 15000 });
    console.log('Game page loaded.');
    await new Promise(r => setTimeout(r, 2000));
  } catch (e) {
    console.error('Navigation error:', e.message);
  } finally {
    await browser.close();
    server.kill();
    console.log('Done.');
    process.exit(0);
  }
})();
