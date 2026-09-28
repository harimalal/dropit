// Vérifie, dans un vrai navigateur, ce que l'app envoie à l'IA et à Pexels (fetch réel, réponses
// simulées par page.route) : le prompt de classification (titre + icône seulement), la requête
// photo (sujet, jamais le titre français ni le résumé), l'exclusion des photos déjà vues, la
// mémoire des « aucune photo », et le repli sur l'icône.
const { chromium } = require('playwright');

const projects = () => ({ projects: [
  { id: 'p1', title: 'Vendre ma voiture', emoji: '🚗', summary: 'SECRETSUMMARY-A préparer les papiers', categories: [{ id: 'c1', title: 'c', items: [{ id: 'i1', title: 't', done: false, createdAt: '2026-01-01', notes: [] }] }], projectNotes: [], dueBucket: '1m', dueDate: null, photo: null, createdAt: '2026-01-01', updatedAt: '2026-01-01' },
  { id: 'p2', title: 'Voyage au Japon', emoji: '✈️', summary: 'SECRETSUMMARY-B réserver les vols', categories: [{ id: 'c2', title: 'c', items: [{ id: 'i2', title: 't', done: false, createdAt: '2026-01-01', notes: [] }] }], projectNotes: [], dueBucket: '1m', dueDate: null, photo: null, createdAt: '2026-01-01', updatedAt: '2026-01-01' },
], dropZone: [] });

async function run(name, cfg) {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 420, height: 820 } });
  const page = await ctx.newPage();
  const errors = []; page.on('pageerror', e => errors.push(String(e)));
  const log = { ai: [], photos: [] };
  let nextId = 100;
  const server = { data: projects(), updatedAt: '2026-09-28T10:00:00.000Z' };
  await page.route('**/api/projects', r => {
    if (r.request().method() === 'GET') return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: server.data, updatedAt: server.updatedAt }) });
    const b = JSON.parse(r.request().postData()); server.data = b.state; server.updatedAt = new Date().toISOString();
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, updatedAt: server.updatedAt }) });
  });
  await page.route('**/api/ai', r => {
    const prompt = JSON.parse(r.request().postData()).messages[0].content[0].text;
    log.ai.push(prompt);
    const answer = cfg.ai(prompt);
    if (typeof answer === 'number') return r.fulfill({ status: answer, contentType: 'application/json', body: '{"error":"x"}' });
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: [{ type: 'text', text: answer }] }) });
  });
  await page.route('**/api/photos**', r => {
    const u = new URL(r.request().url());
    const q = u.searchParams.get('q'), exclude = u.searchParams.get('exclude');
    log.photos.push({ q, exclude });
    if (cfg.photos404) return r.fulfill({ status: 404, contentType: 'application/json', body: '{"error":"no_results"}' });
    const id = nextId++;
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ url: 'https://images.pexels.com/p' + id + '.jpg', photographer: '', photographerUrl: '', pexelsId: id, pageUrl: '' }) });
  });
  await page.goto('http://localhost:8941/app-apres.html?v=' + Date.now(), { waitUntil: 'networkidle' });
  await page.waitForSelector('.tile', { timeout: 8000 });
  await page.waitForTimeout(1200);
  const out = { scenario: name, aiAuChargement: log.ai.length, photosAuChargement: log.photos.map(p => p.q), erreursJS: errors };
  if (cfg.after) out.extra = await cfg.after(page, log, ctx, server);
  await browser.close();
  return { out, log };
}

// Le prompt cite des exemples (dont ces deux titres) : on lit le VRAI projet sur sa première ligne.
const projetDuPrompt = (prompt) => (/^Projet : "(.*)" — icône/.exec(prompt) || [])[1];
const answers = (prompt) => {
  const titre = projetDuPrompt(prompt);
  if (titre === 'Vendre ma voiture') return '{"domain":"business","subject":"Car"}';
  if (titre === 'Voyage au Japon') return '{"domain":"voyage","subject":""}';
  return '{}';
};

(async () => {
  const which = process.argv[2];
  if (which === 'requete') {
    const { out, log } = await run('rattrapage : requêtes et prompts', { ai: answers });
    const promptP1 = log.ai.find(p => projetDuPrompt(p) === 'Vendre ma voiture');
    out.prompt = {
      contientTitre: promptP1.includes('Vendre ma voiture'), contientIcone: promptP1.includes('🚗'),
      contientLeResume: log.ai.some(p => p.includes('SECRETSUMMARY')),
      premiereLigne: promptP1.split('\n')[0],
    };
    out.verdict = {
      voiture_sujet_seul: out.photosAuChargement.includes('car'),
      japon_repli_domaine_car_sujet_vide: out.photosAuChargement.includes('travel vacation landscape scenic'),
      aucun_titre_francais: !out.photosAuChargement.some(q => /voiture|voyage|japon/i.test(q)),
    };
    console.log(JSON.stringify(out, null, 1));
  }
  if (which === 'exclure') {
    const { out } = await run('« Changer la photo » deux fois : exclusion des photos vues', {
      ai: answers,
      after: async (page, log) => {
        const avant = log.photos.length;
        for (let i = 0; i < 2; i++) {
          await page.click('.tile[data-project-id="p1"]'); await page.waitForSelector('#detail-screen'); await page.waitForTimeout(400);
          await page.click('#project-menu-btn'); await page.waitForSelector('#pmenu-photo-btn'); await page.click('#pmenu-photo-btn');
          await page.waitForTimeout(1200);
          await page.click('#detail-screen #tabbar-home'); await page.waitForTimeout(500);
        }
        return { requetes: log.photos.slice(avant) };
      },
    });
    console.log(JSON.stringify(out, null, 1));
  }
  if (which === 'ia-indisponible') {
    const { out } = await run('IA en 429 : aucune photo posée sur une requête pauvre', { ai: () => 429 });
    console.log(JSON.stringify(out, null, 1));
  }
  if (which === 'repli-icone') {
    const { out } = await run('classification sans sujet ni domaine : repli sur l\'icône', { ai: () => '{"domain":"autre","subject":""}' });
    console.log(JSON.stringify(out, null, 1));
  }
  if (which === 'aucune-photo') {
    const { out } = await run('aucune photo convenable (404) : mémorisé, pas de nouvel appel au rechargement', {
      ai: answers, photos404: true,
      after: async (page, log) => {
        const misses = await page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k => k.startsWith('dropit.photoMiss.'))) || '{}')));
        const aiAvant = log.ai.length, phAvant = log.photos.length;
        await page.reload({ waitUntil: 'networkidle' }); await page.waitForSelector('.tile'); await page.waitForTimeout(1200);
        return { projetsMemorises: misses, appelsIAApresRechargement: log.ai.length - aiAvant, appelsPexelsApresRechargement: log.photos.length - phAvant };
      },
    });
    console.log(JSON.stringify(out, null, 1));
  }
})();
