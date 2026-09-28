const { chromium } = require('playwright');
const http = require('http');

function getState() {
  return new Promise((resolve, reject) => {
    http.get('http://localhost:8939/__state', res => {
      let body = ''; res.on('data', c => body += c); res.on('end', () => resolve(JSON.parse(body)));
    }).on('error', reject);
  });
}
function reset() {
  return new Promise((resolve, reject) => {
    http.get('http://localhost:8939/__reset', res => { res.on('data', () => {}); res.on('end', resolve); }).on('error', reject);
  });
}

(async () => {
  await reset();
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  // Deux "sessions" indépendantes (comme web + application) sur le même compte, chargées
  // quasi simultanément, chacune backfillant les 4 mêmes projets sans le savoir.
  const page1 = await browser.newPage({ viewport: { width: 420, height: 800 } });
  const page2 = await browser.newPage({ viewport: { width: 420, height: 800 } });
  const errors = [];
  page1.on('pageerror', e => errors.push('page1: ' + e.message));
  page2.on('pageerror', e => errors.push('page2: ' + e.message));

  await Promise.all([
    page1.goto('http://localhost:8939/', { waitUntil: 'networkidle' }),
    page2.goto('http://localhost:8939/', { waitUntil: 'networkidle' })
  ]);

  // Laisse les deux sessions backfiller + se disputer la sauvegarde + converger.
  await page1.waitForTimeout(6000);

  const result = await getState();
  const titlesWithPhoto = result.store.data.projects.filter(p => p.photo && p.photo.url).map(p => p.title);
  console.log(JSON.stringify({
    titlesWithPhoto,
    allFourSaved: titlesWithPhoto.length === 4,
    totalPostAttempts: result.postLog.length,
    conflicts: result.postLog.filter(l => !l.match).length,
    successes: result.postLog.filter(l => l.match).length,
    errors
  }, null, 2));
  await browser.close();
})();
