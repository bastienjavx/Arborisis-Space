# Infrastructure and Operations

Operational reference for Arborisis hosting, deployment, runtime services, and incident response.

---

## Platform

Arborisis is designed for Railway with separate services per runtime responsibility.

| Service               | Role                                               | Config file                        | Replicas                    |
| --------------------- | -------------------------------------------------- | ---------------------------------- | --------------------------- |
| `api`                 | NestJS HTTP API, WebSocket events, health checks   | `railway.toml`                     | 3 in `europe-west4-drams3a` |
| `web`                 | Next.js application and `/api` proxy               | `railway.web.toml`                 | 3 in `europe-west4-drams3a` |
| `worker-gameplay`     | BullMQ gameplay processors                         | `railway.worker.gameplay.toml`     | 2                           |
| `worker-provisioning` | Universe node provisioning/reconciliation          | `railway.worker.provisioning.toml` | 1                           |
| `worker-maintenance`  | Global recovery sweeps and maintenance ticks       | `railway.worker.maintenance.toml`  | 1                           |
| Postgres              | Primary database                                   | Railway plugin                     | Managed                     |
| PgBouncer             | Runtime database pool                              | Railway plugin/reference           | Managed                     |
| Redis                 | BullMQ, throttling, locks, cache                   | Railway plugin                     | Managed                     |
| `univers-N`           | Auto-provisioned API nodes for saturated universes | cloned from `api`                  | configured by provisioning  |

---

## Runtime Responsibilities

### API

The API serves HTTP routes and WebSocket events. It should not run long-lived gameplay processors in production.

Required highlights:

- `SERVICE_ROLE=api`
- `DATABASE_URL` points to pooled runtime database access.
- `DIRECT_DATABASE_URL` points to direct Postgres access for release migrations.
- `WEB_ORIGIN` is the public web origin.
- Release phase runs migrations and seed.

### Web

The web service serves Next.js and proxies `/api` calls to the active API/universe node.

Critical requirements:

- Railway config-as-code path must be `/railway.web.toml`.
- `API_INTERNAL_URL` should use Railway private networking.
- `UNIVERSE_COOKIE_SECRET` signs the universe routing cookie.
- `SITE_URL` is the canonical public URL.

### Gameplay Worker

Runs processors for time-based gameplay and economy workflows:

- construction
- research
- colonization
- ship production
- expeditions
- PVE
- PVP
- game events
- transfers
- crafting
- production lines
- trade routes
- market expiry
- notifications
- NPC ticks

### Provisioning Worker

Manages universe capacity and Railway node provisioning. It requires Railway API credentials and should run as a single logical controller unless the reconciler is explicitly redesigned.

### Maintenance Worker

Runs global recovery sweeps and long-range maintenance. Keep it to one replica unless distributed locks and workload partitioning are revisited.

---

## Environment Variables

### Shared API/Worker Variables

| Variable              | Required               | Notes                                                   |
| --------------------- | ---------------------- | ------------------------------------------------------- |
| `NODE_ENV`            | yes                    | `development`, `test`, or `production`                  |
| `SERVICE_ROLE`        | yes                    | `api` or `worker`                                       |
| `WORKER_ROLE`         | workers                | `gameplay`, `provisioning`, or `maintenance`            |
| `DATABASE_URL`        | yes                    | Runtime Prisma connection, usually PgBouncer in Railway |
| `DIRECT_DATABASE_URL` | API release            | Direct Postgres connection for migrations/seed          |
| `REDIS_URL`           | yes                    | BullMQ, throttling, locks, cache                        |
| `JWT_ACCESS_SECRET`   | yes                    | Strong shared secret, minimum 32 chars                  |
| `JWT_REFRESH_SECRET`  | yes                    | Strong shared secret, minimum 32 chars                  |
| `JWT_ACCESS_TTL`      | no                     | Defaults to 900 seconds                                 |
| `JWT_REFRESH_TTL`     | no                     | Defaults to 1209600 seconds                             |
| `TOTP_ENC_KEY`        | production recommended | Encrypts TOTP secrets at rest                           |
| `WEB_ORIGIN`          | yes                    | Public web origin for CORS                              |
| `COOKIE_DOMAIN`       | production optional    | Cookie domain override                                  |
| `API_INTERNAL_URL`    | API/web                | Private URL of the current API node                     |

### Provisioning Variables

| Variable                        | Required                  | Notes                                                 |
| ------------------------------- | ------------------------- | ----------------------------------------------------- |
| `RAILWAY_API_TOKEN`             | when provisioning enabled | Railway API v2 token                                  |
| `RAILWAY_PROJECT_ID`            | when provisioning enabled | Railway project id                                    |
| `RAILWAY_SERVICE_TEMPLATE_ID`   | when provisioning enabled | API service id used as clone template                 |
| `RAILWAY_ENVIRONMENT_ID`        | optional                  | Railway environment id                                |
| `UNIVERSE_PROVISIONING_ENABLED` | yes                       | `true` in production when auto-provisioning is active |
| `UNIVERSE_MAX_PLAYERS`          | no                        | Defaults to 500                                       |
| `UNIVERSE_PROVISION_THRESHOLD`  | no                        | Defaults to 0.9                                       |
| `UNIVERSE_PROVISION_REPLICAS`   | no                        | Number of replicas for provisioned API nodes          |
| `RAILWAY_DEPLOY_TIMEOUT_MS`     | no                        | Defaults to 180000                                    |

### Web Variables

