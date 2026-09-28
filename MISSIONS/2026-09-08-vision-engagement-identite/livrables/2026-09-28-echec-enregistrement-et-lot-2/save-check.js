const { chromium } = require('playwright');

// ---- données : 8 projets, ~70 Ko une fois sérialisés (comme le compte réel : 67 104 octets)
function makeState(padKb) {
  const projects = [];
  for (let n = 1; n <= 8; n++) {
    const items = [];
    for (let i = 0; i < 12; i++) items.push({ id: `i${n}_${i}`, title: `Tâche ${i} du projet ${n} — ` + 'x'.repeat(60), done: i < 3, createdAt: '2026-01-01', notes: [] });
    projects.push({
      id: 'p' + n, title: 'Projet ' + n, emoji: '🎯', summary: 'x'.repeat(padKb),
      categories: [{ id: 'c' + n, title: 'Catégorie', items }], projectNotes: [],
      dueBucket: '1m', dueDate: null, createdAt: '2026-01-01', updatedAt: '2026-01-01',
      photo: { url: 'https://images.pexels.com/ancienne-' + n + '.jpg', photographer: '', photographerUrl: '', pexelsId: n, pageUrl: '', query: 'old', fetchedAt: '2026-09-01T00:00:00.000Z' },
    });
  }
  return { projects, dropZone: [] };
}

async function scenario(name, appFile, opts) {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const context = await browser.newContext({ viewport: { width: 420, height: 820 } });
  const page = await context.newPage();
  const errors = []; page.on('pageerror', e => errors.push(String(e)));

  const server = { projects: makeState(opts.pad || 7000), updatedAt: '2026-09-28T19:36:38.728Z', posts: [], inflight: 0, maxInflight: 0, postCount: 0 };
  const toasts = [];
  await page.route('**/api/projects', async route => {
    const req = route.request();
    if (req.method() === 'GET') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: server.projects, updatedAt: server.updatedAt }) });
    server.postCount++;
    server.inflight++; server.maxInflight = Math.max(server.maxInflight, server.inflight);
    const body = JSON.parse(req.postData());
    const n = server.postCount;
    if (opts.postDelayMs) await new Promise(r => setTimeout(r, opts.postDelayMs));
    server.inflight--;
    const status = opts.postStatus ? opts.postStatus(n, body) : 200;
    if (status === 'abort') { server.posts.push({ n, status: 'abort', bytes: req.postData().length, photo1: null }); return route.abort('internetdisconnected'); }
    server.posts.push({ n, status, bytes: req.postData().length, t: Date.now(), photo1: body.state.projects[0].photo && body.state.projects[0].photo.url });
    if (status === 200) { server.projects = body.state; server.updatedAt = new Date().toISOString(); return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, updatedAt: server.updatedAt }) }); }
    if (status === 409) return route.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify({ error: 'conflict', data: server.projects, updatedAt: server.updatedAt }) });
    return route.fulfill({ status, contentType: 'application/json', body: '{"error":"x"}' });
  });
  await page.route('**/api/ai', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: [{ type: 'text', text: '{"domain":"voyage","photoQuery":"open road"}' }] }) }));
  await page.route('**/api/photos**', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ url: 'https://images.pexels.com/NOUVELLE.jpg', photographer: 'T', photographerUrl: '', pexelsId: 99, pageUrl: '' }) }));

  await page.goto('file:///dev/null').catch(() => {});
  await page.goto('http://localhost:8941/' + appFile + '?v=' + Date.now(), { waitUntil: 'networkidle' });
  await page.waitForSelector('.tile', { timeout: 8000 });
  await page.waitForTimeout(500);
  const t0 = server.posts.length; // sauvegardes déjà parties au chargement (normalisation…) : on les ignore

  const captureToast = async () => { const t = await page.evaluate(() => { const e = document.getElementById('toast'); return e && e.classList.contains('show') ? e.textContent : null; }); if (t && toasts[toasts.length - 1] !== t) toasts.push(t); };
  const toastLoop = setInterval(captureToast, 120);

  // Changer la photo du projet p1 par l'interface
  await page.click('.tile[data-project-id="p1"]');
  await page.waitForSelector('#detail-screen', { timeout: 4000 });
  await page.waitForTimeout(400);
  await page.click('#project-menu-btn');
  await page.waitForSelector('#pmenu-photo-btn', { timeout: 3000 });
  await page.click('#pmenu-photo-btn');

  if (opts.afterClick) await opts.afterClick(page, server);
  await page.waitForTimeout(opts.waitMs || 2500);
  clearInterval(toastLoop);

  const result = {
    scenario: name,
    posts: server.posts.slice(t0).map(p => ({ n: p.n, status: p.status, ko: Math.round(p.bytes / 1024), nouvellePhoto: p.photo1 && p.photo1.includes('NOUVELLE') })),
    photoSurLeServeur: server.projects.projects[0].photo.url.includes('NOUVELLE') ? 'NOUVELLE' : 'ancienne',
    maxRequetesSimultanees: server.maxInflight,
    toasts, erreursJS: errors,
  };
  if (opts.after) result.extra = await opts.after(page, server, browser, context);
  await browser.close();
  return result;
}

module.exports = { scenario, makeState };

