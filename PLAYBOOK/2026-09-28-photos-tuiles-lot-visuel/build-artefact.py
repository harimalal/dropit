#!/usr/bin/env python3
"""Génère SLIDES.html (document complet, comme les autres decks du dépôt) et
dist/artefact.html (fragment sans <html>/<head>/<body>, tel que l'attend la
publication d'artefact) à partir d'une seule source.

CSS = celui du dernier deck (structure inchangée), sauf l'accent, passé à la
couleur de marque de Dropit, et quelques ajustements de mise en page mobile.
"""
import os, re

HERE = os.path.dirname(os.path.abspath(__file__))
REF = os.path.join(HERE, '..', '2026-09-06-onboarding-securite-landing', 'SLIDES.html')

ref = open(REF, encoding='utf-8').read()
css = ref[ref.index('<style>') + 7: ref.index('</style>')]

def sub(old, new):
    global css
    assert css.count(old) == 1, old
    css = css.replace(old, new)

# Accent = terracotta Dropit (#BF5B44 assombri pour tenir 4,5:1 en petit texte sur fond clair)
sub('--accent: #3F8A5C; --accent-soft: #E3EFE6;', '--accent: #B04E38; --accent-soft: #F3E2DC;')
sub('--night-accent: #4ADE80; --night-accent-soft: rgba(74,222,128,.15);',
    '--night-accent: #E5866D; --night-accent-soft: rgba(229,134,109,.16);')
# Hauteur : 100% (pas 100vh) pour respecter le padding de zone de sécurité de la page hôte
sub('.deck { width: 100%; height: 100vh;', '.deck { width: 100%; height: 100%;')
sub('.nav-buttons { position: fixed; bottom: 26px; right: 32px;',
    '.nav-buttons { position: fixed; bottom: calc(26px + env(safe-area-inset-bottom, 0px)); right: 32px;')
sub('.counter { position: fixed; bottom: 28px; left: 56px;',
    '.counter { position: fixed; bottom: calc(28px + env(safe-area-inset-bottom, 0px)); left: 56px;')
sub('.rail { display: none; }', '.rail { display: none; }\n    .counter { left: 20px; }\n    .nav-buttons { right: 16px; }')
css += """
  :root { color-scheme: light; }
  html, body { background: var(--paper); color: var(--ink); }
  .slide { min-width: 0; }
  .io-card .io-body { overflow-wrap: anywhere; }
  /* Centrage vertical par espaceurs : avec justify-content:center, un contenu plus haut que
     l'écran déborde des deux côtés et le haut (titre, eyebrow) est rogné, inatteignable au
     défilement. Les espaceurs se replient à 0 quand la place manque : le contenu démarre en haut. */
  .slide { justify-content: flex-start; }
  .slide::before, .slide::after { content: ''; flex: 1 1 0; min-height: 0; }
  .light .terme .t-label { color: #8A5409; }
  .shot .cap { font-size: .78rem; margin-top: 8px; color: var(--ink-soft); max-width: none; }
  .dark .shot .cap { color: var(--night-ink-soft); }
"""

def icon(path):
    return f'<svg class="icon" viewBox="0 0 24 24">{path}</svg>'

I = {
  'search':  icon('<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>'),
  'msg':     icon('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 8h10M7 12h10M7 16h6"/>'),
  'alert':   icon('<path d="M12 9v4M12 17h.01"/><circle cx="12" cy="12" r="9"/>'),
  'swap':    icon('<path d="M7 7h12l-3-3M17 17H5l3 3"/>'),
  'star':    icon('<path d="M12 3l3 6 6 1-4.5 4 1 6-5.5-3-5.5 3 1-6L3 10l6-1z"/>'),
  'image':   icon('<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="M21 16l-5-5-8 8"/>'),
  'refresh': icon('<path d="M20 11a8 8 0 1 0-2 5.3"/><path d="M20 4v7h-7"/>'),
  'cloud':   icon('<path d="M7 18a4.5 4.5 0 0 1-.5-9A6 6 0 0 1 18 9.5 4 4 0 0 1 17.5 18z"/>'),
  'type':    icon('<path d="M5 6h14M12 6v13M9 19h6"/>'),
  'layout':  icon('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M9 10v10"/>'),
  'users':   icon('<circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0 1 12 0M17 4.5a3 3 0 0 1 0 6M21 20a6 6 0 0 0-4-5.6"/>'),
  'bars':    icon('<path d="M5 20V10M12 20V4M19 20v-7"/>'),
  'bulb':    icon('<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>'),
  'flag':    icon('<path d="M5 21V4M5 4h12l-2 4 2 4H5"/>'),
  'check':   icon('<path d="M5 12l4.5 4.5L19 7"/>'),
  'todo':    icon('<circle cx="12" cy="12" r="8"/>'),
}

