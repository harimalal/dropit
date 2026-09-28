// Construit la fixture de test à partir du app.html réel : remplace l'amorçage normal
// (boot(), qui exige une vraie session Supabase) par un jeu de données simulé.
const fs = require('fs');
const SRC = '/home/user/dropit/app.html';
const OUT = __dirname + '/app.html';

const mock = `
  var mockProjects = [
    {id:"p1", title:"Vendre ma voiture", emoji:"🚗", summary:"Préparer la voiture de A à Z pour la mettre en valeur et obtenir le meilleur prix.", categories:[
      {id:"c1", title:"Nettoyer", items:[{id:"i1",title:"Laver la carrosserie",done:true,createdAt:"2026-01-01",notes:[]}]},
      {id:"c1b", title:"Prendre des photos", items:[{id:"i2",title:"Photos extérieur",done:true,createdAt:"2026-01-01",notes:[]},{id:"i2b",title:"Photos intérieur",done:false,createdAt:"2026-01-01",notes:[]}]},
      {id:"c1c", title:"Rédiger l'annonce", items:[{id:"i3",title:"Écrire le texte",done:false,createdAt:"2026-01-01",notes:[]}]},
      {id:"c1d", title:"Fixer le prix", items:[{id:"i4",title:"Comparer la cote",done:false,createdAt:"2026-01-01",notes:[]}]},
      {id:"c1e", title:"Publier et diffuser", items:[{id:"i5",title:"Mettre en ligne",done:false,createdAt:"2026-01-01",notes:[]}]},
      {id:"c1f", title:"Finaliser la vente", items:[{id:"i6",title:"Signer le certificat",done:false,createdAt:"2026-01-01",notes:[]}]}
    ], projectNotes:[], dueBucket:"1m", dueDate:null, photo:null, createdAt:"2026-01-01", updatedAt:"2026-01-01"},
    {id:"p2", title:"Organiser un très long voyage en famille", emoji:"🌴", summary:"", categories:[
      {id:"c2", title:"c", items:[{id:"j2",title:"t",done:true,createdAt:"2026-01-01",notes:[]},{id:"j2b",title:"t",done:false,createdAt:"2026-01-01",notes:[]}]}
    ], projectNotes:[], dueBucket:"1m", dueDate:null, photo:{url:"https://images.pexels.com/fake.jpg"}, createdAt:"2026-01-01", updatedAt:"2026-01-01"},
    {id:"p3", title:"Reprendre forme & discipline", emoji:"🏋️", summary:"", categories:[
      {id:"c3", title:"c", items:[{id:"j3",title:"t",done:false,createdAt:"2026-01-01",notes:[]},{id:"j3b",title:"t",done:false,createdAt:"2026-01-01",notes:[]}]}
    ], projectNotes:[], dueBucket:"1m", dueDate:null, photo:null, createdAt:"2026-01-01", updatedAt:"2026-01-01"},
    {id:"p4", title:"Budget", emoji:"💰", summary:"", categories:[
      {id:"c4", title:"c", items:[{id:"j4",title:"t",done:false,createdAt:"2026-01-01",notes:[]}]}
    ], projectNotes:[], dueBucket:"1m", dueDate:null, photo:null, createdAt:"2026-01-01", updatedAt:"2026-01-01"},
    {id:"p5", title:"Sport", emoji:"🏃", summary:"", categories:[
      {id:"c5", title:"c", items:[{id:"j5",title:"t",done:true,createdAt:"2026-01-01",notes:[]},{id:"j5b",title:"t",done:true,createdAt:"2026-01-01",notes:[]},{id:"j5c",title:"t",done:false,createdAt:"2026-01-01",notes:[]},{id:"j5d",title:"t",done:false,createdAt:"2026-01-01",notes:[]},{id:"j5e",title:"t",done:false,createdAt:"2026-01-01",notes:[]}]}
    ], projectNotes:[], dueBucket:"1m", dueDate:null, photo:{url:"https://images.pexels.com/fake.jpg"}, createdAt:"2026-01-01", updatedAt:"2026-01-01"},
    {id:"p6", title:"Rénover la cuisine", emoji:"🏠", summary:"", categories:[
      {id:"c6", title:"c", items:[{id:"j6",title:"t",done:false,createdAt:"2026-01-01",notes:[]},{id:"j6b",title:"t",done:false,createdAt:"2026-01-01",notes:[]},{id:"j6c",title:"t",done:false,createdAt:"2026-01-01",notes:[]}]}
    ], projectNotes:[], dueBucket:"1m", dueDate:null, photo:null, createdAt:"2026-01-01", updatedAt:"2026-01-01"}
  ];
  var mockDropZone = [
    {id:"d1", title:"Lire ce livre sur le marketing", createdAt:"2026-01-01"},
    {id:"d2", title:"Appeler le dentiste", createdAt:"2026-01-01"},
    {id:"d3", title:"Payer les factures", createdAt:"2026-01-01"}
  ];
  session = {access_token:"test-token", expires_at: Date.now()+3600000, user:{id:"test-user", email:"test@example.com"}};
  var _origFetch = window.fetch.bind(window);
  window.fetch = function(url, opts){
    var u = String(url);
    if(u.indexOf("/api/projects") === 0){
      if(opts && opts.method === "POST") return Promise.resolve(new Response(JSON.stringify({ok:true, updatedAt:new Date().toISOString()}),{status:200}));
      return Promise.resolve(new Response(JSON.stringify({data:{projects:mockProjects, dropZone:mockDropZone}, updatedAt:"2026-01-01T00:00:00Z"}),{status:200}));
    }
    if(u.indexOf("/api/photos") === 0){
      return Promise.resolve(new Response(JSON.stringify({error:"no_results"}),{status:404}));
    }
    return _origFetch(url, opts);
  };
  bootAfterAuth();
`;

let src = fs.readFileSync(SRC, 'utf8');
const NEEDLE = '\n  boot();\n';
if (!src.includes(NEEDLE)) { console.error('amorçage boot() introuvable'); process.exit(1); }
src = src.replace(NEEDLE, '\n' + mock + '\n');
fs.writeFileSync(OUT, src);
console.log('fixture écrite :', OUT);
