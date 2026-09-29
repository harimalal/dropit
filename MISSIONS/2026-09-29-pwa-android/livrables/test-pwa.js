// Vérifie dans un vrai Chromium que le site est installable ET que le service worker ne met rien en cache.
// Usage (racine du dépôt) : NODE_PATH=$(npm root -g) node MISSIONS/2026-09-29-pwa-android/livrables/test-pwa.js
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const RACINE = process.cwd();
const PORT = 8952;
const BASE = 'http://localhost:' + PORT;
const MIME = { '.html': 'text/html; charset=utf-8', '.json': 'application/json', '.js': 'text/javascript', '.png': 'image/png', '.css': 'text/css' };
const hits = {};
const projet = (i) => ({ id: 'p' + i, title: 'Projet ' + i, emoji: '🚗', summary: '', icon: 'voiture',
  categories: [{ id: 'c' + i, title: 'Cat', items: [{ id: 'i' + i, title: 'Tâche ' + i, done: false, createdAt: '2026-01-01', notes: [] }] }],
  projectNotes: [], dueBucket: '1m', dueDate: null, photo: null, createdAt: '2026-01-01', updatedAt: '2026-01-01' });

// Imite Cloudflare Pages : /app sert app.html, /app.html redirige en 308 vers /app ; l'API est simulée ici.
const serveur = http.createServer((req, res) => {
  const url = new URL(req.url, BASE);
  hits[url.pathname] = (hits[url.pathname] || 0) + 1;
  if (url.pathname === '/app.html') { res.writeHead(308, { Location: '/app' }); return res.end(); }
  if (url.pathname === '/api/config') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ supabaseUrl: 'http://localhost:1', supabaseAnonKey: 'anon', providers: { google: true, apple: false } }));
  }
  const JSON_H = { 'Content-Type': 'application/json' };
  if (url.pathname === '/api/projects') {
    res.writeHead(200, JSON_H);
    return res.end(req.method === 'GET' ? JSON.stringify({ data: { projects: [projet(0), projet(1)], dropZone: [] }, updatedAt: '2026-09-29T10:00:00.000Z' }) : '{"ok":true,"updatedAt":"2026-09-29T10:00:01.000Z"}');
  }
  if (url.pathname === '/api/ai') { res.writeHead(200, JSON_H); return res.end('{"content":[{"type":"text","text":"{\\"domain\\":\\"autre\\",\\"subject\\":\\"\\"}"}]}'); }
  if (url.pathname.startsWith('/api/photos')) { res.writeHead(404, JSON_H); return res.end('{"error":"no_results"}'); }
  if (url.pathname.startsWith('/api/')) { res.writeHead(401, JSON_H); return res.end('{"error":"unauthorized"}'); }
  const rel = url.pathname === '/app' ? 'app.html' : decodeURIComponent(url.pathname).replace(/^\//, '');
  const fichier = path.join(RACINE, rel);
  if (!fichier.startsWith(RACINE) || !fs.existsSync(fichier) || fs.statSync(fichier).isDirectory()) { res.writeHead(404); return res.end('introuvable'); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(fichier)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
  fs.createReadStream(fichier).pipe(res);
});

const resultats = [];
const verifier = (nom, ok, detail) => { resultats.push({ nom, ok: !!ok, detail: detail || '' }); };
const dimensionsPng = (buf) => ({ sig: buf.slice(0, 8).toString('hex'), w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) });