TODO = I['todo'].replace('class="icon"', 'class="icon todo"')

def eyebrow(ic, label, n):
    return f'<div class="eyebrow">{I[ic]}{label} <span class="chap">· {n:02d}</span></div>'

def vo(text):
    return f'<div class="vo"><span class="vo-tag">Narration</span>{text}</div>'

def loop(text):
    return f'<div class="loop">{text}</div>'

def terme(term, definition):
    return ('<div class="terme"><div class="t-label">Terme à retenir</div>'
            f'<div class="t-term">{term}</div><div class="t-def">{definition}</div></div>')

def box(tag, title, body=None, items=None):
    inner = f'<span class="box-tag">{tag}</span><h3>{title}</h3>'
    if body: inner += f'<p>{body}</p>'
    if items: inner += '<ul>' + ''.join(f'<li>{x}</li>' for x in items) + '</ul>'
    return f'<div class="box">{inner}</div>'

def steps(rows):
    out = '<div class="case-steps">'
    for i, (title, desc, resolved) in enumerate(rows, 1):
        cls = 'case-step resolved' if resolved else 'case-step'
        out += (f'<div class="{cls}"><div class="case-num">{i}</div>'
                f'<div class="case-title">{title}</div><div class="case-desc">{desc}</div></div>')
    return out + '</div>'

def slide(kind, body, active=False):
    cls = f'slide {kind}' + (' active' if active else '')
    return f'\n  <section class="{cls}">\n    ' + body + '\n  </section>\n'

S = []

# 1 · COLD OPEN
S.append(slide('dark',
    eyebrow('search', 'Dropit · le sujet', 1) +
    '<h1 class="display">14 commits, une appli transformée — et ce soir, la production n\'affichait rien.</h1>' +
    vo('Aujourd\'hui, les tuiles de l\'accueil ont reçu de vraies photos, une barre de progression, un nouveau bouton Drop it. '
       'Sur GitHub, tout était en ligne. Sur l\'écran de l\'utilisateur, rien ne bougeait.') +
    loop('Pour comprendre pourquoi, il faut revenir au tout début de la journée.') +
    '<p class="ink-soft mono" style="margin-top:22px;font-size:.8rem;">2026-09-28 · Claude Code (cloud) · lecture ~6 min</p>',
    active=True))

# 2 · DONNÉE D'ENTRÉE
S.append(slide('light',
    eyebrow('msg', 'La commande', 2) +
    '<h2>La phrase qui a lancé la journée.</h2>' +
    vo('Pas un cahier des charges. Une phrase dictée, prise telle quelle.') +
    '<div class="io-card mono-body"><div class="io-label">' + icon('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 8h10M7 12h10M7 16h6"/>').replace('class="icon"','class="icon" style="width:13px;height:13px"') +
    'Message reçu</div><div class="io-body">"Je veux lancer le chantier du changement de lot de la page d\'accueil avec les photos. Et la petite icône dans le coin"</div></div>' +
    loop('Sauf qu\'un chantier plus ancien disait presque le contraire.')))

# 3 · ENJEU
S.append(slide('dark',
    eyebrow('alert', 'L\'enjeu', 3) +
    '<h2 class="display">Une tuile a une seconde pour dire de quoi il s\'agit.</h2>' +
    vo('L\'accueil de Dropit est une mosaïque : un projet, une tuile. Jusqu\'ici, une icône sur un fond de couleur. '
       'Le pari de la journée : une photo se reconnaît plus vite.') +
    terme('Treemap', 'Une mosaïque où la taille de chaque tuile reflète le poids du projet : plus il a de tâches, plus il est grand.') +
    loop('Le pari avait un problème : le plan de départ reposait sur une IA qui génère des images.')))

