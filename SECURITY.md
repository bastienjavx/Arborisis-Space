# Politique de sécurité — Arborisis

La sécurité est la **priorité n°1** du projet. Ce document décrit le modèle de menace,
les mesures en place et la procédure de signalement.

## Signaler une vulnérabilité

Merci de **ne pas** ouvrir d'issue publique pour une faille de sécurité.
Contact privé : **bastienjavaux@gmail.com**. Nous accusons réception sous 72 h.

## Modèle : autorité serveur (anti-triche)

Le client est considéré comme **non fiable**. Règles fondamentales :

- Le client n'envoie que des **intentions** (`construire`, `chercher`, `essaimer`).
  Aucune quantité de ressource, durée ou niveau n'est jamais acceptée du client.
- Les **ressources sont recalculées côté serveur** à chaque lecture/mutation, à partir
  de `lastResourceUpdate` et de la production — calcul déterministe (`@arborisis/shared`).
- Toutes les **vérifications** sont faites serveur : propriété de la planète, ressources
  suffisantes, prérequis (recherches/bâtiments/énergie), unicité des files, emplacement
  libre, limite de colonies.
- Les **minuteries** passent par BullMQ. La finalisation est **idempotente** (vérifie
  statut + échéance), doublée d'une finalisation paresseuse à la lecture et d'un balayage
  de récupération au démarrage : impossible de finaliser deux fois ou en avance.
- Les bio-vaisseaux sont débités dans la même transaction sérialisable que la création
  de mission. Une contrainte partielle limite chaque planète à une expédition active.
- Les gains ne sont crédités qu'au retour, une seule fois. Le tirage cryptographique,
  la version des règles, les pertes et les dépassements de stockage restent auditables.

## Authentification & sessions

- Mots de passe hachés avec **argon2id**.
- **JWT d'accès** courte durée (15 min) + **refresh token opaque rotatif** par session ;
  seul un hash SHA-256 du secret aléatoire est stocké. Plusieurs appareils sont isolés
  et la réutilisation d'un ancien token révoque la session concernée.
- Tokens transportés en **cookies httpOnly / SameSite=Lax** ; `Secure` en production.
  Le cookie de refresh est limité au chemin `/api/auth/refresh`.
- Les mutations vérifient `Origin` et Fetch Metadata afin de bloquer les requêtes CSRF.
- Le navigateur utilise le proxy same-origin Next.js `/api`; NestJS reste privé sur
  Railway et n'exige aucun cookie inter-domaine.
- Politique de mot de passe : ≥ 10 caractères (validée par Zod, front et back).

## Durcissement applicatif

- **Helmet** (en-têtes HTTP de sécurité).
- **CORS** restreint à `WEB_ORIGIN` avec `credentials`.
- **Rate limiting** global (`@nestjs/throttler`) + limites renforcées sur `register`/`login`.
- **Validation Zod** stricte de toutes les entrées (corps, params).
- **Validation d'environnement** au démarrage (fail-fast) : secrets JWT ≥ 32 caractères.
- **Logs structurés** (pino) avec **redaction** des cookies et en-têtes d'autorisation.

## Secrets & configuration

- Aucun secret en clair dans le dépôt. `.env` est ignoré par Git ; `.env.example` documente
  les variables.
- En production : générer des secrets forts (`openssl rand -base64 48`), définir
  `COOKIE_DOMAIN`, `NODE_ENV=production` (active `Secure` sur les cookies).

## Données

- Accès aux données via Prisma (requêtes paramétrées — pas d'injection SQL).
- Contraintes d'unicité en base (email, username, coordonnées de planète).
- Transactions sérialisables avec retry et contraintes uniques partielles pour les files
  de construction, recherche et colonisation.
- Suppressions en cascade cohérentes (un utilisateur supprimé emporte ses planètes/jobs).

## Périmètre non couvert (itérations futures)

Combat PvP, transport, espionnage, alliances, classement, messagerie/diplomatie. Toute extension devra
respecter le principe d'autorité serveur décrit ci-dessus.
