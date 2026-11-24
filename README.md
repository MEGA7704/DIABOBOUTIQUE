# DIABO BOUTIQUE — adaptation Cloudflare

Version intermédiaire, à valider avant exploitation commerciale. Les modules HTML d'origine sont conservés dans public/gestion.html, avec stockage D1 et contrôle de concurrence optimiste. Le serveur ne recalcule pas encore les écritures financières : les administrateurs transmettent un instantané JSON. Ne pas utiliser pour des données réelles avant audit et tests.

## Déploiement
1. Décompresser et importer le contenu du dossier dans un dépôt GitHub privé.
2. Installer Node.js, puis `npm install`, `npx wrangler login`.
3. Vérifier les ressources D1/KV dans wrangler.toml. Appliquer `npm run migrate` (tables préfixées gg_).
4. Dans Cloudflare Pages, connecter le dépôt GitHub, framework Aucun, commande de build vide, dossier de sortie `public`. Configurer les bindings DB et KV selon wrangler.toml dans les paramètres de production.
5. Ajouter le secret SUPER_ADMIN_PASSWORD dans les paramètres Pages (secret fort recommandé). Déployer. Première connexion : mega@services.local et le secret choisi, puis changement obligatoire.
6. Créer une boutique, enregistrer des produits dans Gestion commerciale, publier depuis votre espace après connexion. Les paiements d'abonnement Wave doivent être vérifiés manuellement avant approbation.

## Tests et limites
`npm test` vérifie la syntaxe JS. Aucun test distant effectué. Tester l'inscription, les sessions, l'isolation, les conflits de sauvegarde, les expirations et les impressions sur une instance de test. Les commandes clients, panier, favoris, permissions internes, récupération administrative, justificatifs, Open Graph dynamique, audit financier détaillé, notifications et validation financière côté serveur restent à développer. Le catalogue publié est un instantané, à republier après modification. Les images utilisent des URL HTTPS externes. Les routes et l'interface ne couvrent pas encore toutes les exigences. L'expiration bloque les sauvegardes serveur et masque le catalogue, mais la fenêtre automatique n'est pas implémentée. Les anciens JSON peuvent être restaurés via les paramètres, sous réserve de validation ; conserver une copie originale. Les données ne se synchronisent pas automatiquement en temps réel : actualiser la page. Les tests de sécurité et de charge sont indispensables. La configuration n'a pas été déployée sur votre compte.

## Identité et navigation
Le projet est nommé `diabo-boutique`. Le menu public comporte Accueil et les deux accès de connexion/inscription. Les identifiants techniques des anciennes sauvegardes JSON sont conservés pour la compatibilité. Si vous mettez à jour un projet Pages existant, conservez son nom dans Cloudflare ou créez un nouveau projet nommé diabo-boutique.

## Correction inscription V4.1
Dans Cloudflare > D1 > mirabelle_d1 > Console, exécuter le contenu de migrations/0001_initial.sql si les tables n'existent pas. Ce script est idempotent pour les tables compatibles et ne supprime pas les données. Si DB_SCHEMA persiste, vérifier les colonnes via PRAGMA table_info(gg_users); et consulter les logs Pages Functions. Ne pas supprimer les tables. Vérifier le binding DB dans l'environnement Production (et Preview si utilisé). Redéployer. Les inscriptions utilisent des colonnes explicites et une transaction D1. Les erreurs de doublon, de liaison et de schéma ont des messages distincts.

## V4.2 — Interface pleine largeur
Les deux accès publics ouvrent une fenêtre modale avec connexion et inscription. Les URL directes restent accessibles. Aucun changement des migrations ni des bindings.
