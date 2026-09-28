const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const url = 'file:///home/user/dropit/PLAYBOOK/2026-09-28-photos-tuiles-lot-visuel/SLIDES.html';
  const errors = [], report = {};
  for (const [name, vp] of [['tel', {width: 400, height: 800}], ['bureau', {width: 1280, height: 760}]]) {
    const page = await browser.newPage({ viewport: vp });
    page.on('pageerror', e => errors.push(name + ': ' + e));
    await page.goto(url, { waitUntil: 'load' });
    const n = await page.evaluate(() => document.querySelectorAll('.slide').length);
    const problems = [];
    for (let i = 0; i < n; i++) {
      await page.waitForTimeout(900);
      const r = await page.evaluate(() => {
        const s = document.querySelector('.slide.active');
        const first = s.firstElementChild.getBoundingClientRect();
        const wide = [...s.querySelectorAll('*')].filter(e => e.getBoundingClientRect().right > window.innerWidth + 1).length;
        return { eyebrowTop: Math.round(first.top), scrollable: s.scrollHeight > s.clientHeight + 1, wide, docOverflow: document.documentElement.scrollWidth > window.innerWidth };
      });
      if (r.eyebrowTop < 0 || r.wide || r.docOverflow) problems.push({ slide: i + 1, ...r });
      if (name === 'bureau' && [1, 8, 10, 13].includes(i + 1)) await page.screenshot({ path: `deck2-bureau-${String(i + 1).padStart(2, '0')}.png` });
      if (name === 'tel' && [8, 10, 12].includes(i + 1)) await page.screenshot({ path: `deck2-tel-${String(i + 1).padStart(2, '0')}.png` });
      await page.keyboard.press('ArrowRight');
    }
    report[name] = { slides: n, problems };
    await page.close();
  }
  console.log(JSON.stringify({ report, errors }, null, 2));
  await browser.close();
})();
