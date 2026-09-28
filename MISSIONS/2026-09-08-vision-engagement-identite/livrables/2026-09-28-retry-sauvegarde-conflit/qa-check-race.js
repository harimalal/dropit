const { chromium } = require('playwright');
const http = require('http');

function getState() {
  return new Promise((resolve, reject) => {
    http.get('http://localhost:8937/__state', res => {
      let body = ''; res.on('data', c => body += c); res.on('end', () => resolve(JSON.parse(body)));
    }).on('error', reject);
  });
}
function reset() {
  return new Promise((resolve, reject) => {
    http.get('http://localhost:8937/__reset', res => { res.on('data', () => {}); res.on('end', resolve); }).on('error', reject);
  });
}

(async () => {
  await reset();
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 420, height: 800 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://localhost:8937/', { waitUntil: 'networkidle' });
  // Laisse tourner le backfill (3 fetch photo échelonnés) + toutes les sauvegardes/retries
  // qui en découlent jusqu'à convergence.
  await page.waitForTimeout(4000);
  const result = await getState();
  const titlesWithPhoto = result.store.data.projects.filter(p => p.photo && p.photo.url).map(p => p.title);
  console.log(JSON.stringify({
    titlesWithPhoto,
    allThreeSaved: titlesWithPhoto.length === 3,
    postAttempts: result.postLog.length,
    conflictsSeen: result.postLog.filter(l => !l.match).length,
    errors
  }, null, 2));
  await browser.close();
})();
