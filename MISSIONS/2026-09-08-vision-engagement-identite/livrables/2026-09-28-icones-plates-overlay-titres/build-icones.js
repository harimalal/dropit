#!/usr/bin/env node
/* Génère, dans app.html, le catalogue d'icônes plates et la table emoji -> icône.
 *
 * Icônes : Material Design Icons (Pictogrammers, paquet @mdi/js), licence Apache 2.0 —
 * tracés pleins sur grille 24x24, donc des icônes "plates". Notice : THIRD_PARTY_NOTICES.md.
 *
 * usage : npm i --prefix /tmp/mdi @mdi/js && node build-icones.js /tmp/mdi/node_modules/@mdi/js /chemin/app.html
 * Idempotent : remplace le bloc entre les marqueurs ICONS:BEGIN / ICONS:END (le crée au premier passage).
 */
const fs = require('fs');
const [mdiDir, appPath] = process.argv.slice(2);
const mdi = require(mdiDir);

// clé (ce que l'IA renvoie et ce qu'on stocke) : [nom MDI, libellé FR, emojis remplacés]
const CATALOG = {
  // famille & relations
  famille:      ['mdiAccountGroup', 'Famille', '👨‍👩‍👧 👨‍👩‍👧‍👦 👨‍👩‍👦 👨‍👩‍👦‍👦 👪 👥 👫 👭 👬 🧑‍🤝‍🧑'],
  coeur:        ['mdiHeart', 'Cœur', '❤️ 💝 💖 💗 💕 💘 💞 🫶 😍 💑 💏 🥰 💌 🧡 💛 💚 💙 💜'],
  bebe:         ['mdiBabyCarriage', 'Bébé', '👶 🍼 🧸'],
  fete:         ['mdiBalloon', 'Fête', '🎈 🎉 🎊 🪅 🥳 🍾 🥂'],
  gateau:       ['mdiCake', 'Gâteau', '🎂 🍰 🧁'],
  cadeau:       ['mdiGift', 'Cadeau', '🎁 🎀'],
  // voyage
  avion:        ['mdiAirplane', 'Avion', '✈️ 🛫 🛬 🛩️'],
  valise:       ['mdiBagSuitcase', 'Valise', '🧳 🎒'],
  palmier:      ['mdiPalmTree', 'Palmier', '🌴 🏝️'],
  carte:        ['mdiMap', 'Carte', '🗺️ 📍'],
  monde:        ['mdiEarth', 'Monde', '🌍 🌎 🌏 🌐'],
  plage:        ['mdiBeach', 'Plage', '🏖️ ⛱️ 🌊 🏄'],
  boussole:     ['mdiCompass', 'Boussole', '🧭'],
  train:        ['mdiTrain', 'Train', '🚆 🚄 🚅 🚂 🚉 🚇'],
  camping:      ['mdiTent', 'Camping', '⛺ 🏕️'],
  montagne:     ['mdiTerrain', 'Montagne', '🏔️ ⛰️ 🗻'],
  bateau:       ['mdiFerry', 'Bateau', '⛴️ 🚢 ⛵ 🛥️'],
  // maison
  maison:       ['mdiHome', 'Maison', '🏠 🏡 🏘️'],
  immeuble:     ['mdiDomain', 'Immeuble', '🏢 🏬 🏛️ 🏗️ 🏭'],
  canape:       ['mdiSofa', 'Canapé', '🛋️ 🪑'],
  lit:          ['mdiBed', 'Lit', '🛏️ 😴 💤'],
  plante:       ['mdiLeaf', 'Plante', '🌿 🍃 🌱 🪴 ☘️ 🍀'],
  fleur:        ['mdiFlower', 'Fleur', '🌸 🌷 🌹 🌺 🌻 💐'],
  arbre:        ['mdiTree', 'Arbre', '🌳 🌲 🎄'],
  cle:          ['mdiKey', 'Clé', '🔑 🗝️'],
  outils:       ['mdiWrench', 'Outils', '🔧 🛠️ 🔨 ⚒️ 🪛 🪚 🧰'],
  carton:       ['mdiPackageVariant', 'Carton', '📦 🗃️'],
  // sport
  course:       ['mdiRun', 'Course', '🏃 🏃‍♀️ 🏃‍♂️ 👟'],
  velo:         ['mdiBike', 'Vélo', '🚴 🚲 🚵'],
  haltere:      ['mdiDumbbell', 'Haltère', '🏋️ 🏋️‍♀️ 🏋️‍♂️ 💪'],
  ballon:       ['mdiSoccer', 'Ballon', '⚽ 🏀 🏈 ⚾ 🎾 🏐 🏉'],
  natation:     ['mdiSwim', 'Natation', '🏊 🤽'],
  randonnee:    ['mdiHiking', 'Randonnée', '🥾 🚶 🧗'],
  trophee:      ['mdiTrophy', 'Trophée', '🏆 🥇 🥈 🥉'],
  medaille:     ['mdiMedal', 'Médaille', '🏅 🎖️'],
  // business & organisation
  mallette:     ['mdiBriefcase', 'Mallette', '💼 👔'],
  courbe:       ['mdiChartLine', 'Courbe', '📈 📊 📉'],
  argent:       ['mdiCash', 'Argent', '💰 💵 💶 💷 💴 🤑'],
  tirelire:     ['mdiPiggyBank', 'Tirelire', '🐖 🪙'],
  fusee:        ['mdiRocketLaunch', 'Fusée', '🚀 🛸'],
  poignee:      ['mdiHandshake', 'Poignée de main', '🤝'],
  boutique:     ['mdiStorefront', 'Boutique', '🏪'],
  banque:       ['mdiBank', 'Banque', '🏦'],
  carte_bancaire:['mdiCreditCard', 'Carte bancaire', '💳'],
  cible:        ['mdiBullseyeArrow', 'Cible', '🎯'],
  balance:      ['mdiScale', 'Balance', '⚖️'],
  document:     ['mdiFileDocument', 'Document', '📄 📃 📑 📰'],
  liste:        ['mdiClipboardText', 'Liste', '📋'],
  valide:       ['mdiClipboardCheck', 'Validé', '✅ ☑️ ✔️'],
  calendrier:   ['mdiCalendar', 'Calendrier', '📅 📆 🗓️'],
  horloge:      ['mdiClock', 'Horloge', '⏰ ⏱️ 🕐 ⌛ ⏳'],
  ampoule:      ['mdiLightbulb', 'Ampoule', '💡 🧠'],
  courriel:     ['mdiEmail', 'Courriel', '📧 ✉️ 📩 📨'],
  telephone:    ['mdiCellphone', 'Téléphone', '📱 📞 ☎️ 📲'],
  // création
  palette:      ['mdiPalette', 'Palette', '🎨 🖌️'],
  camera:       ['mdiCamera', 'Appareil photo', '📷 📸 📹'],
  musique:      ['mdiMusic', 'Musique', '🎵 🎶 🎼 🎧 🎤 🥁'],
  guitare:      ['mdiGuitarElectric', 'Guitare', '🎸'],
  crayon:       ['mdiPencil', 'Crayon', '✍️ ✏️ 🖊️ 🖋️ 📝'],
  cinema:       ['mdiMovieOpen', 'Cinéma', '🎬 🎞️ 📽️ 🍿 🎥'],
  jeu:          ['mdiGamepadVariant', 'Jeu vidéo', '🎮 🕹️ 🎲'],
  // apprentissage
  livre:        ['mdiBookOpenVariant', 'Livre', '📚 📖 📕 📗 📘 📙 📔 🔖'],
  diplome:      ['mdiSchool', 'Diplôme', '🎓 🏫'],
  ordinateur:   ['mdiLaptop', 'Ordinateur', '💻 🖥️ ⌨️ 🖱️'],
  code:         ['mdiCodeTags', 'Code', '👨‍💻 👩‍💻 🧑‍💻'],
  fiole:        ['mdiFlask', 'Fiole', '🔬 🧪 ⚗️ 🧬 🔭'],
  langue:       ['mdiTranslate', 'Langue', '🗣️ 🔤 💬'],
  // vie quotidienne
  voiture:      ['mdiCar', 'Voiture', '🚗 🚕 🚙 🚘 🏎️ 🚓 🚑 🚒 🚐 🛻'],
  courses:      ['mdiCart', 'Courses', '🛒 🛍️'],
  cuisine:      ['mdiSilverwareForkKnife', 'Cuisine', '🍽️ 🍴 🥗 🍕 🍔 🍳 🥘 🍝 🍜 🍣 👨‍🍳 🍎 🥕'],
  cafe:         ['mdiCoffee', 'Café', '☕ 🍵 🥐'],
  chien:        ['mdiDog', 'Chien', '🐶 🐕 🦮'],
  chat:         ['mdiCat', 'Chat', '🐱 🐈'],
  animaux:      ['mdiPaw', 'Animaux', '🐾 🐹 🐰 🐦 🐠 🐢'],
  sante:        ['mdiHeartPulse', 'Santé', '🩺 🏥 💊 🩹 🧘 🫀'],
  soleil:       ['mdiWhiteBalanceSunny', 'Soleil', '☀️ 🌞 🌅 🌄'],
  vetement:     ['mdiTshirtCrew', 'Vêtement', '👕 👗 👖 🧥 👚 👠'],
  portefeuille: ['mdiWallet', 'Portefeuille', '👛 👝'],
  cloche:       ['mdiBell', 'Cloche', '🔔'],
  engrenage:    ['mdiCog', 'Engrenage', '⚙️ 🔩'],
  // génériques
  etoile:       ['mdiStar', 'Étoile', '⭐ ✨ 🌟 💫'],
  drapeau:      ['mdiFlag', 'Drapeau', '🚩 🏁 🏴'],
  dossier:      ['mdiFolder', 'Dossier', '📁 📂 🗂️'],
};

