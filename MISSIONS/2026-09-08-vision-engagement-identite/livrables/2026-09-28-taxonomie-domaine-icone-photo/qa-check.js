const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 420, height: 800 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://localhost:8935/app.html', { waitUntil: 'networkidle' });
  await page.waitForSelector('#compose-text-input', { timeout: 5000 });
  await page.fill('#compose-text-input', 'Partir à Bali en septembre');
  await page.click('#compose-send-btn');
  await page.waitForTimeout(800);
  const queries = await page.evaluate(() => window.__getCapturedQueries());
  console.log(JSON.stringify({ queries, errors }, null, 2));
  await browser.close();
})();
