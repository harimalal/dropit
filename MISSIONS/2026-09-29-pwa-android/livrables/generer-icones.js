// Génère les icônes PWA depuis le logotype 1024 px (source-icone-1024.png).
// Usage : node generer-icones.js   (depuis la racine du dépôt)
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SOURCE = path.join(__dirname, 'source-icone-1024.png');
const SORTIE = path.join(process.cwd(), 'icons');
// Le logotype tient dans la zone sûre « maskable » (cercle de 80 % du côté) : même image pour les deux.
const CIBLES = { 'icon-192.png': 192, 'icon-512.png': 512, 'icon-maskable-512.png': 512, 'apple-touch-icon.png': 180, 'favicon-32.png': 32, 'favicon-16.png': 16 };

(async () => {
  fs.mkdirSync(SORTIE, { recursive: true });
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  const src = 'data:image/png;base64,' + fs.readFileSync(SOURCE).toString('base64');
  for (const [nom, taille] of Object.entries(CIBLES)) {
    const b64 = await page.evaluate(async ({ src, taille }) => {
      const img = new Image(); img.src = src; await img.decode();
      const c = document.createElement('canvas'); c.width = c.height = taille;
      const ctx = c.getContext('2d'); ctx.imageSmoothingQuality = 'high';
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, taille, taille);
      ctx.drawImage(img, 0, 0, taille, taille);
      return c.toDataURL('image/png').split(',')[1];
    }, { src, taille });
    fs.writeFileSync(path.join(SORTIE, nom), Buffer.from(b64, 'base64'));
    console.log(nom, taille + 'x' + taille);
  }
  await browser.close();
})();