# 4 · RECADRAGE
S.append(slide('light',
    eyebrow('swap', 'Le recadrage', 4) +
    '<h2>Fini l\'image générée : de vraies photos.</h2>' +
    vo('Le cadrage du 8 septembre prévoyait une image générée par IA, révélée tuile par tuile au fil des tâches. '
       'Bloqué : aucun service d\'image n\'avait été choisi. La journée a tranché autrement.') +
    '<div class="grid-2">' +
    box('Avant · cadrage du 8 sept.', 'Une image générée', items=[
        'Générée par un service tiers, jamais choisi',
        'Révélée tuile par tuile, selon les tâches faites',
        'Chantier bloqué en attente de ce service']) +
    box('Après · décidé ce matin', 'Une vraie photo', items=[
        'Photo Pexels en fond de tuile',
        'Une seule par projet, sauvegardée',
        'L\'icône reste, en petit badge dans le coin']) +
    '</div>' +
    loop('Restait à décider comment une photo peut « représenter » une icône.')))

# 5 · MÉTHODE
S.append(slide('dark',
    eyebrow('star', 'La méthode', 5) +
    '<h2 class="display">Quatre réflexes qui reviennent toute la journée.</h2>' +
    vo('Rien ne part en ligne sans preuve, et une supposition ne compte jamais comme une preuve.') +
    '<div class="grid-4">' +
    box('1 · Vrai navigateur', 'Tester avant de pousser', items=['Playwright sur l\'app réelle, données simulées', 'Jamais « ça devrait marcher »']) +
    box('2 · La base avant l\'intuition', 'Lire ce qui s\'est passé', items=['Requêtes réelles sur Supabase', 'Les bugs de sauvegarde ont été prouvés, pas devinés']) +
    box('3 · Un dossier par livraison', 'Les preuves restent', items=['9 dossiers de scripts et de captures', 'Versionnés dans le dépôt, pas dans le bac à sable']) +
    box('4 · Un journal qui ne se réécrit pas', 'Une ligne par événement', items=['Le fichier d\'état ne fait que s\'allonger', 'On relit l\'histoire, on ne la réécrit pas']) +
    '</div>' +
    loop('Premier livrable : faire dire à la photo la même chose que l\'icône.')))

# 6 · LIVRABLE 1
S.append(slide('light',
    eyebrow('image', 'Livrable 1', 6) +
    '<h2>La photo, c\'est l\'icône en vrai.</h2>' +
    vo('Chaque projet tombe dans un domaine parmi sept. Le domaine choisit à la fois l\'icône et les mots de la recherche de photo : les deux ne peuvent plus se contredire.') +
    '<div class="grid-2">' +
    box('Objectif', 'Une photo qui colle à l\'icône', body='Une voiture en icône, une voiture en photo.') +
    box('Comment', 'Une règle, pas deux choix', items=[
        'Sept domaines fixes, un seul décide de tout',
        'Requête = mots-clés du domaine + détail du projet',
        'Visage de face exclu ; mains et silhouettes acceptées']) +
    '</div>' +
    terme('Domaine visuel', 'L\'une des sept catégories fixes (famille, voyage, maison, sport, business, créativité, apprentissage).') +
    '<p class="ink-soft mono" style="margin-top:14px;font-size:.76rem;">Commits 75b24fd · 3980de5. Limite : le filtre de visages lit le texte descriptif de la photo, il n\'est pas infaillible.</p>' +
    loop('Et quand la photo tombe mal ? Il fallait un bouton pour en changer.')))

# 7 · LIVRABLE 2
S.append(slide('dark',
    eyebrow('refresh', 'Livrable 2', 7) +
    '<h2 class="display">Un bouton pour changer d\'avis, et une course perdue d\'avance.</h2>' +
    vo('« Changer la photo » relance la recherche. Sauf que l\'écran redessine les tuiles en arrière-plan et relançait, lui, une recherche automatique avec le titre brut. '
       'La plus rapide gagnait, et ce n\'était pas celle qu\'on voulait.') +
    steps([
        ('Le clic', 'Le projet est reclassé dans un domaine à partir de son titre et de son icône, par le modèle rapide.', False),
        ('La course', 'Pendant ce temps, l\'écran se redessine et lance le remplissage automatique, plus rapide que la reclassification.', False),
        ('Le correctif', 'Le drapeau anti-doublon est posé avant tout redessin. Vérifié : un seul appel photo, avec la bonne requête.', True),
    ]) +
    loop('Le bouton marchait. Mais à la reconnexion, l\'ancienne photo revenait.')))

