# Infrastructure & déploiement — Arborisis

Référence opérationnelle de l'infra Railway + CI/CD GitHub. Voir aussi `CLAUDE.md`
(pièges Railway), `SECURITY.md`, `railway.toml`, `railway.web.toml`.

## Vue d'ensemble

Hébergement **Railway**, un projet `Arborisis` (`e1548288-…`), trois environnements.
Déploiement **piloté par Git** : Railway construit et déploie nativement depuis GitHub ;
GitHub Actions sert de **porte de qualité** (CI) et de **vérification post-déploiement**
(smoke). Aucun secret de prod ne transite par GitHub.

```
GitHub (push/PR) ──► CI (build/lint/types/tests) ──► [Wait for CI] ──► Railway build+deploy
                          │                                                    │
                     CodeQL / gitleaks / npm audit                    release phase: migrate+seed
                                                                              │
                                                              Smoke (workflow_run) ──► /api/health + web 200
```

## Services Railway (env `production`)

| Service     | Rôle                                  | Source                         |
| ----------- | ------------------------------------- | ------------------------------ |
| `api`       | NestJS, calcul serveur autoritaire    | `docker/api.Dockerfile`        |
| `web`       | Next.js, public `arborisis.com`       | `docker/web.Dockerfile`        |
| `PgBouncer` | pooling devant Postgres (runtime)     | plugin                         |
| `Postgres`  | base de données persistante           | plugin (volume `postgres-vol`) |
| `Redis`     | BullMQ + cache                        | plugin (volume `redis-vol`)    |
| `univers-N` | nodes API auto-provisionnés (scaling) | dupliqués depuis `api`         |

Multi-région prod : `api` et `web` sont scalés sur 4 régions (asia-southeast1, europe-west4,
us-east4, us-west2) pour un total de **16 réplicas chacun**. Le `railway.toml` ne fixe qu'un
plancher (`europe-west4 = 3`) ; le scaling réel est piloté via `railway scale` / dashboard.

## Environnements & mapping Git

| Environnement | Branche cible | Réplicas      | Données         | Usage                |
| ------------- | ------------- | ------------- | --------------- | -------------------- |
| `production`  | `main`        | 16 (4 régions)| DB/Redis prod   | Live `arborisis.com` |
| `staging`     | `staging` ⚠️  | 1 (eu-west)   | DB/Redis isolés | Pré-prod, recette    |
| PR previews   | branche PR    | 1 (éphémère)  | éphémères       | Validation par PR    |

**Staging** est entièrement provisionné et isolé : services `api`, `web`, `PgBouncer`,
`Postgres`, `Redis` dédiés (clone de prod via `railway environment create staging
--duplicate production`), `DATABASE_URL`/`DIRECT_DATABASE_URL`/`REDIS_URL` réécrits en
références aux services **de staging**, auto-provisioning d'univers **désactivé**
(`UNIVERSE_PROVISIONING_ENABLED=false`), scalé à **1 réplica** en `europe-west4`.

- Web staging : **https://web-staging-284a.up.railway.app** (proxifie `/api` vers l'`api`
  staging en réseau privé `http://api:4000`).
