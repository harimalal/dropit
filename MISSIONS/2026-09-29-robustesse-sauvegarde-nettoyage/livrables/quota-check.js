// Vérifie dans un vrai navigateur les nouveaux comportements de sauvegarde (fetch réel,
// réponses simulées) : bandeau persistant sur refus définitif, motifs de refus, alerte de
// taille, non-réémission d'un état identique, garde-fou de création.
const { chromium } = require('playwright');

const gros = (i, noteLen) => ({ id: 'g' + i, title: 'Projet lourd ' + i, emoji: '🚗', summary: 'x'.repeat(200), icon: 'voiture',
  categories: [{ id: 'gc' + i, title: 'Cat', items: Array.from({ length: 10 }, (_, j) => ({ id: 'gi' + i + '_' + j, title: 'Tâche ' + j, done: false, createdAt: '2026-01-01', notes: [{ id: 'n' + j, text: 'y'.repeat(noteLen), createdAt: '2026-01-01' }] })) }],
  projectNotes: [{ id: 'pn' + i, title: 'Note', body: 'z'.repeat(noteLen * 4), catId: null, createdAt: '2026-01-01' }],
  dueBucket: '1m', dueDate: null, photo: null, createdAt: '2026-01-01', updatedAt: '2026-01-01' });

const proj = (i) => ({ id: 'p' + i, title: 'Projet ' + i, emoji: '🚗', summary: '', icon: 'voiture',
  categories: [{ id: 'c' + i, title: 'Cat', items: [{ id: 'i' + i, title: 'Tâche', done: false, createdAt: '2026-01-01', notes: [] }] }],
  projectNotes: [], dueBucket: '1m', dueDate: null, photo: null, createdAt: '2026-01-01', updatedAt: '2026-01-01' });

async function run(nom, { nProjets = 3, reponse, apres, lourds = 0, noteLen = 900 }) {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 420, height: 820 } });
  const errors = []; page.on('pageerror', e => errors.push(String(e)));
  const posts = [];
  const server = { data: { projects: lourds ? Array.from({ length: lourds }, (_, i) => gros(i, noteLen)) : Array.from({ length: nProjets }, (_, i) => proj(i)), dropZone: [] }, updatedAt: '2026-09-29T10:00:00.000Z' };
  await page.route('**/api/projects', async r => {
    if (r.request().method() === 'GET') return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: server.data, updatedAt: server.updatedAt }) });
    const body = JSON.parse(r.request().postData());
    posts.push({ n: posts.length + 1, octets: r.request().postData().length, projets: body.state.projects.length });
    const rep = reponse ? reponse(posts.length) : null;
    if (rep) return r.fulfill({ status: rep.status, contentType: 'application/json', body: JSON.stringify(rep.body) });
    server.data = body.state; server.updatedAt = new Date().toISOString();
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, updatedAt: server.updatedAt }) });
  });
  await page.route('**/api/ai', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: [{ type: 'text', text: '{"domain":"autre","subject":""}' }] }) }));
  await page.route('**/api/photos**', r => r.fulfill({ status: 404, contentType: 'application/json', body: '{"error":"no_results"}' }));
  // #toast vit dans #app, que render() reconstruit entierement : observer l'element lui-meme
  // ne survit pas au premier rendu. On observe donc le document, et on relit le texte a chaque
  // mutation. Installe avant tout script de la page pour capter aussi le chargement initial.
  await page.addInitScript(() => {
    window.__toasts = [];
    // documentElement n'existe pas encore quand ce script s'execute : on attend qu'il apparaisse.
    const poser = () => {
      if (!document.documentElement) return setTimeout(poser, 5);
      new MutationObserver(() => {
        const el = document.getElementById('toast');
        if (!el) return;
        const t = el.textContent;
        if (t && window.__toasts[window.__toasts.length - 1] !== t) window.__toasts.push(t);
      }).observe(document.documentElement, { childList: true, characterData: true, subtree: true });
    };
    poser();
  });
  await page.goto('http://localhost:8941/app-apres.html?v=' + Date.now(), { waitUntil: 'networkidle' });
  await page.waitForSelector('.tile', { timeout: 8000 });
  await page.waitForTimeout(800);

  const toasts = await page.evaluate(() => window.__toasts || []);
  const out = await apres(page, posts, toasts);
  const toastsFinaux = await page.evaluate(() => window.__toasts || []);
  const banner = await page.evaluate(() => { const b = document.getElementById('save-banner'); return b ? { texte: b.textContent, position: getComputedStyle(b).position } : null; });
  await browser.close();
  return { nom, ...out, bandeau: banner, toasts: toastsFinaux, erreursJS: errors };
}