(async () => {
  await new Promise(r => serveur.listen(PORT, r));
  // Profil persistant : un contexte Playwright ordinaire est de type navigation privée, où Chromium refuse toute installation.
  const ouvrir = (viewport) => chromium.launchPersistentContext(fs.mkdtempSync(path.join(os.tmpdir(), 'pwa-')), { executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'], viewport: viewport || null });

  // --- 1. Manifest et icônes (fichiers)
  const manifest = JSON.parse(fs.readFileSync(path.join(RACINE, 'manifest.json'), 'utf8'));
  for (const c of ['name', 'short_name', 'start_url', 'scope', 'display', 'icons', 'id']) verifier('manifest : champ ' + c, manifest[c] !== undefined);
  verifier('manifest : display standalone', manifest.display === 'standalone');
  verifier('manifest : start_url dans la portée', manifest.start_url.startsWith(manifest.scope));
  for (const ic of manifest.icons) {
    const f = path.join(RACINE, ic.src.replace(/^\//, ''));
    const ok = fs.existsSync(f);
    const d = ok ? dimensionsPng(fs.readFileSync(f)) : null;
    verifier('icône ' + ic.src + ' (' + ic.purpose + ')', ok && d.sig === '89504e470d0a1a0a' && (d.w + 'x' + d.h) === ic.sizes, ok ? d.w + 'x' + d.h : 'absente');
  }
  verifier('manifest : icône 512 « any » présente', manifest.icons.some(i => i.sizes === '512x512' && i.purpose === 'any'));
  verifier('manifest : icône 512 « maskable » présente', manifest.icons.some(i => i.sizes === '512x512' && i.purpose === 'maskable'));
  const enTetes = fs.readFileSync(path.join(RACINE, '_headers'), 'utf8');
  verifier('_headers : sw.js sans cache périmé', /\/sw\.js\s*\n\s*Cache-Control:\s*no-cache/.test(enTetes));

  // --- 2. Chargement de /app, erreurs JS, installabilité
  const ctx = await ouvrir({ width: 420, height: 820 });
  const page = await ctx.newPage();
  const erreurs = []; page.on('pageerror', e => erreurs.push(String(e)));
  await page.goto(BASE + '/app', { waitUntil: 'networkidle' });
  await page.waitForSelector('.auth-screen, .auth-box', { timeout: 8000 }).catch(() => {});
  verifier('app : écran de connexion affiché', await page.$('.auth-screen, .auth-box'));
  verifier('app : aucune erreur JS au chargement', erreurs.length === 0, erreurs.join(' | '));
  verifier('app : lien manifest déclaré', await page.$('link[rel="manifest"][href="/manifest.json"]'));
  verifier('app : theme-color déclaré', await page.$('meta[name="theme-color"]'));
  verifier('app : apple-touch-icon déclaré', await page.$('link[rel="apple-touch-icon"]'));

  const cdp = await ctx.newCDPSession(page);
  await page.waitForFunction(() => navigator.serviceWorker.controller || true);
  await page.evaluate(() => navigator.serviceWorker.ready);
  const manifestCdp = await cdp.send('Page.getAppManifest');
  verifier('Chromium : manifest lu sans erreur', (manifestCdp.errors || []).length === 0, JSON.stringify(manifestCdp.errors || []));
  const inst = await cdp.send('Page.getInstallabilityErrors');
  verifier('Chromium : installable (aucune erreur)', (inst.installabilityErrors || []).length === 0, JSON.stringify(inst.installabilityErrors || []));

  // --- 3. Le service worker est actif et ne met rien en cache
  const sw = await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.getRegistration();
    return { actif: !!(reg && reg.active), portee: reg && reg.scope, caches: await caches.keys() };
  });
  verifier('service worker actif', sw.actif, sw.portee);
  verifier('aucun cache créé', sw.caches.length === 0, JSON.stringify(sw.caches));

  await page.reload({ waitUntil: 'networkidle' });
  const controle = await page.evaluate(() => !!navigator.serviceWorker.controller);
  verifier('page contrôlée par le worker après rechargement', controle);
  const avant = { app: hits['/app'], config: hits['/api/config'] };
  await page.reload({ waitUntil: 'networkidle' });
  verifier('app.html rechargé depuis le réseau à chaque fois (pas servi par le worker)', hits['/app'] > avant.app, avant.app + ' -> ' + hits['/app']);
  verifier('/api/config atteint le réseau à chaque chargement', hits['/api/config'] > avant.config, avant.config + ' -> ' + hits['/api/config']);
  const cachesApres = await page.evaluate(() => caches.keys());
  verifier('toujours aucun cache après plusieurs chargements', cachesApres.length === 0);

  // --- 4. Hors connexion : page lisible, puis retour à la normale.
  // On arrête réellement le serveur : setOffline de Playwright coupe le réseau des pages mais pas celui du service worker.
  serveur.closeAllConnections(); await new Promise(r => serveur.close(r));
  const repHors = await page.goto(BASE + '/app', { waitUntil: 'domcontentloaded' }).catch(e => ({ erreur: String(e) }));
  const texteHors = await page.evaluate(() => document.body.innerText).catch(() => '');
  verifier('hors connexion : page « Pas de connexion » affichée', /Pas de connexion/.test(texteHors) && /Réessayer/.test(texteHors), (texteHors || '').slice(0, 60));
  verifier('hors connexion : statut 503 (jamais une copie périmée de l\'app)', repHors && repHors.status && repHors.status() === 503, repHors && repHors.status ? String(repHors.status()) : JSON.stringify(repHors));
  const cachesHors = await page.evaluate(() => caches.keys());
  verifier('hors connexion : toujours aucun cache', cachesHors.length === 0);
  await new Promise(r => serveur.listen(PORT, r));
  await page.goto(BASE + '/app', { waitUntil: 'networkidle' });
  await page.waitForSelector('.auth-screen, .auth-box', { timeout: 8000 }).catch(() => {});
  verifier('retour du réseau : l\'app se recharge normalement', await page.$('.auth-screen, .auth-box'));

  // --- 5. Purge d'un ancien cache (l'ancienne piste PWA en créait un)
  const ctx2 = await ouvrir();
  const p2 = await ctx2.newPage();
  await p2.goto(BASE + '/manifest.json');
  await p2.evaluate(async () => { const c = await caches.open('dropit-shell-v1'); await c.put('/app.html', new Response('VIEUX')); });
  await p2.goto(BASE + '/app', { waitUntil: 'networkidle' });
  await p2.evaluate(() => navigator.serviceWorker.ready);
  await p2.waitForTimeout(500);
  const restants = await p2.evaluate(() => caches.keys());
  verifier('ancien cache dropit-shell-v1 purgé à l\'activation', restants.length === 0, JSON.stringify(restants));

  // --- 6. Parcours connecté, service worker actif : l'app complète fonctionne
  const ctx3 = await ouvrir({ width: 420, height: 820 });
  await ctx3.addInitScript(() => {
    localStorage.setItem('dropit-session', JSON.stringify({ access_token: 't', refresh_token: 'r', expires_at: Date.now() + 3600e3, user: { id: 'u1', email: 'test@example.com' } }));
  });
  const p3 = await ctx3.newPage();
  const err3 = []; p3.on('pageerror', e => err3.push(String(e)));
  await p3.goto(BASE + '/app', { waitUntil: 'networkidle' });
  await p3.evaluate(() => navigator.serviceWorker.ready);
  await p3.reload({ waitUntil: 'networkidle' });
  const sous = await p3.evaluate(() => !!navigator.serviceWorker.controller);
  verifier('connecté : page contrôlée par le worker', sous);
  await p3.waitForSelector('.tile', { timeout: 8000 }).catch(() => {});
  const nTuiles = await p3.$$eval('.tile', els => els.length).catch(() => 0);
  verifier('connecté : les 2 projets s\'affichent en tuiles', nTuiles === 2, String(nTuiles));
  await p3.click('.tile[data-project-id="p0"]').catch(() => {});
  await p3.waitForSelector('#detail-screen', { timeout: 5000 }).catch(() => {});
  verifier('connecté : le détail d\'un projet s\'ouvre', await p3.$('#detail-screen'));
  verifier('connecté : aucune erreur JS', err3.length === 0, err3.join(' | '));
  verifier('connecté : toujours aucun cache', (await p3.evaluate(() => caches.keys())).length === 0);
  await ctx3.close();

  await ctx.close(); await ctx2.close();
  serveur.close();

  const echecs = resultats.filter(r => !r.ok);
  for (const r of resultats) console.log((r.ok ? 'OK    ' : 'ECHEC ') + r.nom + (r.detail && !r.ok ? '  [' + r.detail + ']' : ''));
  console.log('\n' + (resultats.length - echecs.length) + '/' + resultats.length + ' vérifications réussies');
  process.exit(echecs.length ? 1 : 0);
})().catch(e => { console.error(e); serveur.close(); process.exit(2); });
