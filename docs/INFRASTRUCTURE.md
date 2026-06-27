# Infrastructure & Deployment / Infrastructure & déploiement — Arborisis

Operational reference for Railway hosting, GitHub CI/CD, and production runbooks.

---

## EN

### Platform architecture

- Hosting: **Railway**
- Runtime services:
  - `api` (NestJS HTTP only, `railway.toml`)
  - `web` (Next.js, `railway.web.toml`)
  - `worker-gameplay` (BullMQ gameplay consumers, `railway.worker.gameplay.toml`)
  - `worker-provisioning` (Railway universe provisioning, `railway.worker.provisioning.toml`)
  - `worker-maintenance` (global sweeps/recovery, `railway.worker.maintenance.toml`)
  - `Postgres` + `PgBouncer`
  - `Redis`
  - `univers-N` API nodes auto-provisioned at saturation

### Deployment flow

1. Push/PR triggers GitHub CI quality gate.
2. On accepted branch, Railway builds and deploys impacted services.
3. API release phase runs `prisma migrate deploy` + `prisma db seed`.
4. Health checks gate rollout (`/api/health` on API, `/` on web).

### CI quality order (must remain aligned)

```bash
npm run build
npm run lint
npm run format:check
npm run typecheck
npm run test
npm run test:e2e -w @arborisis/api
```

### Critical config notes

- Web service must use **`/railway.web.toml`** (config-as-code path), not root `railway.toml`.
- Worker services must use their dedicated config-as-code files and must not inherit `railway.toml`, otherwise they would run the API release phase.
- API requires `DATABASE_URL`, `DIRECT_DATABASE_URL`, `REDIS_URL`, `JWT_*`, `WEB_ORIGIN`.
- Workers require `DATABASE_URL`, `REDIS_URL`, shared secrets, `SERVICE_ROLE=worker`, and the matching `WORKER_ROLE`.
- Web requires `API_INTERNAL_URL`, `SITE_URL`, and `UNIVERSE_COOKIE_SECRET`.
- Release phase must stay on the `api` service only; workers do not run migrations/seed.

### Operations runbook

- Incident on new deploy: redeploy previous healthy deployment from Railway dashboard.
- Broken migration: restore DB backup, then redeploy compatible version.
- Saturation: rely on universe auto-provisioning and verify node activation health.
- Secret leak: rotate affected secrets on all API nodes and redeploy.

---

## FR

### Architecture plateforme

- Hébergement : **Railway**
- Services d’exécution :
  - `api` (NestJS HTTP uniquement, `railway.toml`)
  - `web` (Next.js, `railway.web.toml`)
  - `worker-gameplay` (consommateurs BullMQ gameplay, `railway.worker.gameplay.toml`)
  - `worker-provisioning` (provisioning Railway des univers, `railway.worker.provisioning.toml`)
  - `worker-maintenance` (sweeps globaux/récupération, `railway.worker.maintenance.toml`)
  - `Postgres` + `PgBouncer`
  - `Redis`
  - `univers-N` auto-provisionnés en cas de saturation

### Flux de déploiement

1. Push/PR déclenche la CI GitHub (porte qualité).
2. Railway build et déploie les services impactés.
3. La release phase API exécute `prisma migrate deploy` + `prisma db seed`.
4. Les health checks valident le rollout (`/api/health` API, `/` web).

### Ordre de vérification CI (référence)

```bash
npm run build
npm run lint
npm run format:check
npm run typecheck
npm run test
npm run test:e2e -w @arborisis/api
```

### Points de configuration critiques

- Le service web doit cibler **`/railway.web.toml`** (config-as-code), jamais `railway.toml`.
- Les workers doivent cibler leurs fichiers config-as-code dédiés, jamais `railway.toml`, pour ne pas exécuter la release phase API.
- L’API exige `DATABASE_URL`, `DIRECT_DATABASE_URL`, `REDIS_URL`, `JWT_*`, `WEB_ORIGIN`.
- Les workers exigent `DATABASE_URL`, `REDIS_URL`, les secrets partagés, `SERVICE_ROLE=worker` et le `WORKER_ROLE` correspondant.
- Le web exige `API_INTERNAL_URL`, `SITE_URL`, `UNIVERSE_COOKIE_SECRET`.
- La release phase doit rester sur le service `api` uniquement ; les workers ne lancent ni migrations ni seed.

### Runbook opérationnel

- Incident après déploiement : redeploy du dernier déploiement sain dans Railway.
- Migration cassée : restauration backup DB puis redeploy version compatible.
- Saturation : surveiller auto-provisioning des univers et état de santé des nodes.
- Fuite de secret : rotation immédiate sur tous les nodes API puis redeploy.
