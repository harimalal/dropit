const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 420, height: 800 } });
  await page.goto('http://localhost:8940/app.html?v=1790615613', { waitUntil: 'networkidle' });
  await page.waitForSelector('#home-treemap-zone .tile', { timeout: 5000 });
  await page.waitForTimeout(300);

  const result = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('.tile').forEach(el => {
      const title = el.querySelector('.tile-title');
      if (!title) return;
      const rect = el.getBoundingClientRect();
      const cs = getComputedStyle(title);
      const clampedHeight = title.clientHeight;
      const prevClamp = title.style.webkitLineClamp, prevOverflow = title.style.overflow, prevDisplay = title.style.display;
      title.style.webkitLineClamp = 'unset'; title.style.overflow = 'visible'; title.style.display = 'block';
      const naturalHeight = title.scrollHeight;
      title.style.webkitLineClamp = prevClamp; title.style.overflow = prevOverflow; title.style.display = prevDisplay;
      out.push({
        projectId: el.dataset.projectId, titleText: title.textContent,
        tileW: Math.round(rect.width), tileH: Math.round(rect.height),
        fontSize: cs.fontSize, lineHeight: cs.lineHeight,
        clampedHeight, naturalHeight, reallyTruncated: naturalHeight > clampedHeight + 1
      });
    });
    return out;
  });
  console.log(JSON.stringify(result, null, 2));
  await browser.close();
})();
