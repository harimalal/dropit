const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 420, height: 800 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://localhost:8936/app.html', { waitUntil: 'networkidle' });
  await page.waitForSelector('#home-treemap-zone .tile', { timeout: 5000 });
  await page.click('#home-treemap-zone .tile');
  await page.waitForSelector('#project-menu-btn', { timeout: 5000 });
  await page.click('#project-menu-btn');
  await page.waitForSelector('#pmenu-photo-btn', { timeout: 5000 });
  await page.click('#pmenu-photo-btn');
  await page.waitForTimeout(1000);
  const result = await page.evaluate(() => window.__getCaptured());
  console.log(JSON.stringify({ result, errors }, null, 2));
  await browser.close();
})();