# 8 · GRAIN DE SABLE
S.append(slide('dark',
    eyebrow('cloud', 'Le grain de sable', 8) +
    '<h2 class="display">Ta photo change… puis l\'ancienne revient.</h2>' +
    vo('Le changement s\'affichait, puis disparaissait à la reconnexion. Premier réflexe : ne pas deviner, aller lire la base.') +
    steps([
        ('Le constat', 'La base : 39 appels photo en 6 minutes pour 8 projets, et la date de dernière sauvegarde qui ne bouge jamais.', False),
        ('Un premier correctif, insuffisant', 'Réessayer 4 fois de suite au lieu d\'une seule. Ça ne suffisait pas.', False),
        ('La vraie cause', 'Web et application ouverts en même temps : chaque session remplit ses photos et écrase celle de l\'autre.', False),
        ('Le correctif', 'Attendre un temps au hasard avant chaque nouvel essai, 5 essais au total. Testé avec deux pages simultanées : 4 photos, 1 conflit résolu, rien de perdu.', True),
    ]) +
    terme('Backoff aléatoire', 'Attendre un délai au hasard avant de réessayer, pour que deux sessions en conflit ne repartent pas au même instant.') +
    loop('Un bug de sauvegarde réglé. Restait un défaut bien plus visible : les titres coupés.')))

# 9 · LIVRABLE 3
S.append(slide('light',
    eyebrow('type', 'Livrable 3', 9) +
    '<h2>Le titre coupé cachait trois bugs, pas un.</h2>' +
    vo('Chaque correctif semblait marcher, puis un autre titre restait coupé. Il a fallu mesurer la hauteur réelle du texte, avec et sans coupure, pour les voir un par un.') +
    '<div class="grid-4">' +
    box('Bug 1', 'Le titre écrasé', body='Le conteneur rétrécissait le titre sous ses deux lignes. Il manquait une seule règle de style.') +
    box('Bug 2', 'Une largeur surestimée', body='Le calcul de la taille de police oubliait environ 15 px de marge de chaque côté.') +
    box('Bug 3', 'Une lichette de 3e ligne', body='La coupe se fait au bord de la marge, pas du texte : 3 px de la ligne suivante dépassaient sous l\'encadré.') +
    '</div>' +
    terme('Troncature multi-ligne', 'Couper un texte après un nombre de lignes fixé et finir par « … ». Elle coupe là où le style le lui dit, pas là où le texte s\'arrête.') +
    '<p class="ink-soft mono" style="margin-top:14px;font-size:.76rem;">Limite assumée : un titre de 4-5 mots sur une tuile étroite finit encore par « … », à la taille minimale lisible (8 px).</p>' +
    loop('Et ce n\'était que l\'accueil. Le reste du lot changeait quatre écrans.')))

# 10 · LIVRABLE 4 (images)
S.append(slide('dark',
    eyebrow('layout', 'Livrable 4', 10) +
    '<h2 class="display">Sept changements d\'un coup, sur quatre écrans.</h2>' +
    vo('Barre de progression à la place de l\'anneau, icônes sans cadre, salutation en français, Drop it au centre de la barre de navigation, '
       'en-tête Drop Zone façon page d\'accueil publique, liste plus nette, et une fenêtre projet avec sa barre d\'étapes.') +
    '<div class="shot-compare">'
    '<div class="shot after"><div class="shot-label">Accueil</div><img src="assets/shot-accueil.png" alt="Accueil : tuiles avec barre de progression, bouton Drop it au centre de la barre de navigation"></div>'
    '<div class="shot after"><div class="shot-label">Fenêtre projet</div><img src="assets/shot-projet.png" alt="Fenêtre projet : icône en badge, titre à gauche, barre d\'étapes fusionnée avec la progression"></div>'
    '</div>'
    '<p class="ink-soft" style="font-size:.78rem;margin-top:10px;">Captures du banc de test, données fictives.</p>' +
    loop('Un détail a failli tout gâcher : le bouton Drop it existait en double.')))

# 11 · PREUVE
S.append(slide('light',
    eyebrow('users', 'Livrable 5', 11) +
    '<h2>Le bouton Drop it existait en double.</h2>' +
    vo('Sur l\'écran projet, deux barres de navigation vivent dans la page en même temps. Un clic sur la mauvaise ne fait rien. '
       'Un compteur mis à jour sur une seule des deux ment sur l\'autre.') +
    '<div class="io-card mono-body"><div class="io-label">' + I['check'].replace('class="icon"','class="icon" style="width:13px;height:13px"') +
    'Sortie réelle du test</div><div class="io-body">{ "tabbarsInDom": 2,\n  "sheetOpensFromDetail": true,\n  "badgesAfterAdd": ["4", "4"],\n  "badgesAfterCheck": ["3", "3"],\n  "errors": [] }</div></div>' +
    loop('Tout marchait en test. Restait à le voir marcher en vrai.')))

