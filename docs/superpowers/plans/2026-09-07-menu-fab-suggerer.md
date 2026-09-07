# Menu FAB + SUGGERER enrichi — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer le swipe home↔tasklist par un menu FAB contextuel (Liste / Chat IA / Calendrier), et enrichir les fonctions SUGGERER pour exploiter le texte saisi dans le champ de saisie.

**Architecture:** SPA vanilla JS, rendu complet par `app.innerHTML = ...` à chaque `render()`. Pas de framework. Un seul fichier `app.html`. Les états globaux pilotent ce qui s'affiche. Le FAB est rendu dans chaque vue via une fonction `renderFAB()` commune. Les event bindings sont réinitialisés à chaque render via `bindGlobalEvents()`.

**Tech Stack:** HTML/CSS/JS vanilla inline dans `app.html`. Aucune dépendance externe.

**Spec:** `docs/superpowers/specs/2026-09-07-menu-suggerer-design.md`

## Global Constraints

- Fichier unique : `/home/radoraj/DROPIT/app.html`
- Aucun framework, aucune dépendance npm
- Les CSS `var(--accent)`, `var(--ink)`, `var(--canvas-card)`, `var(--line)`, `var(--font-mono)` sont déjà définies
- `render()` réinitialise l'innerHTML ET rebind tous les events via `bindGlobalEvents()` — ne jamais attacher un listener sur un élément sans passer par `bindGlobalEvents()`
- Commits en français, messages courts

---

## Task 1 — CSS : FAB styles + suppression `.chat-icon-btn` et `.home-swipe-hint`

**Files:**
- Modify: `app.html:413-420` (bloc `.chat-icon-btn` → remplacer par CSS FAB)
- Modify: `app.html:508-515` (bloc `.home-swipe-hint` → supprimer)

**Interfaces:**
- Produces: classes `.fab-menu-btn`, `.fab-menu-btn.open`, `.fab-overlay`, `.fab-overlay.open`, `.fab-menu-items`, `.fab-menu-items.open`, `.fab-item`, `.fab-item-btn`, `.fab-item-label`, `.fab-item.disabled`

- [ ] **Step 1 : Remplacer le bloc `.chat-icon-btn` (lignes 413-420)**

Localiser le bloc :
```css
.chat-icon-btn{
  position:fixed;right:16px;bottom:16px;width:48px;height:48px;border-radius:50%;
  background:var(--ink);color:#fff;border:none;z-index:45;
  display:flex;align-items:center;justify-content:center;
  box-shadow:0 6px 20px rgba(43,36,32,0.22);
}
.chat-icon-btn:hover{background:var(--accent);}
.chat-icon-btn .icon{width:20px;height:20px;}
```

Remplacer par :
```css
.fab-menu-btn{
  position:fixed;right:16px;bottom:76px;width:52px;height:52px;border-radius:50%;
  background:var(--accent);color:#fff;border:none;z-index:46;cursor:pointer;
  display:flex;align-items:center;justify-content:center;
  box-shadow:0 4px 20px rgba(43,36,32,0.28);transition:transform .22s;
}
.fab-menu-btn.open{transform:rotate(45deg);}
.fab-menu-btn .icon{width:22px;height:22px;}
.fab-overlay{display:none;position:fixed;inset:0;z-index:44;}
.fab-overlay.open{display:block;}
.fab-menu-items{
  position:fixed;right:12px;bottom:140px;z-index:46;
  display:flex;flex-direction:column;gap:10px;align-items:flex-end;
  opacity:0;transform:translateY(12px);pointer-events:none;
  transition:opacity .18s,transform .18s;
}
.fab-menu-items.open{opacity:1;transform:translateY(0);pointer-events:all;}
.fab-item{display:flex;flex-direction:column;align-items:center;gap:3px;}
.fab-item-btn{
  width:44px;height:44px;border-radius:50%;cursor:pointer;
  background:var(--canvas-card);border:1px solid var(--line);color:var(--ink);
  display:flex;align-items:center;justify-content:center;
  box-shadow:0 2px 10px rgba(43,36,32,0.14);
}
.fab-item-btn:hover{border-color:var(--accent);color:var(--accent);}
.fab-item-btn .icon{width:18px;height:18px;}
.fab-item-label{
  font-family:var(--font-mono);font-size:9.5px;color:var(--ink);white-space:nowrap;
  background:var(--canvas-card);border-radius:10px;padding:2px 7px;
  box-shadow:0 1px 4px rgba(43,36,32,0.10);
}
.fab-item.disabled .fab-item-btn{opacity:0.35;pointer-events:none;cursor:default;}
.fab-item.disabled .fab-item-label{opacity:0.45;}
```

