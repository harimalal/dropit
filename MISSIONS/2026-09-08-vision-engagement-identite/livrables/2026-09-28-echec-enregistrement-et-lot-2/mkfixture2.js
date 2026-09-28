// Fixture "fetch réel" : le navigateur applique lui-même ses règles (dont la limite de 64 Kio des
// requêtes keepalive) ; les réponses serveur sont fournies par page.route() côté test.
// usage : node mkfixture2.js <source app.html> <sortie>
const fs = require('fs');
const [src, out] = process.argv.slice(2);
let html = fs.readFileSync(src, 'utf8');
const NEEDLE = '\n  boot();\n';
if (!html.includes(NEEDLE)) { console.error('boot() introuvable'); process.exit(1); }
html = html.replace(NEEDLE, `
  session = {access_token:"test-token", expires_at: Date.now()+3600000, user:{id:"user-test", email:"test@example.com"}};
  bootAfterAuth();
`);
fs.writeFileSync(out, html);
console.log('écrit', out);
