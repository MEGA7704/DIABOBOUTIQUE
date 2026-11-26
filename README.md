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

## V5 — Inspiration GLOBAL MARKET
Catalogue sans grande bannière, catégories rapides, filtres boutique/type, 16 offres par page, deux colonnes mobiles, partage WhatsApp. Design de gestion harmonisé. Aucun changement de schéma, de Worker, de tarifs ou de bindings. Les fonctionnalités non finalisées de V4 restent non finalisées.

### V5.1
V5.2 : les administrateurs arrivent sur `/gestion/dashboard`. La publication est intégrée au formulaire Produits & services. Les publications existantes sont récupérées à la lecture. Les images JPEG compressées sont stockées dans D1, sans R2 ; limite par image 110 000 caractères, limite globale des données 1,7 million de caractères. Les nouvelles fiches sont masquées par défaut. Aucun changement SQL. Recharger les anciens onglets après déploiement.

## V5.3 — Espace client et commandes multi-boutiques
**Avant déploiement :** exécuter `migrations/0002_client_orders.sql` dans la console D1 mirabelle_d1, ou appliquer les migrations avec Wrangler. Ne pas supprimer les anciennes tables. Ce script est réexécutable. Les nouvelles tables sont gg_client_state et gg_orders.
Après connexion, les clients arrivent sur /client/panier. Les favoris, coordonnées et profil sont enregistrés sur D1. Les commandes sont séparées par boutique, avec prix vérifiés côté serveur. Le commerçant utilise /gestion/commandes pour valider ou refuser, puis enregistrer le montant intégral réellement reçu et une référence unique. L’encaissement crée une facture, une vente et la mise à jour du stock dans un batch D1. Une commande en attente ou validée mais non payée ne crée aucune vente. Les stocks ne sont pas réservés avant paiement ; ils sont vérifiés de nouveau à l’encaissement. Les frais de livraison ne sont pas calculés. Aucun débit automatique ni contrôle de transaction Wave n’est fourni. Paiements partiels et remboursements des commandes web non pris en charge. Le changement de mot de passe demande le mot de passe actuel hors première connexion forcée. Les anciennes écritures commerciales hors commandes web reposent toujours sur le système JSON existant, non audité.
Tests : `npm test` avec Node 22+ (SQLite expérimental) exécute des requêtes Worker sur un adaptateur D1 local transactionnel. Les tests distants, concurrence réelle D1 et tests navigateur restent indispensables.

## V5.4 — Paiement, livraison et expédition
Appliquer `migrations/0003_delivery.sql` sur D1 avant le déploiement (les migrations précédentes restent nécessaires pour une base neuve). Dans Paramètres > Définir paiement-livraison-expéditions, saisir la ville, jusqu'à 15 quartiers et 15 autres villes, ainsi que les modes et tarifs fixes. Les 15 emplacements de quartiers sont à renseigner, faute de liste de noms fournie. Retrait gratuit même avant configuration. Le barème local s'applique au sous-total de chaque boutique, arrondi au franc le plus proche ; sous 5 F, frais nuls. Les moyens d'expédition sont facturés au tarif fixe uniquement. Dans le panier, choisir par boutique puis calculer les frais avant l'envoi. Le serveur recalcule et vérifie le total lors de la commande. Les frais figurent sur la facture comme ligne de service ; les coûts réels de transport doivent être enregistrés en dépenses. Wave et USDT sont optionnels, propres à chaque boutique, affichés après validation de commande. Le lien Wave contient le montant total en FCFA ; l'adresse TRC20 est contrôlée syntaxiquement seulement et le montant USDT doit être convenu avec le commerçant (pas de conversion automatique). Aucun encaissement automatique : confirmation manuelle du paiement intégral. Tests locaux Node/SQLite, pas de test Cloudflare ni navigateur réel.