- [ ] **Step 2 : Supprimer le bloc `.home-swipe-hint` (lignes 508-515)**

Localiser et supprimer :
```css
/* Hint swipe sur home */
.home-swipe-hint{
  position:fixed;bottom:72px;left:50%;transform:translateX(-50%);z-index:44;
  font-family:var(--font-mono);font-size:10px;color:var(--ink-faint);
  background:var(--canvas-card);border:1px solid var(--line);border-radius:20px;
  padding:5px 13px;pointer-events:none;white-space:nowrap;
  box-shadow:0 2px 8px rgba(43,36,32,0.08);
}
```

- [ ] **Step 3 : Vérification visuelle rapide**

Ouvrir `app.html` dans le navigateur. Vérifier qu'il n'y a aucune erreur CSS visible et que l'app se charge normalement (pas de régressions de style sur les barres existantes).

- [ ] **Step 4 : Commit**

```bash
cd /home/radoraj/DROPIT
git add app.html
git commit -m "style: CSS FAB menu, supprime chat-icon-btn et home-swipe-hint"
```

---

## Task 2 — Fonctions icônes + renderFAB() + intégration dans les 3 render functions

**Files:**
- Modify: `app.html:1562-1572` (bloc icon functions — ajouter 3 nouvelles)
- Modify: `app.html:1791` (renderHome — retirer chat-home-icon-btn et swipe-hint, ajouter renderFAB)
- Modify: `app.html:2208` (renderDetail — retirer chat-icon-btn, ajouter renderFAB)
- Modify: `app.html:2258` (renderCategoryDetail — retirer chat-icon-btn, ajouter renderFAB)

**Interfaces:**
- Consumes: CSS classes from Task 1
- Produces: `renderFAB()` → string HTML; `listIcon()`, `menuFabIcon()`, `calendarIcon()` → string SVG

- [ ] **Step 1 : Ajouter 3 fonctions icônes après `plusIcon()` (ligne ~1571)**

Localiser la ligne :
```js
function plusIcon(){ return '<svg class="icon" viewBox="0 0 20 20" fill="none"><path d="M10 4v12M4 10h12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>'; }
```

Ajouter immédiatement après :
```js
function listIcon(){ return '<svg class="icon" viewBox="0 0 20 20" fill="none"><path d="M4 6h12M4 10h12M4 14h8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>'; }
function menuFabIcon(){ return '<svg class="icon" viewBox="0 0 20 20" fill="none"><path d="M4 7h12M4 13h12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>'; }
function calendarIcon(){ return '<svg class="icon" viewBox="0 0 20 20" fill="none"><rect x="3" y="5" width="14" height="12" rx="2" stroke="currentColor" stroke-width="1.4"/><path d="M7 3v4M13 3v4M3 9h14" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>'; }
```

- [ ] **Step 2 : Créer la fonction renderFAB()**

Ajouter après les fonctions icônes (avant `renderHome`), à la ligne ~1790 :

```js
function renderFAB(){
  var open = menuOpen;
  var listDis = taskListOpen;
  var items =
    '<div class="fab-item disabled" id="fab-item-cal">'+
      '<button class="fab-item-btn" disabled>'+calendarIcon()+'</button>'+
      '<span class="fab-item-label">Bientôt</span>'+
    '</div>'+
    '<div class="fab-item" id="fab-item-chat">'+
      '<button class="fab-item-btn">'+chatIcon()+'</button>'+
      '<span class="fab-item-label">Chat IA</span>'+
    '</div>'+
    '<div class="fab-item'+(listDis?' disabled':'')+'" id="fab-item-list">'+
      '<button class="fab-item-btn"'+(listDis?' disabled':'')+'>'+listIcon()+'</button>'+
      '<span class="fab-item-label">Liste</span>'+
    '</div>';
  return ''+
    '<div class="fab-overlay'+(open?' open':'')+'" id="fab-overlay"></div>'+
    '<div class="fab-menu-items'+(open?' open':'')+'" id="fab-menu-items">'+items+'</div>'+
    '<button class="fab-menu-btn'+(open?' open':'')+'" id="fab-menu-btn" title="Menu">'+menuFabIcon()+'</button>';
}
```

