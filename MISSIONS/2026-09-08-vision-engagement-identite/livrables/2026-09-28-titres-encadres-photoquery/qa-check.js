const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 420, height: 800 } });
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  await page.goto('http://localhost:8934/app.html', { waitUntil: 'networkidle' });
  await page.waitForSelector('#home-treemap-zone .tile', { timeout: 5000 });
  await page.waitForTimeout(500);

  const tiles = await page.$$eval('#home-treemap-zone .tile', els => els.map(el => {
    const title = el.querySelector('.tile-title');
    const emoji = el.querySelector('.tile-emoji');
    const photoLayer = el.querySelector('.tile-photo');
    return {
      projectId: el.dataset.projectId,
      hasPhotoClass: el.classList.contains('has-photo'),
      titleBg: title ? getComputedStyle(title).backgroundColor : null,
      titleBgImage: title ? getComputedStyle(title).backgroundImage : null,
      emojiBg: emoji ? getComputedStyle(emoji).backgroundColor : null,
      titlePadding: title ? getComputedStyle(title).padding : null,
      photoFilter: photoLayer ? getComputedStyle(photoLayer).filter : null,
      titleText: title ? title.textContent : null
    };
  }));
  console.log(JSON.stringify(tiles, null, 2));
  console.log('ERRORS:', JSON.stringify(errors));
  await page.screenshot({ path: 'home-title-frame.png' });
  await browser.close();
})();