## V5.5 — Règlement des achats
Appliquer une seule fois `migrations/0004_payment_declaration.sql` sur D1 avant de déployer (deux colonnes ajoutées, aucune suppression). Si la migration a déjà été appliquée, ne pas la rejouer. Après validation de la commande, le client ouvre « Régler mon achat », consulte les coordonnées de paiement configurées, puis déclare le règlement avec sa référence. La déclaration ne constitue pas une preuve de paiement. Le commerçant peut signaler un paiement non reçu (motif et nouvelle tentative) ou confirmer le montant réellement reçu pour clôturer la vente. Les règlements directs constatés par le commerçant restent possibles. Les écritures de vente et de stock restent atomiques avec la clôture de commande. Actualiser les commandes pour voir les nouveaux états. Wave et USDT ne sont pas vérifiés automatiquement ; pour USDT, convenir du montant avec la boutique. Tests locaux : npm test (Node 22 avec SQLite). Déploiement Cloudflare réel non testé.

## V5.6 — Navigation authentifiée
Le catalogue public détecte la session professionnelle et affiche Mon espace boutique et Déconnexion. Les accès client ne remplacent pas une session professionnelle existante. Le cookie HttpOnly reste valable 24 heures; changement de mot de passe et expiration restent des exceptions de sécurité. Aucune migration supplémentaire.


## Mise à jour V5.7
- Menu horizontal boutique réorganisé sur une seule ligne.
- Icônes retirées des onglets du menu principal.
- Lien "Paramètres / abonnement" retiré du coin supérieur.
- Bouton "Déconnexion" remplacé par une icône seule.

## V5.8
Menu boutique sans défilement horizontal : Commerce, Finances, Suivi et accès directs. Sur mobile, bouton Menu déroulant. Aucune migration.

## V5.9 — Panier et commande
Liste unique, fenêtre de commande, adresse par boutique et devis serveur. Aucun changement SQL requis.


## Mise à jour V6.0
- Refonte visuelle de la section Mon panier.
- Nouveau pop-up de commande plus professionnel.
- Présentation en cartes et résumé amélioré.


## Mise à jour V6.1
- Commandes en petites bandes cliquables.
- Détail des commandes en pop-up.
- Bouton « Régler mon achat » déplacé dans le pop-up.

## V6.2
Commandes reçues : liste compacte et détail en fenêtre modale, actions existantes conservées. Aucune migration.

## V6.3 — Confirmation obligatoire de la déclaration client
Aucun encaissement de commande sans déclaration préalable. Référence, mode, montant et identifiant de déclaration contrôlés côté serveur. En cas de non-réception, rejeter la déclaration pour permettre au client de la renouveler. Aucune migration supplémentaire.


## V6.4 — Catalogue public
Cartes compactes, images non recadrées, filtres regroupés et pagination masquée pour une seule page. Aucune migration.

## V6.5
Catalogue public simplifié : suppression du titre, du sous-titre, du compteur, des catégories rapides et du filtre localisation.

## V6.6 — Administration
Tableau des boutiques, plans, prolongations, archivage réversible, sessions et demandes de paiement. Aucune migration supplémentaire.

## V6.7 — Récupération de compte
Exécuter migrations/0005_password_recovery.sql avant déploiement. Demandes clients et boutiques, validation manuelle de l’identité par le Super Admin, code aléatoire à usage unique valable 30 minutes, transmis manuellement par canal vérifié. Aucun envoi automatique.


## V6.8 — Paramètres et notifications
Rubriques internes par boutons, formulaires conservés, fenêtres communes pour alertes, confirmations, saisies et messages dynamiques. Aucune migration supplémentaire. Les validations natives des champs et fenêtres système du navigateur restent natives.


## V6.9 — Charges de livraison et expédition
Les frais facturés au client sont inclus dans le total de facture et neutralisés par un coût direct équivalent. Les anciens frais de commandes en ligne sont corrigés au calcul des rapports et obligations, sans réécriture des ventes protégées. Les entrées de caisse restent les sommes réellement encaissées ; aucun décaissement fictif n'est créé. Si le coût réel du transport est enregistré en dépense, éviter une seconde imputation de la même charge dans le résultat (la présente version ne rapproche pas automatiquement ces dépenses). Les obligations déjà réglées ne sont pas annulées automatiquement. Aucune migration D1 supplémentaire.


