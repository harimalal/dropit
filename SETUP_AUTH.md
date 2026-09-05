# Authentification — état et reste à faire

Mis à jour le 2026-09-05. L'authentification est EN LIGNE et fonctionnelle.

---

## Ce qui est fait

- Table `dropit_user_data` créée dans Supabase, colonnes vérifiées
  (user_id, data, updated_at), RLS activée sans policy
- `SUPABASE_ANON_KEY` ajoutée dans Cloudflare Pages (production)
- `ENABLE_GOOGLE_AUTH=false` : le bouton Google est masqué tant que le
  fournisseur n'est pas réellement configuré côté Supabase
- Code poussé et déployé sur https://dropit-dbx.pages.dev
- Vérifié en production : écran de connexion affiché, aucune erreur console,
  `/api/projects` et `/api/ai` répondent 401 sans jeton valide

Connexion par email et mot de passe : opérationnelle.

---

## À FAIRE EN PREMIER — vérifier la Site URL

Point bloquant possible, à contrôler avant de créer ton compte.

Supabase > Authentication > URL Configuration

- Site URL doit valoir exactement : `https://dropit-dbx.pages.dev`
- Redirect URLs doit contenir : `https://dropit-dbx.pages.dev/**`

Si la Site URL est restée sur la valeur par défaut (`http://localhost:3000`),
le lien de confirmation reçu par email renverra vers une page morte et tu ne
pourras pas activer ton compte.

---

## Créer ton compte

La confirmation par email est ACTIVÉE (`mailer_autoconfirm: false`).
À l'inscription tu recevras donc un lien à cliquer avant de pouvoir te
connecter. L'app affiche déjà le message correspondant.

1. Ouvrir https://dropit-dbx.pages.dev
2. Créer un compte
3. Cliquer le lien reçu par email
4. Se connecter

Tes projets actuels seront rattachés automatiquement au compte, à condition
de te connecter depuis le NAVIGATEUR où tu utilisais déjà l'app (la reprise
s'appuie sur le device_id stocké en local). Message attendu : "Tes projets
ont été rattachés à ton compte".

Depuis un autre appareil, connecte-toi d'abord sur le navigateur habituel
pour déclencher la reprise, ensuite tes projets te suivront partout.

Si l'email n'arrive pas : le SMTP par défaut de Supabase est limité à
quelques envois par heure et atterrit souvent en indésirables. Pour un usage
réel, configurer un SMTP dédié dans Supabase > Authentication > Emails.

Alternative pour tester tout de suite sans email : Supabase >
Authentication > Providers > Email, désactiver "Confirm email". La connexion
devient immédiate après inscription. À réactiver ensuite.

---

## Optionnel — activer Google (10 min)

### Console Google Cloud

console.cloud.google.com, créer ou sélectionner un projet.
APIs & Services > Credentials > Create Credentials > OAuth client ID,
type Web application.

Dans "Authorized redirect URIs", coller exactement :

    https://rcixohoduunxorkzuvde.supabase.co/auth/v1/callback

Récupérer le Client ID et le Client Secret.

### Supabase

Authentication > Providers > Google : activer, coller Client ID et
Client Secret, Save.

### Cloudflare

Il faut ensuite réafficher le bouton dans l'app. Deux options :

- Me le dire, je m'en occupe.
- Ou : Cloudflare Pages > dropit > Settings > Environment variables,
  passer `ENABLE_GOOGLE_AUTH` à `true`, puis Deployments > Retry deployment.

---

## Optionnel — activer Apple plus tard

Nécessite un compte Apple Developer (99 $/an). Ensuite, Supabase >
Authentication > Providers > Apple : Services ID, Team ID, Key ID et clé
.p8. Puis `ENABLE_APPLE_AUTH=true` dans Cloudflare. Aucun code à modifier.

Sans Sign in with Apple, l'iPhone reste confortable : les champs sont
balisés `autocomplete="username"` et `current-password`, donc le trousseau
iCloud propose de mémoriser puis remplit automatiquement.

---

## En cas de problème

Écran "Service indisponible" : `SUPABASE_ANON_KEY` absente ou déploiement
n'ayant pas repris les variables. Cloudflare Pages > Deployments >
Retry deployment.

Déconnexion en boucle : le jeton est refusé par Supabase. Vérifier que la
clé anon dans Cloudflare correspond bien au projet rcixohoduunxorkzuvde.

Projets non repris après connexion : normal depuis un navigateur autre que
celui d'origine. Voir la section "Créer ton compte" ci-dessus.
