const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 420, height: 820 }, deviceScaleFactor: 2 });
  const errors = []; page.on('pageerror', e => errors.push(String(e)));
  await page.goto('http://localhost:8941/app.html?v=' + Date.now(), { waitUntil: 'networkidle' });
  await page.waitForSelector('#home-treemap-zone .tile', { timeout: 6000 });
  await page.waitForTimeout(500);
  const out = {};

  // 1. Bouton Drop it : blanc, point rouge, pastille rouge
  out.dropIt = await page.evaluate(() => {
    const c = (sel, prop) => { const e = document.querySelector(sel); return e ? getComputedStyle(e)[prop] : null; };
    return {
      fondBouton: c('#drop-tab-btn', 'backgroundColor'), texte: c('#drop-tab-btn', 'color'),
      point: c('.drop-tab-dot', 'backgroundColor'),
      pastilleFond: c('.drop-tab-badge', 'backgroundColor'), pastilleTexte: c('.drop-tab-badge', 'color'),
      pastilleValeur: (document.querySelector('.drop-tab-badge') || {}).textContent,
    };
  });

  // 2. Icône de tuile : encadré blanc, proportionnel
  out.icones = await page.evaluate(() => [...document.querySelectorAll('.tile')].map(t => {
    const e = t.querySelector('.tile-emoji'); const cs = getComputedStyle(e); const r = e.getBoundingClientRect();
    return { tuile: t.dataset.projectId, fond: cs.backgroundColor, cote: Math.round(r.width) + 'x' + Math.round(r.height), glyphe: cs.fontSize, rayon: cs.borderRadius, photo: t.classList.contains('has-photo') };
  }));
  await page.screenshot({ path: 'lot2-accueil.png', clip: { x: 0, y: 0, width: 420, height: 330 } });
  await page.screenshot({ path: 'lot2-barre.png', clip: { x: 0, y: 740, width: 420, height: 80 } });

  // 3. Vue liste : plus de barre d'ajout
  await page.click('.bottom-tabbar #tabbar-list');
  await page.waitForSelector('#tasklist-screen', { timeout: 3000 });
  await page.waitForTimeout(500);
  out.liste = await page.evaluate(() => ({
    barreAjout: !!document.querySelector('.tl-compose-bar'), champ: !!document.getElementById('tl-compose-input'),
    boutonAjouter: !!document.getElementById('tl-add-btn'), boutonSuggerer: !!document.getElementById('tl-suggest-btn'),
    margeBasDefilement: getComputedStyle(document.getElementById('tl-scroll')).paddingBottom,
    nav: !!document.querySelector('#tasklist-screen .bottom-tabbar'),
  }));
  await page.screenshot({ path: 'lot2-liste.png' });
  await page.click('#tasklist-screen #tabbar-home'); await page.waitForTimeout(500);

  // 4. « Changer la photo » quand rien de convenable n'est trouvé (mock : /api/photos -> 404)
  await page.click('.tile[data-project-id="p2"]'); await page.waitForSelector('#detail-screen'); await page.waitForTimeout(400);
  await page.click('#project-menu-btn'); await page.waitForSelector('#pmenu-photo-btn'); await page.click('#pmenu-photo-btn');
  const toasts = [];
  for (let i = 0; i < 12; i++) { await page.waitForTimeout(150); const t = await page.evaluate(() => { const e = document.getElementById('toast'); return e && e.classList.contains('show') ? e.textContent : null; }); if (t && toasts[toasts.length - 1] !== t) toasts.push(t); }
  await page.click('#detail-screen #tabbar-home'); await page.waitForTimeout(600);
  out.changerPhotoSansResultat = { toasts, photoConservee: await page.evaluate(() => !!document.querySelector('.tile[data-project-id="p2"] .tile-photo')) };

  out.erreursJS = errors;
  console.log(JSON.stringify(out, null, 1));
  await browser.close();
})();