## V7.0
Champ Frais de service (FCFA) affiché uniquement pour le type Service, enregistré dans le catalogue interne, valeur par défaut 0. Aucun changement des calculs de vente ou de bénéfice. Aucune migration SQL.

## V7.1 — Catégories et modes de facturation des services
35 catégories prédéfinies et 11 modes, avec Autre dans chaque liste. Les valeurs personnalisées sont conservées dans les données D1 propres à chaque boutique. Le mode de facturation est descriptif, sans calcul automatique de durée, surface ou commission. Aucune migration SQL.

## V7.2 — Formulaire de tarification des services

Stock et seuil d'alerte réservés aux produits. Prix libellé selon le mode, marge brute en pourcentage du prix de vente (coût estimé = prix × (1 − marge/100), arrondi au FCFA), taux général pour le mode au pourcentage. Sur devis : aucun champ de tarification dans la fiche. Frais de service conservés pour les modes à prix fixe, non ajoutés automatiquement au prix. Les modes variables (sur devis/au pourcentage) restent internes afin d'éviter des commandes publiques à 0 F ; le prix réel est saisi manuellement à la vente, ainsi que le coût réel pour un devis. À l'année : prix mensuel selon la demande, pas de multiplication automatique par 12. Pas de calcul automatique de l'assiette du pourcentage. Les anciennes ventes ne sont pas modifiées. Aucune migration SQL.

## V7.3 — Frais de service et bénéfices
Les frais de service configurés sont désormais un supplément unitaire facturé lors des nouvelles ventes, au comptoir et en ligne. Le prix public affiché comprend le prix de base + les frais, sans calcul fiscal. Le coût estimé reste calculé sur le prix de base, les frais de service n'ont pas de coût direct. Le montant unitaire des frais est figé dans chaque nouvelle ligne de vente et de commande. Le résumé financier, le détail par article, l'impression et le CSV distinguent les frais facturés nets des remises proportionnelles, déjà inclus dans le CA et la marge. La quote-part des frais encaissés est estimée proportionnellement aux paiements reçus durant la période. Les frais de livraison restent neutralisés. Les anciennes ventes et commandes sans frais figés ne sont pas rétroactivement augmentées. Aucune migration supplémentaire.


### V7.4 — Relance WhatsApp
Dans Paramètres > Paiement · Livraison · Expéditions, renseigner le numéro WhatsApp international de la boutique (ex. +225 07 00 00 00 00). Le numéro est enregistré dans la configuration existante. Dans le détail client, la relance est disponible pour les commandes en attente ou validées non payées, et masquée pour les commandes payées ou refusées. Le message prérempli est ouvert dans WhatsApp ; le client doit confirmer son envoi. Aucun statut de livraison distinct n’existe actuellement. Aucune migration SQL supplémentaire.

## V7.5
Panier de services : détail des prestations, aucune adresse ou option de livraison par boutique sans produit, frais nuls contrôlés côté serveur. Panier mixte : livraison des produits seulement, barème sur leur sous-total. Coordonnées client conservées. Aucune migration.

## V7.6
Suppression des deux mentions FNE demandées dans le modèle de facture commerciale. Cette modification visuelle ne confère aucune certification fiscale. Aucune migration.


## Mise à jour V7.7
- Sous-texte de la page Commandes clients retiré.
- Pieds de page centrés et maintenus en bas des pages.


## Mise à jour V7.8
- Retrait des textes d'introduction du tableau de bord.
- Suppression du bandeau de synchronisation Cloudflare D1.


## V7.9 — Paramètres épurés
- Retrait du titre redondant et de son sous-titre.
- Le lien Wave est modifiable uniquement dans Paiement · Livraison · Expéditions ; les relances de créances utilisent ce lien. Si aucune configuration de livraison n'existe, un ancien lien Wave valide est proposé. Une configuration existante prévaut, même si son lien est vide.
- Aucune migration.


## Mise à jour V8.0
- Refonte professionnelle de la fiche de détail produit/service.
- Présentation en deux colonnes avec image, prix, disponibilité et actions améliorées.
- Boutons de contact, partage et copie de lien mieux organisés.
