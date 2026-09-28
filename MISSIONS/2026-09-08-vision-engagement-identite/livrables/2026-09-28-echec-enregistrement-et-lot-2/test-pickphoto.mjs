// Teste la sélection de photo (functions/api/photos.js) sur des résultats Pexels simulés.
// usage (depuis la racine du dépôt) : node MISSIONS/.../test-pickphoto.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const src = fs.readFileSync('functions/api/photos.js', 'utf8')
  .replace(/import .*auth\.js";/, 'const json=()=>{},requireUser=()=>{},enforceRateLimit=()=>{};');
const tmp = path.join(os.tmpdir(), 'photos-test.mjs');
fs.writeFileSync(tmp, src + '\nexport {pickPhoto, subjectKeywords};');
const { pickPhoto, subjectKeywords } = await import(tmp);

const P = (id, alt, w = 6000, h = 4000, slug) => ({ id, alt, width: w, height: h, url: 'https://www.pexels.com/photo/' + (slug || 'x') + '-' + id + '/' });
const id = (x) => (x ? x.id : null);
const K = subjectKeywords;

const cas = [
  // — règle 1 : fond d'écran SEULEMENT (preuve dans l'alt ou le slug)
  ['photo du sujet mais sans preuve « fond d\'écran » -> écartée',
    pickPhoto([P(1, 'Red car parked on a road')], K('car')), null],
  ['« in the background » n\'est pas un fond d\'écran',
    pickPhoto([P(2, 'Red car with mountains in the background')], K('car')), null],
  ['« background » (fond) accepté',
    id(pickPhoto([P(3, 'Abstract car background')], K('car'))), 3],
  ['« hd » accepté',
    id(pickPhoto([P(4, 'Red car hd')], K('car'))), 4],
  ['la preuve peut venir du slug de l\'URL (alt vide)',
    id(pickPhoto([P(5, '', 6000, 4000, 'red-car-wallpaper')], K('car'))), 5],
  ['visuel graphique (logo, texte…) écarté même avec « wallpaper »',
    pickPhoto([P(6, 'Car logo wallpaper')], K('car')), null],
  // — règle 3 : en rapport avec le sujet SEULEMENT
  ['fond d\'écran hors sujet -> écarté (pas de repli sur un paysage)',
    pickPhoto([P(7, 'Mountain landscape wallpaper at sunset')], K('car')), null],
  ['la voiture passe devant un paysage, tous deux « wallpaper »',
    id(pickPhoto([P(8, 'Mountain landscape wallpaper at sunset'), P(9, 'Red car wallpaper on a road')], K('car'))), 9],
  ['plus de mots du sujet = mieux',
    id(pickPhoto([P(10, 'Weights wallpaper'), P(11, 'Gym weights wallpaper')], K('gym weights'))), 11],
  ['pluriel/singulier : « weights » retrouve « weight »',
    id(pickPhoto([P(12, 'Empty road wallpaper'), P(13, 'A single weight plate wallpaper')], K('gym weights'))), 13],
  ['à pertinence égale, le mot « wallpaper » lui-même départage (avant « hd »)',
    id(pickPhoto([P(14, 'Red car hd'), P(15, 'Red car wallpaper')], K('car'))), 15],
  ['à tout égal, l\'ordre de Pexels est conservé',
    id(pickPhoto([P(16, 'Car wallpaper on a street'), P(17, 'Car wallpaper in a garage')], K('car'))), 16],
  // — règle 2 : jamais de visage, assez grande, pas déjà proposée
  ['portrait seul -> aucune photo',
    pickPhoto([P(18, 'Smiling woman portrait car wallpaper')], K('car')), null],
  ['trop petite (grand côté < 2560) -> aucune photo',
    pickPhoto([P(19, 'Red car wallpaper', 1920, 1080)], K('car')), null],
  ['portrait haute résolution accepté (jugé sur le grand côté)',
    id(pickPhoto([P(20, 'Red car wallpaper', 2000, 3000)], K('car'))), 20],
  ['photo déjà proposée exclue',
    id(pickPhoto([P(21, 'Red car wallpaper'), P(22, 'Blue car wallpaper')], K('car'), [21])), 22],
  ['tout exclu -> aucune photo',
    pickPhoto([P(23, 'Red car wallpaper')], K('car'), [23]), null],
  ['aucun résultat', pickPhoto([], K('car')), null],
  // — extraction des mots-clés
  ['mots-clés : « wallpaper » et mots vides retirés',
    JSON.stringify(K('gym weights wallpaper')), JSON.stringify(['gym', 'weight'])],
  ['mots-clés : trop courts retirés, doublons fusionnés',
    JSON.stringify(K('a car car of it')), JSON.stringify(['car'])],
];
let ko = 0;
for (const [nom, obtenu, attendu] of cas) {
  const ok = obtenu === attendu;
  if (!ok) ko++;
  console.log(ok ? '✓' : '✗', nom, ok ? '' : `(obtenu ${obtenu}, attendu ${attendu})`);
}
console.log(ko ? `\n${ko} échec(s)` : `\n${cas.length}/${cas.length} verts`);
process.exit(ko ? 1 : 0);
