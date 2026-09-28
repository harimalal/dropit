const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 420, height: 800 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://localhost:8933/app3-conflict.html', { waitUntil: 'networkidle' });
  await page.waitForSelector('#compose-text-input', { timeout: 5000 });
  await page.fill('#compose-text-input', 'Projet apres conflit');
  await page.click('#compose-send-btn');
  await page.waitForTimeout(1000); // laisse le temps au 409 + retry de se dérouler
  const postCount = await page.evaluate(() => window.__postCount());
  const bodyText = await page.evaluate(() => document.body.innerText);
  const toastVisible = await page.evaluate(() => {
    var t = document.querySelector('.toast, [class*="toast"]');
    return t ? t.textContent : null;
  });
  console.log(JSON.stringify({
    postCount,
    projectSurvived: bodyText.indexOf('Projet apres conflit') >= 0,
    toastVisible,
    errors
  }, null, 2));
  await browser.close();
})();
