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

Multi-région : `numReplicas = 3` en `europe-west4-drams3a` pour `api` et `web`.

## Environnements & mapping Git

| Environnement | Branche Git | Données            | Usage                         |
| ------------- | ----------- | ------------------ | ----------------------------- |
| `production`  | `main`      | DB/Redis prod      | Live `arborisis.com`          |
| `staging`     | `staging`   | DB/Redis isolés    | Pré-prod, recette             |
| PR previews   | branche PR  | éphémères          | Validation par PR (optionnel) |

> Le déclenchement par branche se règle côté Railway : chaque service → Settings →
> Source → « Deployment trigger / branch ». La prod écoute `main` en mode **Wait for CI**
> (déploie seulement après succès des checks GitHub).

## CI — porte de qualité (`.github/workflows/ci.yml`)

`build` · `lint` · `format:check` · `typecheck` · `test` (unit) · `test:e2e` (Postgres +
Redis éphémères). Tourne sur push et PR vers `main`. Railway attend ces checks (Wait for CI).

## Sécurité (analyses automatisées)

- **CodeQL** (`codeql.yml`) — SAST JS/TS, sur push/PR + hebdo.
- **gitleaks** (`security.yml`) — scan de secrets, historique complet sur PR.
- **npm audit** (`security.yml`) — échoue sur faille high/critique des deps **runtime**
  (`--omit=dev`).
- **Dependabot** (`dependabot.yml`) — bumps npm/actions/docker groupés, hebdo.

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

## PR preview environments (optionnel)

À activer dans Railway : **Project → Settings → Environments → Enable PR environments**.
Railway crée alors un environnement éphémère par PR (détruit à la fermeture). Penser au
coût (DB/Redis dupliqués) et à limiter `numReplicas` à 1 sur ces environnements.

## Runbook express

| Situation              | Action                                                              |
| ---------------------- | ------------------------------------------------------------------- |
| Smoke rouge            | Vérifier Deployments Railway ; rollback si la nouvelle version KO   |
| Migration cassée       | Restaurer backup Postgres puis redéployer la version précédente     |
| Pic de charge / univ.  | Auto-provisioning (`UNIVERSE_PROVISION_THRESHOLD`) ; sinon replicas |
| Fuite de secret        | Rotation immédiate de la variable sur tous les nodes + redeploy     |
| `DATABASE_URL` absent  | Vérifier le chemin de config (`/railway.web.toml` côté web)         |
