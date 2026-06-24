const puppeteer = require('puppeteer');
const { spawn } = require('child_process');

(async () => {
  console.log('Starting preview server...');
  const server = spawn('npm', ['run', 'preview'], { shell: true });
  
  let serverReady = false;
  server.stdout.on('data', (data) => {
    const msg = data.toString();
    // process.stdout.write(msg);
    if (msg.includes('http://localhost:4173')) {
      serverReady = true;
    }
  });

  server.stderr.on('data', (data) => {
    // process.stderr.write(data.toString());
  });

  // wait until server ready
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

  console.log('Server is ready. Launching Puppeteer...');
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('BROWSER ERROR:', msg.text());
    } else if (msg.type() === 'warning') {
      // ignore warnings
    } else {
      console.log('BROWSER LOG:', msg.text());
    }
  });

  page.on('pageerror', error => {
    console.log('PAGE ERROR:', error.message);
  });

  try {
    await page.goto('http://localhost:4173', { waitUntil: 'networkidle0', timeout: 15000 });
    console.log('Root loaded.');
    await new Promise(r => setTimeout(r, 2000)); // Let React render
  } catch (e) {
    console.error('Navigation error:', e.message);
  } finally {
    await browser.close();
    server.kill();
    console.log('Done.');
    process.exit(0);
  }
})();