if (require.main === module) (async () => {
  const which = process.argv[2];

  if (which === 'conflit') {
    // (a) 2 conflits puis succès : converge sans perte, sans message.
    let c = 0;
    const a = await scenario('APRÈS — 409, 409, puis OK', 'app-apres.html', { waitMs: 3500, postStatus: () => (c++ < 2 ? 409 : 200) });
    console.log(JSON.stringify(a, null, 1));
    // (b) conflit PERMANENT : borné (pas de boucle infinie), photo gardée en attente pour plus tard.
    const b = await scenario('APRÈS — 409 permanent', 'app-apres.html', {
      waitMs: 16000, postStatus: () => 409,
      after: async (page, server) => ({ envoisTotal: server.posts.length, photoEnAttente: await page.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('dropit.pendingPhotos.')).length) }),
    });
    console.log(JSON.stringify({ scenario: b.scenario, envoisEn16s: b.posts.length, statuts: b.posts.map(p => p.status), toasts: b.toasts, extra: b.extra, erreursJS: b.erreursJS }, null, 1));
  }

  if (which === 'reprise') {
    // 2 échecs serveur (500) puis succès : relances automatiques 2 s puis 5 s, un seul message.
    let echecs = 0;
    const r = await scenario('APRÈS — 500, 500, puis OK', 'app-apres.html', { waitMs: 11000, postStatus: () => (echecs++ < 2 ? 500 : 200) });
    console.log(JSON.stringify(r, null, 1));
  }
  if (which === 'reseau') {
    // Réseau coupé (fetch rejette) puis événement "online" : reprise immédiate, sans attendre le délai.
    const mode = { coupe: true };
    const r = await scenario('APRÈS — réseau coupé puis retour', 'app-apres.html', {
      waitMs: 1200, postStatus: () => (mode.coupe ? 'abort' : 200),
      afterClick: async () => {},
      after: async (page, server) => {
        const avant = server.posts.length;
        mode.coupe = false;
        const t = Date.now();
        await page.evaluate(() => window.dispatchEvent(new Event('online')));
        await page.waitForTimeout(1500);
        return { tentativesAvantRetour: avant, apresRetour: server.posts.slice(avant).map(p => p.status), delaiReprise_ms: server.posts[avant] ? server.posts[avant].t - t : null, photoSurLeServeur: server.projects.projects[0].photo.url.includes('NOUVELLE') ? 'NOUVELLE' : 'ancienne' };
      },
    });
    console.log(JSON.stringify(r, null, 1));
  }
  if (which === 'rechargement') {
    // Panne longue : la photo reste en attente localement ; la page est rechargée ; le serveur
    // fonctionne de nouveau -> la photo doit être rejouée puis enregistrée.
    const mode = { panne: true };
    const r = await scenario('APRÈS — panne, rechargement, reprise', 'app-apres.html', {
      waitMs: 1500, postStatus: () => (mode.panne ? 500 : 200),
      after: async (page, server) => {
        const enAttente = await page.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('dropit.pendingPhotos.')).map(k => Object.keys(JSON.parse(localStorage.getItem(k)))));
        mode.panne = false;
        const avant = server.posts.length;
        await page.reload({ waitUntil: 'networkidle' });
        await page.waitForSelector('.tile', { timeout: 8000 });
        await page.waitForTimeout(2500);
        const restant = await page.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('dropit.pendingPhotos.')).length);
        const tuile = await page.evaluate(() => { const l = document.querySelector('.tile[data-project-id="p1"] .tile-photo'); return l && l.style.backgroundImage; });
        return { enAttenteAvantRechargement: enAttente, envoisApresRechargement: server.posts.slice(avant).map(p => p.status), photoSurLeServeur: server.projects.projects[0].photo.url.includes('NOUVELLE') ? 'NOUVELLE' : 'ancienne', enAttenteRestant: restant, photoAffichee: tuile };
      },
    });
    console.log(JSON.stringify(r, null, 1));
  }
  if (which === 'file') {
    // Une sauvegarde lente (800 ms) pendant que l'utilisateur continue d'éditer : jamais 2 requêtes
    // en même temps, et la dernière modification finit sur le serveur.
    for (const [nom, f] of [['AVANT', 'app-avant.html'], ['APRÈS', 'app-apres.html']]) {
      const r = await scenario(nom + ' — sauvegarde lente + éditions', f, {
        pad: 1200, waitMs: 4500, postDelayMs: 800,
        afterClick: async (page) => {
          await page.waitForTimeout(1300);           // la sauvegarde photo est en vol
          for (let i = 0; i < 3; i++) { await page.evaluate(() => { const b = document.querySelector('[data-toggle-item]'); if (b) b.click(); }); await page.waitForTimeout(450); }
        },
        after: async (page, server) => ({ tachesFaitesSurLeServeur: server.projects.projects[0].categories[0].items.filter(i => i.done).length, tachesFaitesEnLocal: await page.evaluate(() => null) }),
      });
      console.log(JSON.stringify(r, null, 1));
    }
  }
  if (which === 'gros') {
    // Compte de ~70 Ko : ancienne version vs nouvelle, aucune panne serveur simulée.
    for (const [nom, f] of [['AVANT', 'app-avant.html'], ['APRÈS', 'app-apres.html']]) {
      const r = await scenario(nom, f, { waitMs: 3000 });
      console.log(JSON.stringify(r, null, 1));
    }
  }
})();
