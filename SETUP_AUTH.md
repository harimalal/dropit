# Mise en service de l'authentification

Le code est commité en local mais PAS poussé. Ces trois étapes doivent être
faites avant le push, sinon l'app en ligne tombe (l'API refusera tout).

Ordre imposé : Supabase d'abord, Cloudflare ensuite, push en dernier.

---

## Étape 1 — Table Supabase (2 min)

ATTENTION : ne pas copier depuis CE fichier, il contient du texte qui n'est
pas du SQL et l'éditeur Supabase le refusera.

Ouvrir le fichier `setup.sql` (à côté de celui-ci, dans /home/radoraj/DROPIT/),
sélectionner tout son contenu, le coller dans Supabase > SQL Editor, puis Run.

Ce fichier ne contient que du SQL, rien d'autre : aucun risque de coller un
titre ou un commentaire par erreur.

Ce que ça fait : crée la table `dropit_user_data` (une ligne par utilisateur,
projets en JSON) et active RLS sans policy, ce qui n'autorise que la
service_role_key côté serveur Cloudflare. Aucun accès direct depuis le
navigateur n'est possible.

L'ancienne table dropit_projects n'est pas touchée. Elle sert uniquement à
récupérer les projets existants lors de la première connexion.

---

## Étape 2 — Variables Cloudflare Pages (3 min)

Cloudflare Pages, projet dropit, Settings, Environment variables, Production.

Ajouter cette variable (les autres existent déjà) :

    SUPABASE_ANON_KEY = <clé anon>

Où la trouver : Supabase, Project Settings, API, section Project API keys,
ligne `anon` `public`. C'est bien la clé anon, PAS la service_role.

Variables optionnelles :

    ENABLE_GOOGLE_AUTH = true     (défaut : activé)
    ENABLE_APPLE_AUTH  = true     (défaut : désactivé, à activer plus tard)

Vérifier que SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont toujours là.

---

## Étape 3 — Google OAuth (10 min)

### 3a. Console Google Cloud

console.cloud.google.com, créer ou sélectionner un projet.

APIs & Services, Credentials, Create Credentials, OAuth client ID,
type Web application.

Dans "Authorized redirect URIs", coller exactement :

    https://<ton-ref-projet>.supabase.co/auth/v1/callback

Le `<ton-ref-projet>` est visible dans ton SUPABASE_URL.

Récupérer le Client ID et le Client Secret.

### 3b. Supabase

Supabase, Authentication, Providers, Google, activer.
Coller le Client ID et le Client Secret, Save.

### 3c. URLs de redirection

Supabase, Authentication, URL Configuration :

- Site URL : `https://dropit-dbx.pages.dev`
- Redirect URLs, ajouter : `https://dropit-dbx.pages.dev/**`

Sans cette dernière ligne, Google renvoie vers une page d'erreur après
l'authentification.

---

## Étape 4 — Confirmation d'email

Supabase, Authentication, Providers, Email.

Deux options selon ce que tu veux :

- "Confirm email" ACTIVÉ (recommandé en production) : à l'inscription,
  l'utilisateur reçoit un lien avant de pouvoir se connecter. L'app affiche
  déjà le message qui va bien.
- "Confirm email" DÉSACTIVÉ : connexion immédiate après inscription.
  Plus simple pour tester, à réactiver ensuite.

---

## Étape 5 — Push

Une fois les étapes 1 et 2 faites (3 et 4 peuvent attendre si tu te
contentes de l'email/mot de passe au début) :

    cd /home/radoraj/DROPIT && git push origin main

Cloudflare redéploie tout seul en 1 à 2 minutes.

---

## Vérification après déploiement

1. Ouvrir https://dropit-dbx.pages.dev en navigation privée
   → l'écran de connexion doit s'afficher
2. Créer un compte avec ton email
   → tes projets actuels doivent être rattachés automatiquement,
     avec le message "Tes projets ont été rattachés à ton compte"
3. Recharger la page
   → tu dois rester connecté, sans repasser par le formulaire
4. Bouton compte en haut à droite, Se déconnecter
   → retour à l'écran de connexion

Si l'écran "Service indisponible" apparaît : SUPABASE_ANON_KEY manque
dans Cloudflare, ou le déploiement n'a pas encore repris les variables.
Dans ce cas, Cloudflare Pages, Deployments, Retry deployment.

---

## Activer Apple plus tard

Le code est déjà en place. Il faudra un compte Apple Developer (99 $/an),
puis dans Supabase, Authentication, Providers, Apple : renseigner
Services ID, Team ID, Key ID et la clé .p8.
Enfin, passer ENABLE_APPLE_AUTH à `true` dans Cloudflare.
Aucune modification de code nécessaire.

Note iPhone sans Apple Sign In : le trousseau iCloud propose déjà de
mémoriser et remplir automatiquement l'email et le mot de passe. Les champs
sont balisés (`autocomplete="username"` / `current-password`) pour que iOS
le fasse correctement.