# 12 · RETOURNEMENT
S.append(slide('dark',
    eyebrow('flag', 'Le retournement', 12) +
    '<h2 class="display">Tout était juste dans le code. La production montrait l\'ancienne version.</h2>' +
    vo('Le dernier lot était bien sur GitHub. Mais le dernier déploiement de production affichait un commit plus ancien.') +
    steps([
        ('Vérifié côté git', 'Le commit b1aa1ce est bien sur main.', False),
        ('Vérifié côté Cloudflare, par toi', 'Le dernier déploiement de production est c5b5435, daté après b1aa1ce.', False),
        ('Le geste', 'Relancer le déploiement de la ligne b1aa1ce. Réponse : « ça a marché ».', True),
        ('La cause', 'Non prouvée : réglage de la branche de production, plusieurs projets Pages sur le même dépôt, ou intégration GitHub à réinstaller.', False),
    ]) +
    terme('Production ou preview', 'Preview : une version d\'essai créée à chaque push. Production : ce que voient vraiment tes utilisateurs sur le domaine.') +
    loop('Pour ne plus dépendre de toi pour le savoir, il manque un jeton.')))

# 13 · CHIFFRES
S.append(slide('light',
    eyebrow('bars', 'Les chiffres', 13) +
    '<h2>Ce que disent les horodatages git.</h2>' +
    vo('Le temps actif ne se lit pas dans git : la journée compte de longues pauses. Ce qui se compte, c\'est ce qui est sorti.') +
    '<div class="stat-grid">'
    '<div class="stat-card time"><div class="stat-value">15 h 49</div><div class="stat-label">d\'amplitude, de 06:36 à 22:25, avec deux pauses de plus de 2 h : ce n\'est pas du temps de travail</div></div>'
    '<div class="stat-card"><div class="stat-value good">14</div><div class="stat-label">commits, tous poussés sur main</div></div>'
    '<div class="stat-card"><div class="stat-value">9</div><div class="stat-label">dossiers de preuves : scripts et captures</div></div>'
    '<div class="stat-card"><div class="stat-value">0</div><div class="stat-label">erreur JS sur les 4 écrans du lot</div></div>'
    '</div>' +
    loop('Reste une question qui fâche : qui a décidé quoi ?')))

# 14 · QUI DÉCIDE QUOI
S.append(slide('dark',
    eyebrow('users', 'Qui décide quoi', 14) +
    '<h2 class="display">13 commits sur 14 viennent d\'une demande de l\'utilisateur.</h2>' +
    vo('Les 14 commits sont signés Claude, le code aussi. Mais chaque virage est venu de l\'utilisateur : des photos plutôt qu\'une image générée, 70 % d\'opacité puis retour à 100 %, l\'ordre des chantiers. '
       'Le dernier commit est une note d\'état.') +
    '<div class="control-split">'
    '<div class="control-col"><h3>' + I['flag'] + 'Décidé par l\'utilisateur</h3><ul>'
    '<li>Une banque de photos plutôt qu\'une image générée</li>'
    '<li>Photo à 100 % d\'opacité, après un essai à 70 %</li>'
    '<li>L\'icône reste, en petit badge</li>'
    '<li>Quoi corriger, et dans quel ordre</li></ul></div>'
    '<div class="control-col"><h3>' + I['bulb'] + 'Fait par Claude</h3><ul>'
    '<li>Diagnostics en lisant la base réelle</li>'
    '<li>Correctifs, testés dans un vrai navigateur</li>'
    '<li>Journal, dossiers de preuves, cockpit</li>'
    '<li>Aucune clé secrète côté client</li></ul></div>'
    '</div>' +
    loop('Il reste ce qui dépend de toi, maintenant.')))

# 15 · CHECKLIST
S.append(slide('dark',
    eyebrow('check', 'La checklist de sortie', 15) +
    '<h2 class="display">Ce qui est fini. Ce qui dépend de toi.</h2>' +
    '<ul class="checklist">'
    f'<li>{I["check"]}<span>Lot visuel en production, déployé à la main</span></li>'
    f'<li>{I["check"]}<span>Journal de session, historique et playbook enregistrés</span></li>'
    f'<li>{I["check"]}<span>Cockpit mis à jour</span></li>'
    f'<li>{I["check"]}<span>Ce deck, publié</span></li>'
    f'<li>{TODO}<span>Regarder le titre blanc sur une vraie photo, en production</span></li>'
    f'<li>{TODO}<span>Enregistrer le jeton Cloudflare (permission Pages, en édition), l\'accès réseau et l\'identifiant de compte</span></li>'
    f'<li>{TODO}<span>Ouvrir une nouvelle session pour que je déploie et vérifie seul</span></li>'
    '</ul>' +
    loop('Et une dernière chose que personne ne te dit.')))

