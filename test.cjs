const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.type(), msg.text()));
  page.on('pageerror', err => console.error('BROWSER ERROR:', err.message));
  page.on('requestfailed', request => console.error('REQUEST FAILED:', request.url(), request.failure().errorText));

  await page.goto('http://localhost:8000/', { waitUntil: 'networkidle2' });
  
  const rootContent = await page.$eval('#root', el => el.innerHTML);
  console.log('ROOT CONTENT LENGTH:', rootContent.length);
  if (rootContent.length === 0) {
    console.log('Root is EMPTY!');
  } else {
    console.log('Root has content.');
  }

  await browser.close();
})();
