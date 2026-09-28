const http = require('http');
const fs = require('fs');
const path = require('path');

var SEED = { projects: [
  {id:"p1", title:"Projet A", emoji:"🏠", summary:"", categories:[{id:"c1",title:"c",items:[{id:"i1",title:"t",done:false,createdAt:"2026-01-01",notes:[]}],catNotes:[],createdAt:"2026-01-01",updatedAt:"2026-01-01"}], projectNotes:[], dueBucket:"1m", dueDate:null, photo:null, createdAt:"2026-01-01", updatedAt:"2026-01-01"},
  {id:"p2", title:"Projet B", emoji:"🌴", summary:"", categories:[{id:"c2",title:"c",items:[{id:"i2",title:"t",done:false,createdAt:"2026-01-01",notes:[]}],catNotes:[],createdAt:"2026-01-01",updatedAt:"2026-01-01"}], projectNotes:[], dueBucket:"1m", dueDate:null, photo:null, createdAt:"2026-01-01", updatedAt:"2026-01-01"},
  {id:"p3", title:"Projet C", emoji:"💰", summary:"", categories:[{id:"c3",title:"c",items:[{id:"i3",title:"t",done:false,createdAt:"2026-01-01",notes:[]}],catNotes:[],createdAt:"2026-01-01",updatedAt:"2026-01-01"}], projectNotes:[], dueBucket:"1m", dueDate:null, photo:null, createdAt:"2026-01-01", updatedAt:"2026-01-01"}
], dropZone: [] };
let store = { data: JSON.parse(JSON.stringify(SEED)), updatedAt: "2026-01-01T00:00:00.000Z" };
let postLog = [];

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/api/projects' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ data: store.data, updatedAt: store.updatedAt }));
    return;
  }
  if (url.pathname === '/api/projects' && req.method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      // Délai artificiel : élargit la fenêtre pendant laquelle deux POST peuvent être
      // "en vol" simultanément côté client, pour forcer la course qu'on veut vérifier.
      setTimeout(() => {
        const parsed = JSON.parse(body);
        const base = parsed.baseUpdatedAt;
        postLog.push({ base, current: store.updatedAt, match: base === store.updatedAt });
        if (base !== store.updatedAt) {
          res.writeHead(409, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'conflict', data: store.data, updatedAt: store.updatedAt }));
          return;
        }
        store.data = parsed.state;
        store.updatedAt = new Date().toISOString();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, updatedAt: store.updatedAt }));
      }, 250);
    });
    return;
  }
  if (url.pathname === '/__state') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ store, postLog }));
    return;
  }
  if (url.pathname === '/__reset') {
    store = { data: JSON.parse(JSON.stringify(SEED)), updatedAt: "2026-01-01T00:00:00.000Z" };
    postLog = [];
    res.writeHead(200); res.end('ok');
    return;
  }
  let filePath = path.join(__dirname, url.pathname === '/' ? '/app.html' : url.pathname);
  fs.readFile(filePath, (err, content) => {
    if (err) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(content);
  });
});

server.listen(8937, () => console.log('race test server on 8937'));
