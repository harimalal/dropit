// Point risqué : sur l'écran projet/liste/agenda, deux barres de navigation coexistent
// dans le DOM (celle de l'accueil reste dessous). Le bouton Drop it doit répondre depuis
// celle réellement affichée, et le compteur doit se mettre à jour sur toutes les copies.
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 420, height: 820 } });
  const errors = []; page.on('pageerror', e => errors.push(String(e)));
  await page.goto('http://localhost:8941/app.html?v=' + Date.now(), { waitUntil: 'networkidle' });
  await page.waitForSelector('#home-treemap-zone .tile', { timeout: 5000 });
  await page.waitForTimeout(400);

  const res = {};
  // Ouvre un projet : deux barres dans le DOM à partir d'ici.
  await page.click('.tile[data-project-id="p1"]');
  await page.waitForSelector('#detail-screen', { timeout: 3000 });
  await page.waitForTimeout(400);
  res.tabbarsInDom = await page.evaluate(() => document.querySelectorAll('#drop-tab-btn').length);

  // Clic sur le bouton de la barre VISIBLE (celle de l'écran projet).
  await page.click('#detail-screen #drop-tab-btn');
  await page.waitForTimeout(400);
  res.sheetOpensFromDetail = await page.evaluate(() => !!document.querySelector('.drop-sheet'));

  // Ajoute une entrée : le compteur doit passer de 3 à 4 sur TOUTES les copies.
  await page.fill('#drop-sheet-input', 'Nouvelle idée de test');
  await page.click('#drop-sheet-send-btn');
  await page.waitForTimeout(400);
  res.badgesAfterAdd = await page.evaluate(() =>
    [...document.querySelectorAll('.drop-tab-badge')].map(b => b.textContent));

  // Coche une entrée : retour à 3 partout.
  await page.evaluate(() => document.querySelector('[data-drop-check]').click());
  await page.waitForTimeout(400);
  res.badgesAfterCheck = await page.evaluate(() =>
    [...document.querySelectorAll('.drop-tab-badge')].map(b => b.textContent));

  res.errors = errors;
  console.log(JSON.stringify(res, null, 2));
  await browser.close();
})();