Note : les items sont dans l'ordre DOM haut→bas : Bientôt, Chat IA, Liste. Le CSS `flex-direction:column` + container positionné à `bottom:140px` fait que Liste (dernier) est en bas du container = visuellement le plus proche du FAB. C'est l'ordre voulu.

- [ ] **Step 3 : Intégrer renderFAB() dans renderHome()**

Localiser dans `renderHome()` les deux lignes (vers ligne 1806-1807) :
```js
(hasProjects ? '<button class="chat-icon-btn" id="chat-home-icon-btn" title="Demander à l\'IA" style="bottom:76px;">'+chatIcon()+'</button>' : '')+
(hasProjects ? '<div class="home-swipe-hint">← Swipe pour voir toutes les tâches</div>' : '')+
```

Remplacer par :
```js
(hasProjects ? renderFAB() : '')+
```

- [ ] **Step 4 : Intégrer renderFAB() dans renderDetail()**

Localiser dans `renderDetail(p)` la ligne (vers ligne 2221) :
```js
'<button class="chat-icon-btn" id="chat-icon-btn" '+chatBtnStyle+' title="Demander à l\'IA">'+chatIcon()+'</button>'+
```

Remplacer par :
```js
renderFAB()+
```

Supprimer aussi la variable `chatBtnStyle` (ligne ~2205) qui devient inutile :
```js
var chatBtnStyle = detailBarHtml ? 'style="bottom:82px;"' : '';
```

- [ ] **Step 5 : Intégrer renderFAB() dans renderCategoryDetail()**

Localiser dans `renderCategoryDetail(p, cat)` la ligne (vers ligne 2266) :
```js
'<button class="chat-icon-btn" id="chat-icon-btn" style="bottom:82px;" title="Demander à l\'IA">'+chatIcon()+'</button>'+
```

Remplacer par :
```js
renderFAB()+
```

- [ ] **Step 6 : Vérifier visuellement**

Ouvrir l'app. Sur la home (avec projets), le FAB doit apparaître en bas à droite. Sur la vue projet, idem. Sur la vue catégorie, idem. Les anciens boutons chat flottants ne doivent plus apparaître.

- [ ] **Step 7 : Commit**

```bash
cd /home/radoraj/DROPIT
git add app.html
git commit -m "feat: renderFAB() + icônes list/menu/calendar, intégration dans les 3 vues"
```

---

## Task 3 — État menuOpen + bindFABEvents() + suppression swipe + nettoyage anciens bindings

**Files:**
- Modify: `app.html:1214` (état global — ajouter `menuOpen`)
- Modify: `app.html:1117` (signOut — reset menuOpen)
- Modify: `app.html:3133-3137` (supprimer binding chat-icon-btn open)
- Modify: `app.html:3271-3275` (supprimer binding chat-home-icon-btn open)
- Modify: `app.html:3309-3344` (supprimer bloc swipe detection)
- Modify: `app.html:~2900` (bindGlobalEvents — ajouter appel bindFABEvents)
- Modify: `app.html:~1560` (ajouter fonction bindFABEvents)

**Interfaces:**
- Consumes: `menuOpen` (global state), `taskListOpen`, `currentProjectId`, `currentCategoryId`, `chatProjectOpen`, `chatHomeOpen`, `tlSelectedProjects`, `showAllItems`, `render()`
- Produces: aucun, effets de bord sur états globaux

- [ ] **Step 1 : Ajouter `menuOpen` dans les états globaux**

Localiser (ligne ~1214) :
```js
var taskListOpen = false;
var tlSelectedProjects = []; // [] = tous les projets
```

