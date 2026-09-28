// Parcourt les 4 écrans touchés par le lot et capture chacun, en vérifiant au passage
// la présence/absence des éléments attendus.
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 420, height: 820 } });
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto('http://localhost:8941/app.html?v=' + Date.now(), { waitUntil: 'networkidle' });
  await page.waitForSelector('#home-treemap-zone .tile', { timeout: 5000 });
  await page.waitForTimeout(400);

  // --- Accueil ---
  const home = await page.evaluate(() => {
    const tile = document.querySelector('.tile');
    const cs = getComputedStyle(tile);
    const emoji = tile.querySelector('.tile-emoji');
    return {
      greeting: document.getElementById('home-greeting').textContent,
      tileBackground: cs.backgroundImage,
      tilePadding: cs.padding,
      emojiBackground: getComputedStyle(emoji).backgroundImage,
      emojiFontSize: getComputedStyle(emoji).fontSize,
      progressBars: document.querySelectorAll('.tile-progress').length,
      tiles: document.querySelectorAll('.tile').length,
      pctSample: document.querySelector('.tile-progress-pct') && document.querySelector('.tile-progress-pct').textContent,
      chevrons: document.querySelectorAll('.tile-progress-chevron').length,
      dropBtn: !!document.querySelector('.bottom-tabbar #drop-tab-btn'),
      dropBadge: document.querySelector('.drop-tab-badge') && document.querySelector('.drop-tab-badge').textContent,
      tabbarChildren: [...document.querySelectorAll('.bottom-tabbar > *')].map(e => e.className),
      oldFab: !!document.querySelector('.drop-fab'),
    };
  });
  console.log('ACCUEIL', JSON.stringify(home, null, 2));
  await page.screenshot({ path: 'shot-accueil.png', fullPage: false });

  // --- Drop Zone ---
  await page.click('.bottom-tabbar #drop-tab-btn');
  await page.waitForSelector('.drop-sheet', { timeout: 3000 });
  await page.waitForTimeout(300);
  const dz = await page.evaluate(() => ({
    title: document.querySelector('.drop-zone-title') && document.querySelector('.drop-zone-title').textContent,
    pill: document.querySelector('.drop-zone-pill') && document.querySelector('.drop-zone-pill').textContent,
    icon: document.querySelector('.drop-zone-icon') && document.querySelector('.drop-zone-icon').textContent,
    badges: document.querySelectorAll('.drop-badge').length,
  }));
  console.log('DROP ZONE', JSON.stringify(dz, null, 2));
  await page.screenshot({ path: 'shot-dropzone.png' });
  await page.click('#drop-sheet-close-btn');
  await page.waitForTimeout(300);

  // --- Fenêtre projet (le projet à 6 catégories) ---
  await page.click('.tile[data-project-id="p1"]');
  await page.waitForSelector('#detail-screen', { timeout: 3000 });
  await page.waitForTimeout(500);
  const detail = await page.evaluate(() => {
    const strip = document.getElementById('steps-strip');
    return {
      headerDirection: getComputedStyle(document.querySelector('.detail-header')).flexDirection,
      emojiBadge: !!document.querySelector('.detail-emoji-badge'),
      title: document.querySelector('.detail-title').textContent,
      pct: document.querySelector('.detail-progress-pct').textContent,
      steps: document.querySelectorAll('.step-node').length,
      done: document.querySelectorAll('.step-node.is-done').length,
      current: document.querySelectorAll('.step-node.is-current').length,
      currentLabel: document.querySelector('.step-node.is-current .step-label').textContent,
      filledLinks: document.querySelectorAll('.step-link.filled').length,
      stripScrollable: strip ? strip.scrollWidth > strip.clientWidth : null,
      stripScrollLeft: strip ? strip.scrollLeft : null,
    };
  });
  console.log('PROJET', JSON.stringify(detail, null, 2));
  await page.screenshot({ path: 'shot-projet.png' });

  // --- Vue liste (ouverte depuis l'accueil : la liste scopée à un projet n'affiche pas
  // les chips de projet mais des filtres catégorie/priorité) ---
  await page.click('#detail-screen #tabbar-home');
  await page.waitForTimeout(500);
  await page.click('.bottom-tabbar #tabbar-list');
  await page.waitForSelector('#tasklist-screen', { timeout: 3000 });
  await page.waitForTimeout(400);
  await page.evaluate(() => { const c = document.querySelector('.tl-proj-chip'); if (c) c.click(); });
  await page.waitForTimeout(300);
  const list = await page.evaluate(() => {
    const chip = document.querySelector('.tl-proj-chip');
    const cs = chip ? getComputedStyle(chip) : null;
    return {
      chipRadius: cs && cs.borderRadius,
      activeChips: document.querySelectorAll('.tl-proj-chip.active').length,
      dropBtnInList: !!document.querySelector('#tasklist-screen #drop-tab-btn'),
    };
  });
  console.log('LISTE', JSON.stringify(list, null, 2));
  await page.screenshot({ path: 'shot-liste.png' });

  console.log('ERREURS JS', JSON.stringify(errors));
  await browser.close();
})();
