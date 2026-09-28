// Teste la sélection de photo (functions/api/photos.js) sur des résultats Pexels simulés.
// usage (depuis la racine du dépôt) : node MISSIONS/.../test-pickphoto.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const src = fs.readFileSync('functions/api/photos.js', 'utf8')
  .replace(/import .*auth\.js";/, 'const json=()=>{},requireUser=()=>{},enforceRateLimit=()=>{};');
const tmp = path.join(os.tmpdir(), 'photos-test.mjs');
fs.writeFileSync(tmp, src + '\nexport {pickPhoto, wallpaperScore};');
const { pickPhoto } = await import(tmp);

const P = (id, alt, w, h, slug) => ({ id, alt, width: w, height: h, url: 'https://www.pexels.com/photo/' + (slug || 'x') + '-' + id + '/' });
const cas = [
  ['signal fort devant résultat banal', pickPhoto([P(1, 'A red car', 6000, 4000), P(2, 'Abstract wallpaper of dunes', 6000, 4000)])?.id, 2],
  ['portrait seul -> aucune photo (plus de repli sur photos[0])', pickPhoto([P(3, 'Smiling woman portrait wallpaper', 6000, 4000)]), null],
  ['trop petite -> aucune photo', pickPhoto([P(4, 'Mountain wallpaper', 1920, 1080)]), null],
  ['portrait haute résolution accepté (grand côté)', pickPhoto([P(5, 'Sunset over the sea', 2000, 3000)])?.id, 5],
  ['ordre de pertinence Pexels conservé à égalité', pickPhoto([P(6, 'A coffee cup', 6000, 4000), P(7, 'A notebook on a desk', 6000, 4000)])?.id, 6],
  ['slug de l\'URL utilisé si alt vide', pickPhoto([P(8, '', 6000, 4000, 'plain-desk'), P(9, '', 6000, 4000, 'mountain-lake-panorama')])?.id, 9],
  ['logo / texte pénalisé', pickPhoto([P(10, 'Logo sign on a wall', 6000, 4000), P(11, 'Forest path', 6000, 4000)])?.id, 11],
  ['aucun résultat', pickPhoto([]), null],
];
let ko = 0;
for (const [nom, obtenu, attendu] of cas) {
  const ok = obtenu === attendu;
  if (!ok) ko++;
  console.log(ok ? '✓' : '✗', nom, ok ? '' : `(obtenu ${obtenu}, attendu ${attendu})`);
}
process.exit(ko ? 1 : 0);