Ajouter sur la ligne juste avant `var taskListOpen` :
```js
var menuOpen = false;
```

- [ ] **Step 2 : Ajouter `menuOpen = false` dans signOut()**

Localiser (ligne ~1117) :
```js
chatState = {}; tlSelectedProjects = [];
```

Remplacer par :
```js
chatState = {}; tlSelectedProjects = []; menuOpen = false;
```

- [ ] **Step 3 : Créer bindFABEvents()**

Ajouter la fonction juste avant `bindGlobalEvents` (chercher `function bindGlobalEvents`). Insérer avant :

```js
function bindFABEvents(){
  var fabBtn = document.getElementById('fab-menu-btn');
  var fabOverlay = document.getElementById('fab-overlay');
  var fabItemList = document.getElementById('fab-item-list');
  var fabItemChat = document.getElementById('fab-item-chat');

  if(fabBtn) fabBtn.addEventListener('click', function(){
    menuOpen = !menuOpen;
    render();
  });

  if(fabOverlay) fabOverlay.addEventListener('click', function(){
    menuOpen = false;
    render();
  });

  if(fabItemList && !taskListOpen) fabItemList.addEventListener('click', function(){
    var filterProjectId = currentProjectId;
    currentProjectId = null;
    currentCategoryId = null;
    showAllItems = false;
    taskListOpen = true;
    if(filterProjectId) tlSelectedProjects = [filterProjectId];
    menuOpen = false;
    render();
  });

  if(fabItemChat) fabItemChat.addEventListener('click', function(){
    if(currentProjectId){
      chatProjectOpen = true;
    } else {
      chatHomeOpen = true;
    }
    menuOpen = false;
    render();
    setTimeout(function(){
      var id = currentProjectId ? 'chat-msgs-'+currentProjectId : 'chat-msgs-home';
      var el = document.getElementById(id);
      if(el) el.scrollTop = el.scrollHeight;
    }, 50);
  });
}
```

- [ ] **Step 4 : Appeler bindFABEvents() dans bindGlobalEvents()**

Localiser au début de `bindGlobalEvents()` (chercher `function bindGlobalEvents(){`), ajouter en première ligne du corps :
```js
bindFABEvents();
```

- [ ] **Step 5 : Supprimer le binding `chat-icon-btn` open (lignes ~3133-3137)**

Localiser et supprimer UNIQUEMENT les 4 lignes d'ouverture (garder close, modal backdrop, send, copy) :
```js
// Chat modal
var chatIconBtn = document.getElementById("chat-icon-btn");
if(chatIconBtn) chatIconBtn.addEventListener("click", function(){
  chatProjectOpen = true; render();
  setTimeout(function(){ var el = document.getElementById('chat-msgs-'+currentProjectId); if(el) el.scrollTop = el.scrollHeight; }, 50);
});
```

Garder intact tout ce qui suit (`chatCloseBtn`, `chatModal` backdrop, `chatSendBtn`, `chatInput`, `data-copy-idx`).

- [ ] **Step 6 : Supprimer le binding `chat-home-icon-btn` open (lignes ~3271-3275)**

Localiser et supprimer UNIQUEMENT :
```js
// Chat home — icône
var chatHomeIconBtn = document.getElementById("chat-home-icon-btn");
if(chatHomeIconBtn) chatHomeIconBtn.addEventListener("click", function(){
  chatHomeOpen = true; render();
  setTimeout(function(){ var el = document.getElementById('chat-msgs-home'); if(el) el.scrollTop = el.scrollHeight; }, 50);
});
```

Garder intact `chat-home-close-btn`, `chatModalHome` backdrop, `chatHomeSendBtn`, `chatHomeInput`.

- [ ] **Step 7 : Supprimer le bloc swipe detection (lignes 3309-3344)**

