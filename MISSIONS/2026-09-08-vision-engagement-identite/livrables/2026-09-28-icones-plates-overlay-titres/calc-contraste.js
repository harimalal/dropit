// Contrastes de l'état livré (aplat uni, icônes sans halo), pour les 8 teintes de projet.
// usage : node calc-contraste.js
//
// Modèle :
//  - Titre : texte blanc sur un aplat uni de la teinte à 22 %, posé sur le voile du bas de
//    tuile (rgba(20,14,10, 0.6 * (pos-0.42)/0.58), le titre étant entre 70 et 90 % de hauteur),
//    lui-même sur la photo.
//  - Icône sur photo : glyphe blanc sur un rond de la teinte à 40 %, sur la photo NUE — le
//    halo sous l'icône a été retiré et l'icône est dans le coin haut, hors du voile du bas.
//  - Icône ailleurs (liste, filtres, fenêtre projet) : glyphe de la teinte assombrie de 25 %
//    sur un rond de la même teinte à 18 %, sur le fond de l'app.
const teintes = { terracotta: [210, 92, 65], corail: [210, 65, 101], ambre: [198, 135, 47], emeraude: [39, 165, 113], sarcelle: [38, 161, 161], azur: [65, 150, 210], indigo: [77, 65, 210], mure: [174, 65, 210] };
const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
const L = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const mix = (top, a, bot) => top.map((t, i) => t * a + bot[i] * (1 - a));
const ratio = (a, b) => { const [hi, lo] = [L(...a), L(...b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05); };
const scale = (c, k) => c.map((x) => Math.round(x * k));
const dark = [20, 14, 10], blanc = [255, 255, 255], gris = [128, 128, 128], sombre = [40, 45, 40];
const fondApp = [250, 248, 245];

const pires = (label, f) => {
  let min = Infinity, ou = '';
  for (const [nom, c] of Object.entries(teintes)) { const v = f(c); if (v < min) { min = v; ou = nom; } }
  console.log(label.padEnd(46), min.toFixed(2) + ':1', '(' + ou + ')');
};

// — Titre blanc sur l'aplat à 22 %, pour trois photos et toutes les hauteurs de titre
for (const [nomPhoto, photo] of [['grise', gris], ['sombre', sombre], ['blanche (irréaliste)', blanc]]) {
  pires('titre blanc, photo ' + nomPhoto, (c) => {
    let min = Infinity;
    for (const pos of [0.70, 0.75, 0.80, 0.85, 0.90]) {
      const base = mix(dark, 0.6 * (pos - 0.42) / 0.58, photo);
      min = Math.min(min, ratio(blanc, mix(c, 0.22, base)));
    }
    return min;
  });
}
console.log();
// — Glyphe blanc de l'icône sur photo, SANS halo : le rond à 40 % est seul sur la photo nue
for (const [nomPhoto, photo] of [['grise', gris], ['sombre', sombre], ['blanche (irréaliste)', blanc]]) {
  pires('glyphe blanc de l\'icône, photo ' + nomPhoto, (c) => ratio(blanc, mix(c, 0.40, photo)));
}
console.log();
// — Glyphe foncé sur tuile sans photo : teinte x0,55 sur le rond à 40 % posé sur la carte pâle
pires('glyphe foncé, tuile sans photo', (c) => ratio(scale(c, 0.55), mix(c, 0.40, mix(c, 0.12, fondApp))));
// — Glyphe fort des autres fenêtres : teinte x0,75 sur le rond à 18 %
pires('glyphe fort, autres fenêtres', (c) => ratio(scale(c, 0.75), mix(c, 0.18, fondApp)));
