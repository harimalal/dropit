// R-01 : que devient le compte quand le chargement échoue ? Vrai serveur, vraie base simulée.
// usage : node r01-check.js <fichier app>
const { chromium } = require('playwright');
const APP = process.argv[2];
const projet = (id, t) => ({ id, title: t, emoji: '🚗', summary: '', icon: 'voiture', dueBucket: '1m', dueDate: null, photo: null,
  categories: [{ id: 'c' + id, title: 'Étapes', items: [0, 1].map(i => ({ id: id + 't' + i, title: 'Tâche ' + i, done: false, createdAt: '2026-01-01', notes: [] })) }],
  projectNotes: [], createdAt: '2026-01-01', updatedAt: '2026-01-01' });
(async () => {
  const { demarrerServeurReel } = await import('./serveur-reel.mjs');
  const res = [];
  for (const [nom, panne] of [['GET en 429 (limite de débit)', 429], ['GET en 500', 500], ['réseau coupé', 'abort']]) {
    const serveur = await demarrerServeurReel({ racine: process.env.RACINE });
    const VRAI = { projects: [projet('px', 'Mon vrai projet X'), projet('py', 'Mon vrai projet Y')], dropZone: [{ id: 'd', title: 'ma vraie idée' }] };
    await serveur.semer(VRAI);
    const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
    const page = await (await browser.newContext({ viewport: { width: 420, height: 820 } })).newPage();
    const erreurs = []; page.on('pageerror', e => erreurs.push(String(e)));
    let getsEnPanne = 1, posts = 0;      // une seule panne ; la reprise automatique est à 2 s, on observe avant
    await page.route('**/api/projects', async route => {
      const req = route.request();
      if (req.method() === 'GET' && getsEnPanne > 0) {
        getsEnPanne--;
        if (panne === 'abort') return route.abort('internetdisconnected');
        return route.fulfill({ status: panne, contentType: 'application/json', body: JSON.stringify({ error: 'panne simulée' }) });
      }
      if (req.method() === 'POST') posts++;
      const r = await serveur.appeler(req.method(), req.postData() === null ? undefined : req.postData());
      route.fulfill({ status: r.statut, contentType: 'application/json', body: r.texte });
    });
    await page.route('**/api/ai', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: [{ type: 'text', text: '{"domain":"autre","subject":""}' }] }) }));
    await page.route('**/api/photos**', r => r.fulfill({ status: 404, contentType: 'application/json', body: '{"error":"no_results"}' }));
    await page.goto('http://localhost:8941/' + APP + '?v=' + Date.now(), { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);
    const titres = () => ((serveur.db.ligne || {}).data || {}).projects.map(p => p.title);
    const tuilesVisibles = () => page.evaluate(() => [...document.querySelectorAll('.tile .tile-title')].map(t => t.textContent.trim()));
    const apresPanne = { titresEnBase: titres(), envoisPost: posts, tuilesVisibles: await tuilesVisibles(),
      ecranAffiche: await page.evaluate(() => ({ bouton: !!document.getElementById('load-retry-btn'), titre: (document.querySelector('.load-error h1') || {}).textContent || null })) };
    await page.screenshot({ path: 'r01-ecran-erreur.png' });
    // le serveur revient : un « Réessayer » (ou la reprise automatique) doit charger les vrais projets
    await page.evaluate(() => { const b = document.getElementById('load-retry-btn'); if (b) b.click(); });
    await page.waitForTimeout(2500);
    const apresReprise = { tuiles: await tuilesVisibles(), postsTotal: posts };
    res.push({ nom, apresPanne, apresReprise, comptePerdu: !titres().includes('Mon vrai projet X'), erreursJS: erreurs });
    await browser.close(); serveur.arreter();
  }
  console.log(JSON.stringify(res, null, 1));
})();