Localiser et supprimer intégralement :
```js
/* ---------- swipe detection (home ↔ task list) ---------- */
// capture:true = reçoit l'événement avant les enfants (tiles, scrolls, etc.)
// touchmove lock = distingue swipe H vs V avant le touchend
var swipeStartX = null, swipeStartY = null, swipeLocked = null;
window.addEventListener('touchstart', function(e){
  swipeStartX = e.touches[0].clientX;
  swipeStartY = e.touches[0].clientY;
  swipeLocked = null;
}, {passive: true, capture: true});
window.addEventListener('touchmove', function(e){
  if(swipeStartX === null || swipeLocked) return;
  var mdx = Math.abs(e.touches[0].clientX - swipeStartX);
  var mdy = Math.abs(e.touches[0].clientY - swipeStartY);
  if(mdx > 8 || mdy > 8) swipeLocked = mdx >= mdy ? 'h' : 'v';
}, {passive: true, capture: true});
window.addEventListener('touchend', function(e){
  if(swipeStartX === null) return;
  var dx = e.changedTouches[0].clientX - swipeStartX;
  var locked = swipeLocked;
  swipeStartX = null; swipeStartY = null; swipeLocked = null;
  if(locked !== 'h') return; // swipe vertical ou ambigu → ignorer
  if(!currentProjectId && !taskListOpen && dx < -80 && state.projects.length > 0){
    taskListOpen = true;
    render();
    requestAnimationFrame(function(){
      var tl = document.getElementById('tasklist-screen');
      if(tl) tl.classList.add('open');
    });
  } else if(!currentProjectId && taskListOpen && dx > 80){
    var tl = document.getElementById('tasklist-screen');
    if(tl){
      tl.classList.remove('open');
      setTimeout(function(){ taskListOpen = false; render(); }, 280);
    }
  }
}, {passive: true, capture: true});
```

- [ ] **Step 8 : Tests manuels**

Checklist à valider dans le navigateur :

1. Home (avec projets) : FAB orange visible en bas à droite. Tap → 3 items apparaissent. Tap en dehors → ferme.
2. Home : tap FAB → tap Liste → tasklist s'ouvre, aucun filtre pré-sélectionné (tous les chips neutres).
3. Vue projet : tap FAB → tap Liste → retour home + tasklist ouverte + chip du projet courant actif.
4. Vue projet : tap FAB → tap Chat IA → modal chat PROJET s'ouvre (titre = nom du projet).
5. Home : tap FAB → tap Chat IA → modal chat global s'ouvre (titre = "Vue d'ensemble").
6. Tasklist ouverte : tap FAB → icône Liste grisée, non cliquable.
7. Icône Calendrier dans toutes les vues : grisée + label "Bientôt", non cliquable.
8. Swipe horizontal sur home : ne déclenche plus l'ouverture de la tasklist.
9. Chat projet : close, envoi message, Echap → fonctionnent toujours (rien cassé sur les bindings conservés).
10. Chat home : close, envoi → fonctionnent toujours.

- [ ] **Step 9 : Commit**

```bash
cd /home/radoraj/DROPIT
git add app.html
git commit -m "feat: FAB menu complet — état, bindings, suppression swipe"
```

---

## Task 4 — SUGGERER enrichi

**Files:**
- Modify: `app.html:2503` (`generateCategorySuggestion` — ajouter param `userText`)
- Modify: `app.html:2531` (`generateProjectSuggestion` — ajouter param `userText`)
- Modify: `app.html:2838` (`performSuggestForCategory` — lire dfb-input et passer userText)
- Modify: `app.html:2854` (`performSuggestForProject` — lire dfb-proj-input et passer userText)

**Interfaces:**
- Consumes: `document.getElementById('dfb-input')`, `document.getElementById('dfb-proj-input')`
- Produces: prompts enrichis avec le texte utilisateur

- [ ] **Step 1 : Mettre à jour `performSuggestForCategory`**

Localiser (ligne ~2838) :
```js
function performSuggestForCategory(p, cat){
  generating = true;
  render();
  generateCategorySuggestion(p, cat).then(function(result){
```

Remplacer par :
```js
function performSuggestForCategory(p, cat){
  var dfbInput = document.getElementById('dfb-input');
  var userText = dfbInput ? dfbInput.value.trim() : '';
  generating = true;
  render();
  generateCategorySuggestion(p, cat, userText).then(function(result){
```

- [ ] **Step 2 : Mettre à jour `generateCategorySuggestion`**

