# Infrastructure & Deployment / Infrastructure & déploiement — Arborisis

Operational reference for Railway hosting, GitHub CI/CD, and production runbooks.

---

## EN

### Platform architecture

- Hosting: **Railway**
- Runtime services:
  - `api` (NestJS, `railway.toml`)
  - `web` (Next.js, `railway.web.toml`)
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
- API requires `DATABASE_URL`, `DIRECT_DATABASE_URL`, `REDIS_URL`, `JWT_*`, `WEB_ORIGIN`.
- Web requires `API_INTERNAL_URL`, `SITE_URL`, and `UNIVERSE_COOKIE_SECRET`.
- Release phase must stay idempotent and safe for multi-replica rollouts.

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
  - `api` (NestJS, `railway.toml`)
  - `web` (Next.js, `railway.web.toml`)
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
- L’API exige `DATABASE_URL`, `DIRECT_DATABASE_URL`, `REDIS_URL`, `JWT_*`, `WEB_ORIGIN`.
- Le web exige `API_INTERNAL_URL`, `SITE_URL`, `UNIVERSE_COOKIE_SECRET`.
- La release phase doit rester idempotente pour éviter les effets de bord multi-réplicas.

### Runbook opérationnel

- Incident après déploiement : redeploy du dernier déploiement sain dans Railway.
- Migration cassée : restauration backup DB puis redeploy version compatible.
- Saturation : surveiller auto-provisioning des univers et état de santé des nodes.
- Fuite de secret : rotation immédiate sur tous les nodes API puis redeploy.
