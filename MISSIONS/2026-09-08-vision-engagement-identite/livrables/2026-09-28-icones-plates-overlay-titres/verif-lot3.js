// Icônes plates + overlay des titres, dans un vrai navigateur (fetch réel, réponses simulées).
// Pexels est injoignable : les photos sont remplacées par des images de test générées à la volée
// (un ciel clair et un paysage sombre, pour vérifier l'overlay sur fond clair ET sombre).
const { chromium } = require('playwright');
const OUT = process.argv[2] || '.';

const proj = (id, title, emoji, items, photo, extra = {}) => ({
  id, title, emoji, summary: '', categories: [{ id: 'c' + id, title: 'Catégorie', items: Array.from({ length: items[0] }, (_, i) => ({ id: id + 'i' + i, title: 'Tâche ' + i, done: i < items[1], createdAt: '2026-01-01', notes: [] })) }],
  projectNotes: [], dueBucket: '1m', dueDate: '2026-10-20', photo: photo ? { url: 'https://images.pexels.com/' + photo + '.jpg', photographer: '', photographerUrl: '', pexelsId: 1, pageUrl: '', query: 'x', fetchedAt: '2026-09-01T00:00:00.000Z' } : null,
  createdAt: '2026-01-01', updatedAt: '2026-09-27', ...extra,
});
const TODAY = new Date().toISOString().slice(0, 10);
const DATA = () => ({ projects: [
  proj('p1', 'Vendre ma voiture', '🚗', [6, 2], null, { dueDate: TODAY }),
  proj('p2', 'Voyage au Japon', '✈️', [4, 3], 'clair', { dueDate: TODAY }),
  proj('p3', 'Reprendre le sport', '🏋️', [5, 1], 'sombre'),
  proj('p4', 'Rénover la cuisine', '🏠', [3, 0], null),
  proj('p5', 'Anniversaire de Julie', '🎂', [5, 4], 'sombre'),
  proj('p6', 'Apprendre la guitare', '🎸', [4, 1], 'clair'),
  proj('p7', 'Budget', '💰', [2, 1], null),
  proj('p8', 'Projet rare', '🧿', [3, 1], null),            // emoji sans équivalent -> l'IA choisit
  proj('p9', 'Chien', '🐕‍🦺', [3, 1], null),                // séquence ZWJ -> repli sur la base
], dropZone: [] });

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 420, height: 820 }, deviceScaleFactor: 2 });
  const errors = []; page.on('pageerror', e => errors.push(String(e)));
  // Deux « photos » de test générées par le navigateur lui-même
  const mk = async (css) => { const p = await browser.newPage({ viewport: { width: 900, height: 700 } }); await p.setContent(`<body style="margin:0"><div style="width:900px;height:700px;${css}"></div></body>`); const b = await p.screenshot({ type: 'jpeg', quality: 85 }); await p.close(); return b; };
  const clair = await mk('background:linear-gradient(180deg,#bfe3ff 0%,#eaf6ff 55%,#f7f1d8 100%)');
  const sombre = await mk('background:linear-gradient(180deg,#26334a 0%,#3d5a3b 60%,#1d2a1a 100%)');
  await page.route('https://images.pexels.com/**', r => r.fulfill({ status: 200, contentType: 'image/jpeg', body: r.request().url().includes('clair') ? clair : sombre }));
  const saved = { posts: [] };
  const server = { data: DATA(), updatedAt: '2026-09-28T10:00:00.000Z' };
  await page.route('**/api/projects', r => {
    if (r.request().method() === 'GET') return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: server.data, updatedAt: server.updatedAt }) });
    const b = JSON.parse(r.request().postData()); saved.posts.push(b.state); server.data = b.state; server.updatedAt = new Date().toISOString();
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, updatedAt: server.updatedAt }) });
  });
  const aiPrompts = [];
  await page.route('**/api/ai', r => {
    const prompt = JSON.parse(r.request().postData()).messages[0].content[0].text; aiPrompts.push(prompt);
    const answer = prompt.includes('Réponds UNIQUEMENT avec un objet JSON valide, sans texte autour : {"icon"') ? '{"icon":"cible"}' : '{"domain":"autre","subject":""}';
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: [{ type: 'text', text: answer }] }) });
  });
  await page.route('**/api/photos**', r => r.fulfill({ status: 404, contentType: 'application/json', body: '{"error":"no_results"}' }));
  await page.goto('http://localhost:8941/app-apres.html?v=' + Date.now(), { waitUntil: 'networkidle' });
  await page.waitForSelector('.tile', { timeout: 8000 });
  await page.waitForTimeout(1500);

  const out = {};
  // — Accueil
  out.accueil = await page.evaluate(() => {
    const tiles = [...document.querySelectorAll('.tile')];
    const emojiRe = /\p{Extended_Pictographic}/u;
    return {
      tuiles: tiles.length,
      icones: tiles.map(t => { const i = t.querySelector('.picon'); const cs = i && getComputedStyle(i); const r = i && i.getBoundingClientRect(); return { id: t.dataset.projectId, rond: !!i && cs.borderRadius === '50%', diametre: r && Math.round(r.width), fond: cs && cs.backgroundColor, svg: !!(i && i.querySelector('svg path')), texteDansIcone: i ? i.textContent.trim() : null }; }),
      emojiAffiche: tiles.some(t => emojiRe.test(t.textContent)),
      anciensEmoji: document.querySelectorAll('.tile-emoji').length,
    };
  });
  // Style des icônes de tuile : fond à 40 %, aucun contour ni ombre, glyphe à 58 %, diamètre proportionnel
  out.styleIconeTuile = await page.evaluate(() => [...document.querySelectorAll('.tile')].map(t => {
    const i = t.querySelector('.picon'), s = i.querySelector('svg'), cs = getComputedStyle(i), r = t.getBoundingClientRect();
    return { id: t.dataset.projectId, photo: t.classList.contains('has-photo'), tuile: Math.round(r.width) + 'x' + Math.round(r.height), diametre: Math.round(i.getBoundingClientRect().width),
      fond: cs.backgroundColor, contour: cs.borderTopWidth + '/' + cs.boxShadow, glyphe: Math.round(100 * s.getBoundingClientRect().width / i.getBoundingClientRect().width) + '%', remplissage: getComputedStyle(s).fill };
  }));
  out.overlay = await page.evaluate(() => {
    const t = document.querySelector('.tile.has-photo .tile-title'); const cs = getComputedStyle(t);
    return { fond: cs.backgroundColor, degrades: cs.backgroundImage === 'none' ? 0 : cs.backgroundImage.split('gradient').length - 1, rayon: cs.borderRadius, ombreTexte: cs.textShadow, paddingDroit: cs.paddingRight };
  });
  // Autres fenêtres : voir plus bas (style pâle + glyphe coloré gras)
  const styleAutre = (sel) => page.evaluate((sel) => { const i = document.querySelector(sel); if(!i) return null; const s = i.querySelector('svg'), cs = getComputedStyle(i), g = getComputedStyle(s);
    return { fond: cs.backgroundColor, glyphe: Math.round(100 * s.getBoundingClientRect().width / i.getBoundingClientRect().width) + '%', remplissage: g.fill, contour: g.stroke, epaisseurContour: g.strokeWidth }; }, sel);
  await page.screenshot({ path: OUT + '/lot3-accueil.png', clip: { x: 0, y: 0, width: 420, height: 470 } });

  // — rien de rogné : contenu de chaque tuile dans sa hauteur, icône entièrement dans la tuile
  out.debordements = (await page.evaluate(() => [...document.querySelectorAll('.tile')].map(t => {
    const b = t.querySelector('.tile-body'), i = t.querySelector('.picon').getBoundingClientRect(), r = t.getBoundingClientRect();
    return { id: t.dataset.projectId, cls: [...t.classList].filter(c => c.startsWith('size-')).join(''), w: Math.round(r.width), h: Math.round(r.height),
      contenuRogne: b.scrollHeight > b.clientHeight + 1, iconeHorsTuile: i.top < r.top - 0.5 || i.bottom > r.bottom + 0.5 || i.left < r.left - 0.5 || i.right > r.right + 0.5,
      barre: !!t.querySelector('.tile-progress') };
  }))).filter(x => x.contenuRogne || x.iconeHorsTuile);
  // — titres tronqués (« … ») : hauteur naturelle du texte > hauteur affichée
  out.titresTronques = await page.evaluate(() => [...document.querySelectorAll('.tile')].map(t => {
    const ti = t.querySelector('.tile-title'); const shown = ti.clientHeight;
    const prev = [ti.style.webkitLineClamp, ti.style.overflow, ti.style.display]; ti.style.webkitLineClamp = 'unset'; ti.style.overflow = 'visible'; ti.style.display = 'block';
    const natural = ti.scrollHeight; [ti.style.webkitLineClamp, ti.style.overflow, ti.style.display] = prev;
    return { id: t.dataset.projectId, titre: ti.textContent, police: getComputedStyle(ti).fontSize, lignes: ti.style.webkitLineClamp, tronque: natural > shown + 1 };
  }).filter(x => x.tronque));
  out.classes = await page.evaluate(() => [...document.querySelectorAll('.tile')].map(t => t.dataset.projectId + ':' + [...t.classList].filter(c => c.startsWith('size-')).join('') + ':' + Math.round(t.getBoundingClientRect().width) + 'x' + Math.round(t.getBoundingClientRect().height)));
  // — aucun mot de titre coupé en deux lignes (Range.getClientRects : un mot coupé occupe 2 rectangles)
  out.motsCoupes = await page.evaluate(() => {
    const res = [];
    document.querySelectorAll('.tile').forEach(t => {
      const ti = t.querySelector('.tile-title'); const node = ti.firstChild; if(!node) return;
      const txt = node.textContent; const re = /\S+/g; let m;
      while((m = re.exec(txt))){
        const r = document.createRange(); r.setStart(node, m.index); r.setEnd(node, m.index + m[0].length);
        const lines = new Set([...r.getClientRects()].map(x => Math.round(x.top)));
        if(lines.size > 1) res.push({ tuile: t.dataset.projectId, mot: m[0], police: getComputedStyle(ti).fontSize, tuileW: Math.round(t.getBoundingClientRect().width), zoneTexteW: Math.round(ti.clientWidth - parseFloat(getComputedStyle(ti).paddingLeft) - parseFloat(getComputedStyle(ti).paddingRight)) });
      }
    });
    return res;
  });
  // — icône rare : l'IA en choisit une, sauvegardée sur le projet
  await page.waitForTimeout(600);
  out.iconeRare = await page.evaluate(() => { const t = document.querySelector('.tile[data-project-id="p8"] .picon path'); return t ? t.getAttribute('d').slice(0, 24) : null; });
  const avecIcone = saved.posts.map(s => (s.projects.find(p => p.id === 'p8') || {}).icon).filter(Boolean);
  out.iconeRareSauvegardee = avecIcone.length ? avecIcone[avecIcone.length - 1] : null;
  out.promptIconeSansResume = aiPrompts.filter(p => p.includes('{"icon"')).every(p => /Projet : ".*" — emoji :/.test(p));

  // — Vue liste
  await page.click('.bottom-tabbar #tabbar-list'); await page.waitForSelector('#tasklist-screen'); await page.waitForTimeout(600);
  out.liste = await page.evaluate(() => ({ chips: document.querySelectorAll('.tl-proj-chip .picon').length, lignes: document.querySelectorAll('.tl-row .picon').length, emojiAffiche: /\p{Extended_Pictographic}/u.test(document.getElementById('tasklist-screen').textContent) }));
  out.styleListeLigne = await styleAutre('.tl-row .picon'); out.styleListeFiltre = await styleAutre('.tl-proj-chip .picon');
  await page.screenshot({ path: OUT + '/lot3-liste.png' });
  await page.click('#tasklist-screen #tabbar-home'); await page.waitForTimeout(500);

  // — Fenêtre projet
  await page.click('.tile[data-project-id="p2"]'); await page.waitForSelector('#detail-screen'); await page.waitForTimeout(600);
  out.fenetreProjet = await page.evaluate(() => { const i = document.querySelector('#detail-screen .detail-header .picon'); const r = i.getBoundingClientRect(); return { rond: getComputedStyle(i).borderRadius === '50%', diametre: Math.round(r.width) }; });
  out.styleFenetreProjet = await styleAutre('#detail-screen .detail-header .picon');
  await page.screenshot({ path: OUT + '/lot3-projet.png', clip: { x: 0, y: 0, width: 420, height: 330 } });
  await page.click('#detail-screen #tabbar-home'); await page.waitForTimeout(400);

  // — Calendrier
  await page.click('.bottom-tabbar #tabbar-cal'); await page.waitForSelector('#calendar-screen'); await page.waitForTimeout(600);
  out.calendrier = await page.evaluate(() => ({ glyphes: document.querySelectorAll('.cal-due-badge svg.pglyph, .cal-checkpoint-badge svg.pglyph').length, emojiAffiche: /\p{Extended_Pictographic}/u.test(document.getElementById('calendar-screen').textContent) }));
  await page.screenshot({ path: OUT + '/lot3-calendrier.png' });

  out.erreursJS = errors;
  console.log(JSON.stringify(out, null, 1));
  await browser.close();
})();
