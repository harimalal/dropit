// Vérifie le catalogue d'icônes plates et la correspondance emoji -> icône, directement sur app.html.
// usage (depuis la racine du dépôt) : node MISSIONS/.../test-icones.mjs
import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync('app.html', 'utf8');
const block = html.slice(html.indexOf('  /* ICONS:BEGIN'), html.indexOf('  /* ICONS:END */'));
const fnStart = html.indexOf('  function iconKeyForEmoji(emoji){');
const fn = html.slice(fnStart, html.indexOf('  function projectIconKey(p){'));
const tax = html.slice(html.indexOf('  var PHOTO_ICON_TAXONOMY = {'), html.indexOf('  function cleanSubject('));
const ctx = vm.createContext({});
vm.runInContext(block + fn + tax + '; this.out = {ICON_CATALOG, EMOJI_TO_ICON, iconKeyForEmoji, PHOTO_ICON_TAXONOMY};', ctx);
const { ICON_CATALOG, EMOJI_TO_ICON, iconKeyForEmoji, PHOTO_ICON_TAXONOMY } = ctx.out;

let ko = 0;
const check = (nom, ok, detail = '') => { if (!ok) ko++; console.log(ok ? '✓' : '✗', nom, ok ? '' : detail); };

// 1. le catalogue
const keys = Object.keys(ICON_CATALOG);
check(`catalogue : ${keys.length} icônes`, keys.length >= 60);
check('chaque icône a un libellé français et un tracé', keys.every(k => ICON_CATALOG[k].label && /^[Mm][0-9.,\-\s]/.test(ICON_CATALOG[k].path)),
  keys.filter(k => !(ICON_CATALOG[k].label && ICON_CATALOG[k].path)).join(','));
check('tracés sûrs à insérer dans un attribut (aucun guillemet ni chevron)', keys.every(k => /^[MmLlHhVvCcSsQqTtAaZz0-9.,\-\s]+$/.test(ICON_CATALOG[k].path)));
check('chaque emoji pointe vers une icône qui existe', Object.values(EMOJI_TO_ICON).every(k => ICON_CATALOG[k]),
  Object.entries(EMOJI_TO_ICON).filter(([, k]) => !ICON_CATALOG[k]).map(([e]) => e).join(' '));
check('le drapeau générique existe (repli)', !!ICON_CATALOG.drapeau);

// 2. toutes les icônes de la taxonomie photo ont une icône plate
const taxEmojis = Object.values(PHOTO_ICON_TAXONOMY).flatMap(d => d.icons);
const sansIcone = taxEmojis.filter(e => !iconKeyForEmoji(e));
check(`taxonomie photo : ${taxEmojis.length} emojis, tous couverts`, sansIcone.length === 0, sansIcone.join(' '));

// 3. les emojis de projets vus dans l'app et les tests
const vus = ['🌴', '🎂', '📦', '✨', '🚗', '✈️', '🏋️', '🏠', '🎨', '💰', '📋', '🏃', '🎯', '🎸', '💝', '🎓', '💼'];
const manquants = vus.filter(e => !iconKeyForEmoji(e));
check('emojis de démo et de test tous couverts', manquants.length === 0, manquants.join(' '));

// 4. variantes composées
const egal = (e, attendu) => iconKeyForEmoji(e) === attendu;
check('sélecteur de variante ignoré : ❤ = ❤️', egal('❤', 'coeur') && egal('❤️', 'coeur'));
check('séquence à joiner reconnue telle quelle : 👨‍👩‍👧 -> famille', egal('👨‍👩‍👧', 'famille'));
check('séquence inconnue : repli sur la base avant le joiner (🏃‍♀️ -> course)', egal('🏃‍♀️', 'course'));
check('séquence inconnue : 🐕‍🦺 -> chien (base 🐕)', egal('🐕‍🦺', 'chien'));
check('emoji sans équivalent -> null (l\'IA choisira)', iconKeyForEmoji('🧿') === null);
check('valeur vide ou absente -> null, sans erreur', iconKeyForEmoji('') === null && iconKeyForEmoji(undefined) === null);

console.log(ko ? `\n${ko} échec(s)` : '\ntout est vert');
process.exit(ko ? 1 : 0);