Localiser (ligne ~2503) :
```js
function generateCategorySuggestion(p, cat){
  var doneTitles = cat.items.filter(function(it){return it.done;}).map(function(it){return it.title;});
  var remainingTitles = cat.items.filter(function(it){return !it.done;}).map(function(it){return it.title;});
  var promptText = ""+
    "Projet : "+p.title+" — "+p.summary+"\n"+
    "Catégorie : "+cat.title+"\n"+
    "Éléments déjà faits dans cette catégorie : "+JSON.stringify(doneTitles)+"\n"+
    "Éléments restants dans cette catégorie : "+JSON.stringify(remainingTitles)+"\n\n"+
    "Propose 1 à 3 nouveaux éléments concrets et courts qui manquent dans CETTE catégorie spécifiquement, sans répéter ceux déjà listés.\n"+
    'Réponds UNIQUEMENT avec un tableau JSON de chaînes, sans texte autour, sans balises markdown : ["élément a","élément b"]';
```

Remplacer par :
```js
function generateCategorySuggestion(p, cat, userText){
  var doneTitles = cat.items.filter(function(it){return it.done;}).map(function(it){return it.title;});
  var remainingTitles = cat.items.filter(function(it){return !it.done;}).map(function(it){return it.title;});
  var ctx = ""+
    "Projet : "+p.title+" — "+p.summary+"\n"+
    "Catégorie : "+cat.title+"\n"+
    "Éléments faits dans cette catégorie : "+JSON.stringify(doneTitles)+"\n"+
    "Éléments restants dans cette catégorie : "+JSON.stringify(remainingTitles);
  var promptText;
  if(!userText){
    promptText = ctx+"\n\n"+
      "Propose 1 à 3 nouveaux éléments concrets et courts qui manquent dans CETTE catégorie spécifiquement, sans répéter ceux déjà listés.\n"+
      'Réponds UNIQUEMENT avec un tableau JSON de chaînes, sans texte autour, sans balises markdown : ["élément a","élément b"]';
  } else {
    promptText = ctx+'\n\nTexte de l\'utilisateur : "'+userText+'"\n\n'+
      'Transforme ce texte en 1 à 3 nouveaux éléments concrets pour CETTE catégorie spécifiquement.\n'+
      'Règles strictes :\n'+
      '- Liste de choses → une tâche active par élément, reformulée\n'+
      '- Question → tâches qui y répondent concrètement\n'+
      '- Instructions → une tâche par étape\n'+
      '- Ne jamais recopier mot pour mot ; formuler en verbe d\'action court\n'+
      '- Ne pas répéter ce qui existe déjà dans la catégorie\n'+
      'Réponds UNIQUEMENT avec un tableau JSON de chaînes, sans texte autour : ["élément a","élément b"]';
  }
```

- [ ] **Step 3 : Mettre à jour `performSuggestForProject`**

Localiser (ligne ~2854) :
```js
function performSuggestForProject(p){
  generating = true;
  render();
  generateProjectSuggestion(p).then(function(result){
```

Remplacer par :
```js
function performSuggestForProject(p){
  var dfbProjInput = document.getElementById('dfb-proj-input');
  var userText = dfbProjInput ? dfbProjInput.value.trim() : '';
  generating = true;
  render();
  generateProjectSuggestion(p, userText).then(function(result){
```

- [ ] **Step 4 : Mettre à jour `generateProjectSuggestion`**

Localiser (ligne ~2531) :
```js
function generateProjectSuggestion(p){
  var categoriesSummary = p.categories.map(function(cat){
    return {id:cat.id, title:cat.title, items: cat.items.map(function(it){ return {title:it.title, done:it.done}; })};
  });
  var promptText = ""+
    "Projet : "+p.title+" — "+p.summary+"\n"+
    "État actuel du projet, catégorie par catégorie (JSON) : "+JSON.stringify(categoriesSummary)+"\n\n"+
    "Propose la suite la plus utile pour faire avancer ce projet, en tenant vraiment compte de ce qui est déjà fait :\n"+
    "- Si une catégorie existante a encore des éléments non faits ou manque visiblement d'un élément important, tu peux ajouter 1 à 3 nouveaux éléments à CETTE catégorie.\n"+
    "- Si toutes les catégories existantes sont terminées ou presque, propose plutôt une NOUVELLE catégorie pertinente avec ses propres éléments.\n"+
    "- Ne propose jamais un élément qui recoupe une catégorie déjà entièrement terminée.\n\n"+
    "Réponds UNIQUEMENT avec un objet JSON valide, sans texte autour, sans balises markdown, sous l'une de ces deux formes exactes :\n"+
    '{"type":"add_items","categoryId":"<id d\'une catégorie ci-dessus>","items":["élément 1","élément 2"]}\n'+
    '{"type":"new_category","category":{"title":"...","items":["élément 1","élément 2"]}}';
```