| Variable                   | Required   | Notes                                   |
| -------------------------- | ---------- | --------------------------------------- |
| `WEB_PORT`                 | no         | Defaults to 3000                        |
| `SITE_URL`                 | production | Canonical public URL, no trailing slash |
| `GOOGLE_SITE_VERIFICATION` | optional   | Search Console token                    |
| `API_INTERNAL_URL`         | yes        | Server-to-server API URL                |
| `UNIVERSE_COOKIE_SECRET`   | yes        | HMAC secret, minimum 32 chars           |
| `NEXT_PUBLIC_API_URL`      | optional   | Build-time public API URL if used       |

### Email Variables

| Variable        | Required               | Notes                                  |
| --------------- | ---------------------- | -------------------------------------- |
| `MAILTRAP_HOST` | no                     | Defaults to `sandbox.smtp.mailtrap.io` |
| `MAILTRAP_PORT` | no                     | Defaults to 2525                       |
| `MAILTRAP_USER` | production email flows | SMTP user                              |
| `MAILTRAP_PASS` | production email flows | SMTP password                          |
| `MAILTRAP_FROM` | no                     | Defaults to `noreply@arborisis.game`   |
| `APP_URL`       | yes                    | Public app URL used in email links     |

---

## Deployment Flow

1. A push or pull request runs GitHub quality and security checks.
2. Railway builds affected services from their config-as-code files.
3. The API release phase runs:

```bash
export DATABASE_URL="$DIRECT_DATABASE_URL"
npx prisma migrate deploy
npx prisma db seed
```

4. Railway starts the new API/web/worker deployments.
5. Health checks gate rollout:
   - API: `/api/health`
   - Web: `/`
6. Workers start processors and run recovery sweeps with distributed locks.

---

## Config-as-Code Rules

- Root `railway.toml` is for the API service only.
- Web must explicitly use `/railway.web.toml`.
- Gameplay worker must explicitly use `/railway.worker.gameplay.toml`.
- Provisioning worker must explicitly use `/railway.worker.provisioning.toml`.
- Maintenance worker must explicitly use `/railway.worker.maintenance.toml`.
- Workers must not run the API `preDeployCommand`.
- The API release phase is the only place migrations and seed run automatically.

---

## Health and Observability

| Signal                  | Source       | Use                                             |
| ----------------------- | ------------ | ----------------------------------------------- |
| `/api/health`           | API          | Readiness and dependency health                 |
| `/`                     | Web          | Web rollout health                              |
| Nest logs               | API/workers  | Request logs, startup validation, worker sweeps |
| Railway deployment logs | all services | Build, deploy, restart, and health failures     |
| Redis/BullMQ state      | workers      | Queue backlog, delayed jobs, failed jobs        |
| Postgres metrics        | database     | connection pressure, slow queries, storage      |

Logs redact cookies, authorization headers, and set-cookie values.

---

## Runbooks

### New Deploy Fails Health Check

1. Open the failing Railway service deployment logs.
2. Confirm it selected the correct `railway*.toml` file.
3. Check environment validation errors first.
4. Verify Postgres and Redis references.
5. Redeploy the last healthy deployment if user impact is active.
6. Patch config or code and redeploy.

### Web Service Accidentally Uses API Config

Symptoms: web build/runtime asks for database variables, starts the API Dockerfile, or crashes before Next.js starts.

Fix:

1. Railway web service settings.
2. Config-as-code path: `/railway.web.toml`.
3. Redeploy the web service.

### Worker Accidentally Runs API Release Phase

Symptoms: worker deployment runs migrations/seed or requires `DIRECT_DATABASE_URL`.

Fix:

1. Set the worker config-as-code path to its `railway.worker.*.toml`.
2. Confirm `SERVICE_ROLE=worker`.
3. Confirm `WORKER_ROLE` matches the service.
4. Redeploy.

### Database Migration Failure

1. Stop rollout if still possible.
2. Inspect migration logs.
3. If schema is partially applied, avoid ad hoc fixes in production.
4. Restore from backup when data integrity is uncertain.
5. Create a forward migration that repairs the state.
6. Redeploy a compatible application version.

### Redis Outage

Impact: queues, throttling, distributed locks, and some cache paths degrade.

1. Confirm Redis plugin health.
2. Check API mutation errors and worker failures.
3. Pause high-risk deployments.
4. Restore Redis service.
5. Let workers run recovery sweeps.
6. Inspect failed/delayed jobs and replay where safe.

### Queue Backlog or Stalled Gameplay

1. Inspect worker logs for processor errors.
2. Confirm `worker-gameplay` is running with `WORKER_ROLE=gameplay`.
3. Confirm Redis connectivity.
4. Check delayed and failed jobs.
5. Restart worker if it is wedged.
6. Rely on recovery sweeps for overdue persisted jobs.
7. Add a regression test if the backlog came from a finalization bug.

### Universe Saturation

1. Confirm active universe player counts.
2. Check provisioning worker logs.
3. Verify Railway API credentials.
4. Confirm `UNIVERSE_PROVISIONING_ENABLED=true`.
5. Inspect provisioned node health.
6. If auto-provisioning fails, manually provision or raise capacity.

### Secret Leak

1. Rotate the affected secret in Railway.
2. Update all services sharing it.
3. Redeploy API, workers, and web as needed.
4. Invalidate sessions if JWT/session integrity is affected.
5. Review logs for suspicious access.
6. Remove leaked values from Git history when applicable.

---

## Release Checklist

- CI and security checks are green.
- Prisma migration is reviewed.
- Seed changes are intentional and idempotent.
- Railway services point to the correct config-as-code files.
- Required environment variables exist on each service.
- API health and web health pass after deploy.
- Workers start with the expected `WORKER_ROLE`.
- No worker service runs the API release phase.
- Recovery sweeps complete without repeated errors.
