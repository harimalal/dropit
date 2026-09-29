// Contraste du texte blanc des titres sur l'overlay en dégradé, pour les 8 teintes de projet.
// Modèle : photo entièrement BLANCHE (pire cas) + voile sombre du bas de la tuile
// (rgba(20,14,10, 0.6 * (pos-0.42)/0.58), le titre étant posé entre 70 et 90 % de la hauteur)
// + dégradé de couleur (85 % -> 65 % à 55 % -> 0 %) + couche sombre (42 % -> 34 % à 55 % -> 0 %).
// Le texte se trouve dans la première moitié du dégradé : on évalue 0 % et 55 %.
// usage : node calc-contraste.js
const teintes = { terracotta: [210, 92, 65], corail: [210, 65, 101], ambre: [198, 135, 47], emeraude: [39, 165, 113], sarcelle: [38, 161, 161], azur: [65, 150, 210], indigo: [77, 65, 210], mure: [174, 65, 210] };
const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
const L = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const mix = (top, a, bot) => top.map((t, i) => t * a + bot[i] * (1 - a));
const contrast = (bg) => 1.05 / (L(...bg) + 0.05); // texte blanc : L = 1
const dark = [20, 14, 10], blanc = [255, 255, 255];
const points = [['0 %', 0.85, 0.42], ['55 %', 0.65, 0.34]];
let min = Infinity, ou = '';
for (const pos of [0.70, 0.75, 0.80, 0.85, 0.90]) {
  const base = mix(dark, 0.6 * (pos - 0.42) / 0.58, blanc);
  for (const [nom, c] of Object.entries(teintes)) for (const [pt, a1, a2] of points) {
    const v = contrast(mix(dark, a2, mix(c, a1, base)));
    if (v < min) { min = v; ou = `${nom} à ${pt}, titre à ${Math.round(pos * 100)} % de hauteur`; }
  }
}
console.log('minimum, 8 teintes :', min.toFixed(2), `(${ou})`);
// sans le voile du bas (cas qui n'existe pas : il recouvre toujours le bas de la tuile)
let min2 = Infinity;
for (const c of Object.values(teintes)) for (const [, a1, a2] of points) min2 = Math.min(min2, contrast(mix(dark, a2, mix(c, a1, blanc))));
console.log('sans le voile du bas de tuile (irréaliste) :', min2.toFixed(2));
