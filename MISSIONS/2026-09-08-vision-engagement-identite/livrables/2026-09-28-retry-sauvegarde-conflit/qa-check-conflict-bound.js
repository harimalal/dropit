const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 420, height: 800 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://localhost:8938/app-conflict.html', { waitUntil: 'networkidle' });
  await page.waitForSelector('#compose-text-input', { timeout: 5000 });
  await page.fill('#compose-text-input', 'Test conflit permanent');
  await page.click('#compose-send-btn');
  // Laisse le temps à toute la cascade de retries de se dérouler (4 tentatives, chacune quasi instantanée ici).
  await page.waitForTimeout(1500);
  const postCount = await page.evaluate(() => window.__postCount);
  const bodyText = await page.evaluate(() => document.body.innerText);
  const projectSurvived = bodyText.indexOf('Test conflit permanent') >= 0;
  console.log(JSON.stringify({
    postCount,
    expectedMaxAttempts: 4,
    toastShown: bodyText.indexOf('Modifié sur un autre appareil') >= 0,
    projectSurvived,
    errors
  }, null, 2));
  await browser.close();
})();