const strip = (e) => e.replace(/️/g, '');
const catalog = {}, emojiMap = {};
const missing = [];
for (const [key, [name, label, emojis]] of Object.entries(CATALOG)) {
  if (!mdi[name]) { missing.push(name); continue; }
  catalog[key] = { label, path: mdi[name] };
  for (const em of emojis.split(/\s+/).filter(Boolean)) {
    const k = strip(em);
    if (emojiMap[k] && emojiMap[k] !== key) console.warn('emoji en double :', em, emojiMap[k], '/', key);
    emojiMap[k] = key;
  }
}
if (missing.length) { console.error('icônes MDI introuvables :', missing.join(', ')); process.exit(1); }

const BEGIN = '  /* ICONS:BEGIN — bloc généré par build-icones.js, ne pas éditer à la main.\n' +
  '     Icônes : Material Design Icons (Pictogrammers), licence Apache 2.0, voir THIRD_PARTY_NOTICES.md */\n';
const END = '  /* ICONS:END */\n';
const block = BEGIN +
  '  var ICON_CATALOG = ' + JSON.stringify(catalog) + ';\n' +
  '  var EMOJI_TO_ICON = ' + JSON.stringify(emojiMap) + ';\n' + END;

let html = fs.readFileSync(appPath, 'utf8');
const a = html.indexOf('  /* ICONS:BEGIN'), b = html.indexOf(END);
if (a >= 0 && b > a) html = html.slice(0, a) + block + html.slice(b + END.length);
else {
  const anchor = "  // https seulement : l'URL finit dans un background-image";
  if (html.split(anchor).length !== 2) { console.error("point d'insertion introuvable"); process.exit(1); }
  html = html.replace(anchor, block + '\n' + anchor);
}
fs.writeFileSync(appPath, html);
console.log(Object.keys(catalog).length + ' icônes, ' + Object.keys(emojiMap).length + ' emojis reconnus, +' + Math.round(block.length / 1024) + ' Ko dans app.html');