- ⚠️ **À finaliser au dashboard** : les services `api`/`web` de staging pointent encore sur
  la branche `main` (le réglage de branche n'est pas pilotable en CLI). Voir
  « Finalisation manuelle » ci-dessous pour les faire suivre la branche `staging`.

> Le déclenchement par branche se règle côté Railway : chaque service → Settings →
> Source → « Deployment trigger / branch ». La prod écoute `main` en mode **Wait for CI**
> (déploie seulement après succès des checks GitHub).

## CI — porte de qualité (`.github/workflows/ci.yml`)

`build` · `lint` · `format:check` · `typecheck` · `test` (unit) · `test:e2e` (Postgres +
Redis éphémères). Tourne sur push et PR vers `main`. Railway attend ces checks (Wait for CI).

## Sécurité (analyses automatisées)

- **CodeQL** (`codeql.yml`) — SAST JS/TS, sur push/PR + hebdo.
- **gitleaks** (`security.yml`) — scan de secrets, historique complet sur PR.
- **npm audit** (`security.yml`) — **bloque** sur faille *critique* des deps runtime
  (`--omit=dev`) ; *high/moderate* remontées sans bloquer (remédiation via Dependabot).
- **Dependabot** (`dependabot.yml`) — bumps npm/actions/docker groupés, hebdo.
- **GitHub natif** (repo public) — Dependabot alerts + security updates, secret scanning,
  push protection : tous activés.

### Protection de la branche `main`

Configurée via l'API GitHub : checks requis (`build-and-test`, `Scan de secrets
(gitleaks)`, `Audit dépendances runtime`), PR obligatoire avant merge, historique
linéaire, ni force-push ni suppression, résolution des conversations exigée. Le repo a été
rendu **public** pour débloquer ces protections (gratuites uniquement sur public/Pro).

## CD — déploiement

1. Merge sur `main` → CI s'exécute.
2. CI verte → Railway lance le build de l'image (Dockerfile) du/des services impactés
   (voir `watchPatterns` dans les `*.toml`).
3. **Release phase** (`preDeployCommand`) : `prisma migrate deploy && prisma db seed`
   dans un conteneur dédié, **avant** le rollout — pas de course entre réplicas.
   Migrations en avant uniquement, seed idempotent.
4. Rollout des réplicas avec healthcheck `GET /api/health` (timeout 30 s) ; échec →
   `restartPolicy ON_FAILURE` (10 tentatives), l'ancienne version reste servie.
5. **Smoke** (`smoke.yml`) se déclenche après la CI, attend le rollout et sonde
   `/api/health` (`status:ok`) + web 200. Tourne aussi toutes les 15 min (canary).

### Rollback

Railway → service → onglet **Deployments** → un déploiement antérieur → **Redeploy**.
Le rollback ne rejoue pas la release phase ; en cas de migration cassante, restaurer
d'abord la base (voir backups). Préférer des migrations rétro-compatibles (expand /
contract) pour rendre tout rollback sûr.

## Backups Postgres

Sauvegardes natives Railway : service **Postgres → onglet Backups** → activer la
planification (quotidienne recommandée, rétention ≥ 7 j). Restauration depuis le même
onglet. Tester une restauration sur `staging` au moins une fois par trimestre.

## Secrets & variables

Gérés dans Railway (jamais dans Git). Notables sur `api` :

- `DATABASE_URL` → réf. `PgBouncer.DATABASE_URL` (poolé, runtime)
- `DIRECT_DATABASE_URL` → réf. `Postgres.DATABASE_URL` (migrations/seed)
- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` → **partagés par tous les nodes** API
- `REDIS_URL`, `WEB_ORIGIN`, `NODE_ENV=production`
- Auto-scaling : `RAILWAY_API_TOKEN`, `RAILWAY_PROJECT_ID`,
  `RAILWAY_SERVICE_TEMPLATE_ID`, `UNIVERSE_*`

Rotation d'un secret JWT : mettre à jour la variable sur **tous** les nodes API d'un
environnement en une fois (sinon invalidation croisée des tokens), puis redéployer.

## Finalisation manuelle (dashboard Railway)

Trois réglages ne sont **pas pilotables par le CLI** et restent à faire dans l'UI Railway
(chacun ~30 s). L'infra fonctionne sans, mais ils complètent le workflow pro.

1. **Brancher staging sur `staging`** (recommandé) — services `api` puis `web` de l'env
   staging → Settings → Source → branche `staging`. Sans ça, staging suit `main` et
   redéploie en miroir de la prod au lieu de servir de pré-prod indépendante.
2. **Activer les PR preview environments** — Project → Settings → Environments → *Enable
   PR environments*. Un env éphémère par PR (détruit à la fermeture). Limiter à
   `numReplicas = 1` et penser au coût (DB/Redis dupliqués par PR ouverte).
3. **Activer les backups Postgres** — service Postgres (prod **et** staging) → onglet
   Backups → planification quotidienne, rétention ≥ 7 j.

> Tout le reste (services, variables, isolation, scaling, branch protection GitHub, scans
> de sécurité, smoke) est déjà configuré par le CLI / l'API et versionné.

## Runbook express

| Situation              | Action                                                              |
| ---------------------- | ------------------------------------------------------------------- |
| Smoke rouge            | Vérifier Deployments Railway ; rollback si la nouvelle version KO   |
| Migration cassée       | Restaurer backup Postgres puis redéployer la version précédente     |
| Pic de charge / univ.  | Auto-provisioning (`UNIVERSE_PROVISION_THRESHOLD`) ; sinon replicas |
| Fuite de secret        | Rotation immédiate de la variable sur tous les nodes + redeploy     |
| `DATABASE_URL` absent  | Vérifier le chemin de config (`/railway.web.toml` côté web)         |
