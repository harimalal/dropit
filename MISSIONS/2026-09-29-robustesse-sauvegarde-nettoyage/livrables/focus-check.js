// Vérifie que render() préserve le focus et la position du curseur (fetch réel, réponses simulées).
const { chromium } = require('playwright');
const proj = (i) => ({ id: 'p' + i, title: 'Projet ' + i, emoji: '🚗', summary: '', icon: 'voiture',
  categories: [{ id: 'c' + i, title: 'Cat', items: [{ id: 'i' + i, title: 'Tâche', done: false, createdAt: '2026-01-01', notes: [] }] }],
  projectNotes: [], dueBucket: '1m', dueDate: null, photo: null, createdAt: '2026-01-01', updatedAt: '2026-01-01' });

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 420, height: 820 } });
  const errors = []; page.on('pageerror', e => errors.push(String(e)));
  const server = { data: { projects: [proj(0), proj(1)], dropZone: [] }, updatedAt: '2026-09-29T10:00:00.000Z' };
  await page.route('**/api/projects', r => {
    if (r.request().method() === 'GET') return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: server.data, updatedAt: server.updatedAt }) });
    server.data = JSON.parse(r.request().postData()).state; server.updatedAt = new Date().toISOString();
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, updatedAt: server.updatedAt }) });
  });
  await page.route('**/api/ai', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: [{ type: 'text', text: '{"domain":"autre","subject":""}' }] }) }));
  await page.route('**/api/photos**', r => r.fulfill({ status: 404, contentType: 'application/json', body: '{"error":"no_results"}' }));
  await page.goto('http://localhost:8941/app-apres.html?v=' + Date.now(), { waitUntil: 'networkidle' });
  await page.waitForSelector('.tile'); await page.waitForTimeout(700);

  const out = {};

  // CAS RÉEL : barre d'ajout de tâche d'un projet. Entrée déclenche persist()+render(),
  // qui détruit et recrée le champ. Avant le correctif, le focus était perdu à chaque
  // tâche ajoutée : il fallait recliquer dans le champ pour enchaîner.
  await page.click('.tile[data-project-id="p0"]');
  await page.waitForSelector('#detail-screen');
  await page.waitForTimeout(500);
  const aDfb = await page.evaluate(() => !!document.getElementById('dfb-input'));
  if (aDfb) {
    await page.click('#dfb-input');
    await page.type('#dfb-input', 'Réserver le train');
    const focusAvant = await page.evaluate(() => document.activeElement.id);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);
    const apresEntree = await page.evaluate(() => ({ focus: document.activeElement.id, valeur: (document.getElementById('dfb-input') || {}).value }));
    // enchaîner une 2e tâche SANS recliquer : c'est tout l'intérêt
    await page.keyboard.type('Réserver l hôtel');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);
    const taches = await page.evaluate(() => [...document.querySelectorAll('#detail-screen [data-item-id]')].map(e => e.textContent.trim().slice(0,40)));
    out.ajoutTache = { focusAvantEntree: focusAvant, focusApresEntree: apresEntree.focus,
      champVide: apresEntree.valeur === '', focusConserve: apresEntree.focus === 'dfb-input',
      deuxiemeTacheSansReclic: taches.some(t => /hôtel/.test(t)), taches: taches.slice(-3) };
  } else { out.ajoutTache = 'barre dfb absente dans ce projet'; }
  await page.click('#detail-screen #tabbar-home').catch(() => {});
  await page.waitForTimeout(400);

  // Saisie dans la barre de composition, curseur placé au milieu, puis rendu forcé
  await page.click('#compose-text-input');
  await page.type('#compose-text-input', 'Organiser mon voyage');
  await page.evaluate(() => { const el = document.getElementById('compose-text-input'); el.setSelectionRange(9, 9); });
  const avant = await page.evaluate(() => ({ id: document.activeElement.id, pos: document.activeElement.selectionStart, val: document.activeElement.value }));
  // Un rendu déclenché par autre chose que la frappe (ce que fait l'app en permanence)
  await page.evaluate(() => { window.dispatchEvent(new Event('resize')); });
  await page.waitForTimeout(400);
  const apres = await page.evaluate(() => ({ id: document.activeElement.id, pos: document.activeElement.selectionStart === undefined ? null : document.activeElement.selectionStart, val: document.activeElement.value }));
  out.compose = { avant, apres, focusGarde: avant.id === apres.id, curseurGarde: avant.pos === apres.pos, texteIntact: avant.val === apres.val };

  // Le focus ne doit PAS être volé quand rien n'avait le focus
  await page.evaluate(() => document.activeElement.blur());
  await page.evaluate(() => { window.dispatchEvent(new Event('resize')); });
  await page.waitForTimeout(400);
  out.sansFocus = await page.evaluate(() => document.activeElement.tagName);

  out.erreursJS = errors;
  console.log(JSON.stringify(out, null, 1));
  await browser.close();
})();
