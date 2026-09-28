// Reproduit : un POST avec keepalive:true dont le corps dépasse 64 Kio est-il refusé par Chromium
// avant même d'atteindre le réseau ?
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  let reachedServer = 0;
  await page.route('http://localhost:8941/api/save', r => { reachedServer++; r.fulfill({ status: 200, body: '{"ok":true}' }); });
  await page.goto('http://localhost:8941/app.html?v=' + Date.now(), { waitUntil: 'load' });
  const out = await page.evaluate(async () => {
    const res = {};
    for (const size of [60000, 65000, 67104, 70000]) {
      for (const keepalive of [true, false]) {
        const body = JSON.stringify({ state: 'x'.repeat(size - 40), baseUpdatedAt: null });
        try {
          const r = await fetch('/api/save', { method: 'POST', body, keepalive });
          res[`${size}o keepalive=${keepalive}`] = 'HTTP ' + r.status;
        } catch (e) { res[`${size}o keepalive=${keepalive}`] = 'REFUSÉ : ' + e.name + ' — ' + e.message; }
      }
    }
    return res;
  });
  console.log(JSON.stringify(out, null, 2));
  console.log('requêtes arrivées au serveur :', reachedServer, 'sur 8');
  await browser.close();
})();
