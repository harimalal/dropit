const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 420, height: 800 } });
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', msg => { if (msg.type() === 'error') errors.push('console: ' + msg.text()); });

  await page.goto('http://localhost:8931/app.html', { waitUntil: 'networkidle' });
  await page.waitForSelector('#home-treemap-zone .tile', { timeout: 5000 });
  // Laisse le temps aux fetch /api/photos (async, déclenchés après le premier layout) de résoudre.
  await page.waitForTimeout(1500);

  const tiles = await page.$$eval('#home-treemap-zone .tile', els => els.map(el => {
    const body = el.querySelector('.tile-body');
    const emoji = el.querySelector('.tile-emoji');
    const title = el.querySelector('.tile-title');
    return {
      projectId: el.dataset.projectId,
      classes: el.className,
      hasPhotoClass: el.classList.contains('has-photo'),
      bgImage: body ? getComputedStyle(body).backgroundImage : null,
      emojiText: emoji ? emoji.textContent : null,
      emojiPosition: emoji ? getComputedStyle(emoji).position : null,
      emojiWidth: emoji ? getComputedStyle(emoji).width : null,
      titleColor: title ? getComputedStyle(title).color : null,
      titleText: title ? title.textContent : null,
      width: el.style.width,
      height: el.style.height
    };
  }));

  console.log(JSON.stringify(tiles, null, 2));
  console.log('ERRORS:', JSON.stringify(errors, null, 2));

  await page.screenshot({ path: 'home-treemap-photos.png' });
  await browser.close();
})();
