// Poids réel d'un projet selon le modèle de données, pour dimensionner le plafond d'octets.
// Trois profils : léger (ce que l'IA crée), moyen (usage réel), lourd (gros utilisateur de notes).
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const ISO = "2026-09-29T10:00:00.000Z";
const txt = (n) => "x".repeat(n);

function project({ cats, itemsPerCat, notesPerItem, noteLen, projNotes, projNoteLen, photo, summaryLen }) {
  return {
    id: uid(), title: txt(28), emoji: "🚗", summary: txt(summaryLen), dna: "",
    dueBucket: "1m", dueDate: ISO.slice(0, 10), icon: "voiture",
    photo: photo ? { url: "https://images.pexels.com/photos/12345/pexels-photo-12345.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940", photographer: txt(18), photographerUrl: "https://www.pexels.com/@" + txt(14), pexelsId: 1234567, pageUrl: "https://www.pexels.com/photo/" + txt(30) + "-1234567/", query: "car", fetchedAt: ISO } : null,
    categories: Array.from({ length: cats }, () => ({
      id: uid(), title: txt(22), createdAt: ISO, updatedAt: ISO, catNotes: [],
      items: Array.from({ length: itemsPerCat }, () => ({
        id: uid(), title: txt(46), done: false, createdAt: ISO,
        notes: Array.from({ length: notesPerItem }, () => ({ id: uid(), text: txt(noteLen), createdAt: ISO })),
      })),
    })),
    projectNotes: Array.from({ length: projNotes }, () => ({ id: uid(), title: txt(30), body: txt(projNoteLen), catId: null, createdAt: ISO })),
    createdAt: ISO, updatedAt: ISO,
  };
}

const PROFILS = {
  "léger (sortie IA brute)":   { cats: 3, itemsPerCat: 4, notesPerItem: 0, noteLen: 0,   projNotes: 0,  projNoteLen: 0,    photo: true, summaryLen: 90 },
  "moyen (usage réel)":        { cats: 4, itemsPerCat: 6, notesPerItem: 1, noteLen: 110, projNotes: 2,  projNoteLen: 400,  photo: true, summaryLen: 140 },
  "lourd (notes IA longues)":  { cats: 6, itemsPerCat: 10, notesPerItem: 2, noteLen: 260, projNotes: 6, projNoteLen: 1800, photo: true, summaryLen: 220 },
  "extrême (pire plausible)":  { cats: 8, itemsPerCat: 15, notesPerItem: 3, noteLen: 400, projNotes: 12, projNoteLen: 3000, photo: true, summaryLen: 300 },
};

const enc = new TextEncoder();
const ko = (n) => (n / 1024).toFixed(1) + " Ko";
console.log("Poids d'UN projet, et d'un compte de 50 projets :\n");
for (const [nom, cfg] of Object.entries(PROFILS)) {
  const un = enc.encode(JSON.stringify(project(cfg))).length;
  const compte = enc.encode(JSON.stringify({ projects: Array.from({ length: 50 }, () => project(cfg)), dropZone: [] })).length;
  console.log(nom.padEnd(28), ko(un).padStart(9), "→ 50 projets :", ko(compte).padStart(10));
}
console.log("\nRéférence mesurée hier en base : 67 104 o pour 8 projets =", ko(67104 / 8), "/projet");