Remplacer par :
```js
function generateProjectSuggestion(p, userText){
  var categoriesSummary = p.categories.map(function(cat){
    return {id:cat.id, title:cat.title, items: cat.items.map(function(it){ return {title:it.title, done:it.done}; })};
  });
  var ctx = ""+
    "Projet : "+p.title+" — "+p.summary+"\n"+
    "État actuel du projet, catégorie par catégorie (JSON) : "+JSON.stringify(categoriesSummary);
  var userLine = userText ? '\nTexte de l\'utilisateur : "'+userText+'"' : '';
  var promptText = ctx+userLine+"\n\n"+
    "Propose la suite la plus utile pour faire avancer ce projet"+(userText?", en orientant vers ce que l'utilisateur a écrit,":"")+", en tenant vraiment compte de ce qui est déjà fait :\n"+
    "- Si une catégorie existante a encore des éléments non faits ou manque visiblement d'un élément important, tu peux ajouter 1 à 3 nouveaux éléments à CETTE catégorie.\n"+
    "- Si toutes les catégories existantes sont terminées ou presque, propose plutôt une NOUVELLE catégorie pertinente avec ses propres éléments.\n"+
    "- Ne propose jamais un élément qui recoupe une catégorie déjà entièrement terminée.\n\n"+
    "Réponds UNIQUEMENT avec un objet JSON valide, sans texte autour, sans balises markdown, sous l'une de ces deux formes exactes :\n"+
    '{"type":"add_items","categoryId":"<id d\'une catégorie ci-dessus>","items":["élément 1","élément 2"]}\n'+
    '{"type":"new_category","category":{"title":"...","items":["élément 1","élément 2"]}}';
```

- [ ] **Step 5 : Tests manuels**

1. Vue catégorie, champ vide → Suggérer → tâches logiques générées (comportement inchangé).
2. Vue catégorie, taper "commander les fournitures" → Suggérer → tâches basées sur ce texte + contexte catégorie.
3. Vue projet (multi-catégories), champ vide → Suggérer → comportement inchangé.
4. Vue projet, taper "préparer la présentation" → Suggérer → suggestion orientée vers ce texte.
5. Tasklist (tl-suggest-btn) : comportement inchangé (performTlSuggest n'a pas changé).

- [ ] **Step 6 : Commit**

```bash
cd /home/radoraj/DROPIT
git add app.html
git commit -m "feat: SUGGERER enrichi — texte du champ inclus dans le contexte prompt"
```

---

## Task 5 — Push et vérification finale

- [ ] **Step 1 : Relire les 4 zones modifiées une dernière fois**

```bash
grep -n "fab-menu-btn\|renderFAB\|bindFABEvents\|menuOpen\|swipeStartX\|chat-icon-btn\|home-swipe-hint\|generateCategorySuggestion\|generateProjectSuggestion" /home/radoraj/DROPIT/app.html
```

Vérifier :
- `swipeStartX` : 0 occurrence (tout supprimé)
- `chat-icon-btn` dans le HTML généré (ligne 2221/2266) : 0 occurrence
- `home-swipe-hint` dans le HTML généré : 0 occurrence
- `renderFAB` : 3 occurrences (dans renderHome, renderDetail, renderCategoryDetail)
- `bindFABEvents` : 2 occurrences (définition + appel)
- `generateCategorySuggestion` : prend 3 params dans sa signature

- [ ] **Step 2 : Push**

```bash
cd /home/radoraj/DROPIT
git push origin main
```
