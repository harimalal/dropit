// Deux appareils (deux navigateurs), un seul compte, le VRAI code serveur derrière une fausse base.
// usage : NODE_PATH=$(npm root -g) node e2e-deux-appareils.js <fichier app> [scénario]
// <fichier app> : fixture servie sur http://localhost:8941/ (voir mkfixture2.js). Scénarios :
//   autre-projet  : chaque appareil modifie un projet DIFFÉRENT   -> aucune modification ne doit se perdre
//   meme-projet   : les deux modifient le MÊME projet             -> aucune perte silencieuse
//   suppression   : A supprime un projet que B a modifié          -> la modification de B est conservée
const { chromium } = require('playwright');
const path = require('path');

const RACINE = process.env.RACINE || process.cwd();
const APP = process.argv[2] || 'app-apres.html';
const SCENARIO = process.argv[3] || 'tous';

const projet = (id, titre) => ({ id, title: titre, emoji: '🚗', summary: '', icon: 'voiture', dueBucket: '1m', dueDate: null, photo: null,
  categories: [{ id: 'c' + id, title: 'Étapes', items: [0, 1, 2].map(i => ({ id: id + 't' + i, title: 'Tâche ' + i, done: false, createdAt: '2026-01-01', notes: [] })) }],
  projectNotes: [], createdAt: '2026-01-01', updatedAt: '2026-01-01' });
const donnees = () => ({ projects: [projet('px', 'Projet X'), projet('py', 'Projet Y'), projet('pz', 'Projet Z')], dropZone: [] });

async function appareil(browser, serveur, nom) {
  const page = await (await browser.newContext({ viewport: { width: 420, height: 820 } })).newPage();
  page.nom = nom; page.erreurs = []; page.toasts = [];
  page.on('pageerror', e => page.erreurs.push(String(e)));
  await page.addInitScript(() => { window.__t = []; const poser = () => { if (!document.documentElement) return setTimeout(poser, 5);
    new MutationObserver(() => { const el = document.getElementById('toast'); if (el && el.textContent && window.__t[window.__t.length - 1] !== el.textContent) window.__t.push(el.textContent); })
      .observe(document.documentElement, { childList: true, characterData: true, subtree: true }); }; poser(); });
  page.requetes = [];
  await page.route('**/api/projects', async route => {
    const req = route.request(), corps = req.postData();
    const r = await serveur.appeler(req.method(), corps === null ? undefined : corps);
    page.requetes.push({ methode: req.method(), statut: r.statut, octets: corps ? corps.length : 0, forme: corps ? (JSON.parse(corps).upserts ? 'delta' : 'complet') : '-' });
    route.fulfill({ status: r.statut, contentType: 'application/json', body: r.texte });
  });
  await page.route('**/api/ai', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: [{ type: 'text', text: '{"domain":"autre","subject":""}' }] }) }));
  await page.route('**/api/photos**', r => r.fulfill({ status: 404, contentType: 'application/json', body: '{"error":"no_results"}' }));
  await page.goto('http://localhost:8941/' + APP + '?v=' + Date.now(), { waitUntil: 'networkidle' });
  await page.waitForSelector('.tile'); await page.waitForTimeout(500);
  return page;
}
const cocher = async (page, id, i) => {
  await page.click('.tile[data-project-id="' + id + '"]'); await page.waitForSelector('#detail-screen'); await page.waitForTimeout(300);
  await page.locator('#detail-screen [data-toggle-item]').nth(i).click(); await page.waitForTimeout(1300);
};
const retour = async (page) => { await page.click('#detail-screen #tabbar-home').catch(() => {}); await page.waitForTimeout(400); };
const supprimer = async (page, id) => {
  await page.click('.tile[data-project-id="' + id + '"]'); await page.waitForSelector('#detail-screen'); await page.waitForTimeout(300);
  page.once('dialog', d => d.accept());
  await page.click('#project-menu-btn'); await page.waitForSelector('#pmenu-delete-btn, [id*="delete"]'); await page.click('#pmenu-delete-btn').catch(async () => { await page.click('[id*="delete"]'); });
  await page.waitForTimeout(1300);
};
const faites = (serveur, id) => { const p = ((serveur.db.ligne || {}).data || {}).projects || []; const x = p.find(q => q.id === id); return x ? x.categories.flatMap(c => c.items).map(t => t.done ? 1 : 0).join('') : 'ABSENT'; };
const titres = (serveur) => (((serveur.db.ligne || {}).data || {}).projects || []).map(p => p.title);
const toasts = async (page) => page.evaluate(() => window.__t);

async function lancer(nom, corps) {
  const { demarrerServeurReel } = await import('./serveur-reel.mjs');
  const serveur = await demarrerServeurReel({ racine: RACINE });
  await serveur.semer(donnees());
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const A = await appareil(browser, serveur, 'A'), B = await appareil(browser, serveur, 'B');
  let res;
  try { res = await corps(serveur, A, B); } finally { await browser.close(); serveur.arreter(); }
  res.erreursJS = [...A.erreurs, ...B.erreurs];
  return { nom, ...res };
}

(async () => {
  const sorties = [];
  if (SCENARIO === 'tous' || SCENARIO === 'autre-projet') sorties.push(await lancer('autre-projet', async (s, A, B) => {
    await cocher(B, 'py', 0); await retour(B);          // B modifie Y et sauvegarde
    await cocher(A, 'px', 0); await retour(A);          // A (périmé) modifie X
    const perte = faites(s, 'py') !== '100';
    return { serveur: { X: faites(s, 'px'), Y: faites(s, 'py'), Z: faites(s, 'pz') }, attendu: { X: '100', Y: '100', Z: '000' },
             modificationsPerdues: perte, requetesA: A.requetes.map(r => r.forme + ':' + r.statut).join(' '), requetesB: B.requetes.map(r => r.forme + ':' + r.statut).join(' ') };
  }));
  if (SCENARIO === 'tous' || SCENARIO === 'meme-projet') sorties.push(await lancer('meme-projet', async (s, A, B) => {
    await cocher(B, 'px', 0); await retour(B);          // B coche la tâche 0 de X
    await cocher(A, 'px', 1); await retour(A);          // A (périmé) coche la tâche 1 de X
    const t = titres(s);
    return { serveur: { X: faites(s, 'px'), titres: t }, tachesDeBConservees: faites(s, 'px')[0] === '1' || t.some(x => /copie locale/.test(x)),
             copieLocale: t.filter(x => /copie locale/.test(x)).length, toastsA: await toasts(A), requetesA: A.requetes.map(r => r.forme + ':' + r.statut).join(' ') };
  }));
  console.log(JSON.stringify(sorties, null, 1));
})();
