const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));
  
  await page.goto('http://localhost:5173/game', { waitUntil: 'networkidle0' });
  
  console.log("Loaded /game");
  
  // click the first level node
  try {
    await page.waitForSelector('.level-node-button', { timeout: 5000 });
    console.log("Clicking level node...");
    await page.click('.level-node-button');
    
    await new Promise(r => setTimeout(r, 2000));
    console.log("Current URL after click:", page.url());
    
    // Check if there is an element on the screen indicating success
    const bodyHTML = await page.evaluate(() => document.body.innerHTML);
    if (bodyHTML.includes("START JOURNEY")) {
        console.log("SUCCESS: Intro screen opened.");
    } else {
        console.log("FAILED: Intro screen not found.");
    }
  } catch(e) {
    console.log("Could not find level node to click", e.message);
  }

  await browser.close();
})();