const cocher = async (page) => { await page.click('.tile[data-project-id="p0"]'); await page.waitForSelector('#detail-screen'); await page.waitForTimeout(300);
  await page.click('#detail-screen .item-check, #detail-screen .tl-check, #detail-screen [data-toggle-item]').catch(() => {}); await page.waitForTimeout(900); };

(async () => {
  const res = [];

  // 1. 413 : bandeau persistant, message de taille, et il SURVIT à un nouveau rendu
  res.push(await run('413 -> bandeau persistant', {
    reponse: () => ({ status: 413, body: { error: 'too_large', limit: 2097152 } }),
    apres: async (page, posts) => {
      await cocher(page);
      const avant = await page.evaluate(() => !!document.getElementById('save-banner'));
      await page.click('#detail-screen #tabbar-home').catch(() => {}); await page.waitForTimeout(600);
      const apresRendu = await page.evaluate(() => !!document.getElementById('save-banner'));
      return { requetes: posts.length, bandeauAvantRendu: avant, bandeauApresRendu: apresRendu };
    } }));

  // 2. 400 too_many_projects : message dédié
  res.push(await run('400 trop de projets -> message dedie', {
    reponse: () => ({ status: 400, body: { error: 'too_many_projects', limit: 50 } }),
    apres: async (page, posts) => { await cocher(page); return { requetes: posts.length }; } }));

  // 3. Etat identique : aucune requete reemise
  res.push(await run('etat identique -> aucune requete', {
    apres: async (page, posts) => {
      await cocher(page);                       // une vraie modif -> 1 requete
      const apresModif = posts.length;
      await page.evaluate(() => { window.__persist && window.__persist(); });
      // on force plusieurs persist() sans rien changer, via des rendus/navigations
      for (let i = 0; i < 3; i++) { await page.click('#detail-screen #tabbar-home').catch(() => {}); await page.waitForTimeout(250); await page.click('.tile[data-project-id="p1"]').catch(() => {}); await page.waitForTimeout(250); }
      await page.waitForTimeout(900);
      return { requetesApresModif: apresModif, requetesTotal: posts.length };
    } }));

  // 4. Reprise apres refus : le bandeau se leve au succes
  let n = 0;
  res.push(await run('refus puis succes -> bandeau leve', {
    reponse: () => { n++; return n === 1 ? { status: 413, body: { error: 'too_large' } } : null; },
    apres: async (page, posts) => {
      await cocher(page);
      const pendant = await page.evaluate(() => !!document.getElementById('save-banner'));
      await page.click('#detail-screen .item-check, #detail-screen [data-toggle-item]').catch(() => {});
      await page.waitForTimeout(1200);
      const apres = await page.evaluate(() => !!document.getElementById('save-banner'));
      return { bandeauPendantRefus: pendant, bandeauApresSucces: apres, requetes: posts.length };
    } }));

  // 5. Garde-fou de creation a 50 projets
  res.push(await run('50 projets -> creation refusee avant l IA', {
    nProjets: 50,
    apres: async (page, posts, toasts) => {
      const avantIA = [];
      page.on('request', r => { if (r.url().includes('/api/ai')) avantIA.push(1); });
      await page.fill('#compose-text-input', 'Nouveau projet test');
      await page.click('#compose-send-btn');
      await page.waitForTimeout(1500);
      const nb = await page.evaluate(() => document.querySelectorAll('.tile').length);
      return { tuiles: nb, appelsIA: avantIA.length, toastLimite: (await page.evaluate(() => window.__toasts)).some(t => /Limite de 50/.test(t)) };
    } }));

  // 6. Alerte de taille a 70 % du plafond (1,47 Mo), une seule fois
  res.push(await run('taille > 70 % -> alerte une seule fois', {
    lourds: 48, noteLen: 2400,
    apres: async (page, posts, toasts) => {
      await page.click('.tile'); await page.waitForSelector('#detail-screen'); await page.waitForTimeout(300);
      await page.click('#detail-screen .item-check, #detail-screen [data-toggle-item]').catch(() => {}); await page.waitForTimeout(900);
      const octets1 = posts.length ? posts[0].octets : 0;
      const alertes1 = (await page.evaluate(() => window.__toasts)).filter(t => /beaucoup de place/.test(t)).length;
      await page.click('#detail-screen .item-check, #detail-screen [data-toggle-item]').catch(() => {}); await page.waitForTimeout(900);
      return { octetsEnvoyes: octets1, pctDuPlafond: Math.round(100 * octets1 / (2 * 1024 * 1024)) + ' %',
               alertesApres1Modif: alertes1, alertesApres2Modifs: (await page.evaluate(() => window.__toasts)).filter(t => /beaucoup de place/.test(t)).length };
    } }));

  console.log(JSON.stringify(res, null, 1));
})();