# 16 · LE TRUC QUE PERSONNE NE DIT
S.append(slide('light',
    eyebrow('bulb', 'Le truc que personne ne te dit', 16) +
    '<h2>Un zéro peut être un silence.</h2>' +
    vo('Aujourd\'hui, une commande bloquée par le réseau a rendu du vide. Compté comme « zéro résultat », il a fait croire que le bouton n\'existait pas en production. '
       'Un titre corrigé qui « semble » bon, quatre essais qui « suffisent » : trois fois la même erreur, prendre l\'absence de mauvaise nouvelle pour une bonne nouvelle.') +
    terme('Faux négatif', 'Un test qui ne trouve rien parce qu\'il n\'a rien pu regarder, et non parce qu\'il n\'y a rien à trouver.') +
    loop('Alors la prochaine fois, on regarde ce qui est vraiment déployé.')))

# 17 · CLÔTURE
S.append(slide('dark',
    eyebrow('flag', 'La suite', 17) +
    '<h1 class="display">14 commits, et un seul compte : celui que la production affiche.</h1>' +
    vo('Le code est fini. Il reste une seule action : enregistrer le jeton Cloudflare et l\'accès réseau, puis ouvrir une nouvelle session.') +
    loop('Prochain épisode : la production se vérifie toute seule, après chaque push.')))

slides_html = ''.join(S)
n = len(S)

script = """
  const slides = Array.from(document.querySelectorAll('.slide'));
  const rail = document.getElementById('rail');
  const counter = document.getElementById('counter');
  let i = 0;
  slides.forEach((_, idx) => {
    const t = document.createElement('div');
    t.className = 'tick' + (idx === 0 ? ' active' : '');
    t.addEventListener('click', () => go(idx));
    rail.appendChild(t);
  });
  const ticks = Array.from(rail.children);
  counter.textContent = '01 / ' + String(slides.length).padStart(2, '0');
  function go(n) {
    if (n < 0 || n >= slides.length || n === i) return;
    slides[i].classList.remove('active'); ticks[i].classList.remove('active');
    i = n;
    const incoming = slides[i];
    incoming.classList.remove('active'); void incoming.offsetWidth; incoming.classList.add('active');
    ticks[i].classList.add('active');
    counter.textContent = String(i + 1).padStart(2, '0') + ' / ' + String(slides.length).padStart(2, '0');
    document.getElementById('prev').disabled = i === 0;
    document.getElementById('next').disabled = i === slides.length - 1;
    incoming.scrollTop = 0;
  }
  document.getElementById('next').addEventListener('click', () => go(i + 1));
  document.getElementById('prev').addEventListener('click', () => go(i - 1));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); go(i + 1); }
    if (e.key === 'ArrowLeft') go(i - 1);
  });
  document.getElementById('prev').disabled = true;
"""

fonts = ('<link rel="preconnect" href="https://fonts.googleapis.com">\n'
         '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
         '<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet">\n')

TITLE = 'Le jour des tuiles'
chrome = (f'<div class="rail" id="rail"></div>\n<div class="counter" id="counter">01 / {n:02d}</div>\n'
          '<div class="nav-buttons">\n  <button class="nav-btn" id="prev">← préc.</button>\n  <button class="nav-btn" id="next">suiv. →</button>\n</div>\n')

body = f'<div class="deck" id="deck">{slides_html}\n</div>\n\n{chrome}\n<script>{script}</script>\n'

full = ('<!DOCTYPE html>\n<html lang="fr">\n<head>\n<meta charset="UTF-8">\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">\n'
        f'<title>DROPIT — {TITLE}</title>\n{fonts}<style>{css}</style>\n</head>\n<body>\n{body}</body>\n</html>\n')
open(os.path.join(HERE, 'SLIDES.html'), 'w', encoding='utf-8').write(full)

os.makedirs(os.path.join(HERE, 'dist'), exist_ok=True)
fragment = f'<title>{TITLE}</title>\n{fonts}<style>{css}</style>\n{body}'
open(os.path.join(HERE, 'dist', 'artefact.html'), 'w', encoding='utf-8').write(fragment)
print(f'{n} scènes — SLIDES.html {len(full)//1024} Ko, dist/artefact.html {len(fragment)//1024} Ko')
