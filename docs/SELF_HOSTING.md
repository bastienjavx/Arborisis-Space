# Self-Hosting on a Dedicated Server

Arborisis ships two supported deployment targets. Railway remains the managed, multi-service topology described in [Infrastructure](./INFRASTRUCTURE.md). This document covers the other one: running the entire game — database, cache, API, workers, web, and TLS termination — on a single dedicated server or VPS you control.

Both targets build from the same Dockerfiles and the same code. Nothing here is a fork of the Railway path.

---

## One-Click Install

On a fresh Debian, Ubuntu, Rocky, or Fedora machine:

```bash
curl -fsSL https://raw.githubusercontent.com/bastienjavx/arborisis-space/main/install.sh \
  | sudo bash -s -- --domain game.example.com --email admin@example.com
```

Or, from a repository you already cloned:

```bash
sudo ./install.sh --domain game.example.com --email admin@example.com
```

The installer:

1. Checks the OS, RAM, disk, and that ports 80/443 are free.
2. Installs Docker Engine and the Compose v2 plugin if missing.
3. Clones the repository to `/opt/arborisis` (skipped when run from a clone).
4. Generates every secret with `openssl rand -hex 32` and writes `deploy/.env` with mode `600`.
5. Builds the API and web images.
6. Applies Prisma migrations and the seed, then starts the stack.
7. Installs the `arborisis` command, a systemd unit for boot persistence, and a daily backup timer.

Re-running it is safe. Existing secrets are read back from `deploy/.env` and reused, so sessions and the database survive a reinstall.

### Installer Options

| Option              | Effect                                                             |
| ------------------- | ------------------------------------------------------------------ |
| `--domain <fqdn>`   | Public domain; enables automatic HTTPS. Omit for plain HTTP on IP. |
| `--email <address>` | ACME contact for certificate expiry notices.                       |
| `--dir <path>`      | Install directory (default `/opt/arborisis`).                      |
| `--branch <name>`   | Git branch to deploy (default `main`).                             |
| `--repo <url>`      | Source repository.                                                 |
| `--no-tls`          | Force plain HTTP even with a domain.                               |
| `--no-systemd`      | Skip the boot-persistence unit.                                    |
| `--no-backup-timer` | Skip the daily backup timer.                                       |
| `--skip-docker`     | Fail instead of installing Docker.                                 |
| `-y`, `--yes`       | Non-interactive. Implied when stdin is not a TTY.                  |

### Requirements

| Resource | Minimum                                                                   | Comfortable |
| -------- | ------------------------------------------------------------------------- | ----------- |
| CPU      | 2 vCPU                                                                    | 4 vCPU      |
| RAM      | 4 GB                                                                      | 8 GB        |
| Disk     | 20 GB SSD                                                                 | 60 GB SSD   |
| Network  | Ports 80, 443                                                             | Static IPv4 |
| DNS      | `A` record on the machine before install, so ACME can issue a certificate |

Under 4 GB of RAM the Next.js build is the step that fails first. On a small VPS, add swap before installing.

---

## Topology

One Compose project, `arborisis`, defined in `deploy/docker-compose.prod.yml`:

| Container             | Role                                                        | Notes                               |
| --------------------- | ----------------------------------------------------------- | ----------------------------------- |
| `caddy`               | Public entry point, automatic TLS, HTTP/3                   | Only container with published ports |
| `web`                 | Next.js app and `/api` proxy                                | Internal only                       |
| `api`                 | NestJS HTTP API and Socket.IO gateway                       | Internal only, health-gated         |
| `worker-gameplay`     | BullMQ gameplay processors                                  | Scalable                            |
| `worker-maintenance`  | Recovery sweeps and maintenance ticks                       | Keep at one instance                |
| `worker-provisioning` | Universe capacity controller                                | Optional, `provisioning` profile    |
| `migrate`             | One-shot release phase: `prisma migrate deploy` + `db seed` | Runs before API and workers start   |
| `postgres`            | Primary database                                            | Published on `127.0.0.1:5432` only  |
| `redis`               | BullMQ, throttling, locks, cache                            | Password-protected, `noeviction`    |

The ordering rule from Railway is preserved: migrations and seed run exactly once per deployment, in a dedicated container, before any API replica or worker accepts work. Here that is expressed as `depends_on: migrate: service_completed_successfully` rather than a Railway `preDeployCommand`.

### Request Routing

```
                        ┌─ /socket.io/*  ──────────────► api:4000   (WebSocket)
browser ──► caddy:443 ──┤
                        └─ everything else ─► web:3000 ─► /api/* proxy ─► api:4000
```

The web app already proxies `/api/*` to the API node selected by the signed universe cookie, so HTTP traffic must go through it. Socket.IO is the exception: Next.js does not relay WebSocket upgrades, so Caddy routes `/socket.io/*` straight to the API. Because the client connects to `window.location.origin`, realtime works with no extra configuration — and on a single domain, no CORS involvement at all.

---

## Day-to-Day Operations

The installer links `deploy/arborisis.sh` to `/usr/local/bin/arborisis`.

| Command                             | Purpose                                            |
| ----------------------------------- | -------------------------------------------------- |
| `arborisis status`                  | Container state, health, and public URL            |
| `arborisis logs api -f`             | Follow one service's logs                          |
| `arborisis update`                  | Backup, `git pull`, rebuild, migrate, restart      |
| `arborisis restart`                 | Restart without rebuilding                         |
| `arborisis down`                    | Stop everything; volumes and data are kept         |
| `arborisis backup`                  | Timestamped `pg_dump -Fc` into `BACKUP_DIR`        |
| `arborisis restore <file>`          | Destructive restore, with confirmation             |
| `arborisis migrate`                 | Replay migrations and seed (idempotent)            |
| `arborisis psql`                    | Database console                                   |
| `arborisis redis-cli`               | Redis console                                      |
| `arborisis scale worker-gameplay 3` | Adjust instance count                              |
| `arborisis config`                  | Effective configuration with secrets masked        |
| `arborisis doctor`                  | Health, database, Redis, public reachability, disk |
| `arborisis version`                 | Deployed revision and image versions               |

systemd handles boot persistence:

```bash
systemctl status arborisis           # stack managed as a unit
systemctl status arborisis-backup.timer
journalctl -u arborisis-backup       # backup history
```

---

## Configuration

All configuration lives in `deploy/.env`, generated from `deploy/.env.dedicated.example`. It contains production secrets: mode `600`, never committed, and worth copying somewhere safe.

The variables the API and workers consume are the same ones documented in [Infrastructure](./INFRASTRUCTURE.md#environment-variables); the Compose file derives them from a smaller operator-facing set:

| Operator variable            | Derives                                                 |
| ---------------------------- | ------------------------------------------------------- |
| `PUBLIC_URL`                 | `WEB_ORIGIN`, `APP_URL`, `SITE_URL`, web build metadata |
| `POSTGRES_USER/PASSWORD/DB`  | `DATABASE_URL` and `DIRECT_DATABASE_URL`                |
| `REDIS_PASSWORD`             | `REDIS_URL`                                             |
| `SITE_ADDRESS`, `ACME_EMAIL` | Caddy site block and certificate issuance               |
| `SMTP_*`                     | `MAILTRAP_*` (the app's SMTP variable names)            |

After editing `deploy/.env`, apply it:

```bash
arborisis up          # environment-only change
arborisis update      # also needed when PUBLIC_URL changes (web rebuild)
```

`PUBLIC_URL` is baked into the web image for statically rendered metadata, which is why changing the domain requires a rebuild rather than a restart.

### Email

Without `SMTP_USER`/`SMTP_PASS`, verification emails cannot be sent and new accounts stay unverified. Point `SMTP_HOST`/`SMTP_PORT` at any SMTP provider — the variable names are historical (`MAILTRAP_*` internally), not a vendor requirement.

### TLS

`SITE_ADDRESS=game.example.com` gives automatic certificates from Let's Encrypt, renewed by Caddy. The first request after install can take a few seconds while the certificate is issued.

`SITE_ADDRESS=:80` serves plain HTTP — acceptable for a LAN or behind an existing reverse proxy, but session cookies then travel in clear text. If you terminate TLS upstream, also set `HTTP_BIND=127.0.0.1` so the container is not reachable directly.

---

## Backups

`arborisis backup` writes `arborisis-<UTC timestamp>.dump` (PostgreSQL custom format) into `BACKUP_DIR`, then prunes dumps older than `BACKUP_RETENTION_DAYS`. The systemd timer runs it daily at 03:30 with a randomized delay.

Dumps live on the same machine as the database, which means they protect against bad migrations and operator error, not against losing the machine. Copy them off-box:

```bash
rsync -az /opt/arborisis/backups/ backup-host:/srv/arborisis/
```

Restoring stops the API, web, and workers first so no BullMQ job writes into a half-restored database:

```bash
arborisis restore /opt/arborisis/backups/arborisis-20260804-033000.dump
```

Redis is not backed up. It holds queues, locks, and cache — all rebuildable. Timed gameplay that was scheduled but lost is picked back up by the maintenance worker's recovery sweeps, which read persisted job state from PostgreSQL.

---

## Scaling and Universes

Vertical growth comes first: raise `POSTGRES_SHARED_BUFFERS`, `POSTGRES_EFFECTIVE_CACHE_SIZE`, and `REDIS_MAXMEMORY` to match the machine, then add gameplay workers.

```bash
arborisis scale worker-gameplay 3
```

Keep `worker-maintenance` at one instance: its recovery sweeps are global and are not partitioned across replicas.

Watch the connection budget. Each application container opens up to `PRISMA_CONNECTION_LIMIT` connections, and the sum across `api` plus every worker must stay below `POSTGRES_MAX_CONNECTIONS`.

Automatic universe provisioning is a Railway feature: it clones the API service through the Railway API, so `UNIVERSE_PROVISIONING_ENABLED` stays `false` on a dedicated server and `worker-provisioning` sits behind an optional Compose profile. Adding a universe here is a manual operation — run another API container and register it as a universe node with its internal URL. The web proxy then routes players to it through the signed universe cookie, exactly as on Railway.

To keep the provisioning worker running across `arborisis up`, set `COMPOSE_PROFILES=provisioning` in `deploy/.env`. Without it, `--remove-orphans` treats the profiled container as an orphan and stops it.

---

## Security Posture

The installer's defaults matter more than any hardening checklist:

- Only Caddy publishes ports. PostgreSQL is bound to `127.0.0.1`, Redis is not published at all.
- Every secret is randomly generated per install. There are no default credentials anywhere in the stack.
- `deploy/.env` is mode `600` and git-ignored.
- Redis requires a password and runs `noeviction`, so BullMQ never silently loses scheduled jobs under memory pressure.
- Containers run as the `node` user, inherited from the shared Dockerfiles.

Two things the installer cannot do for you:

1. **The seeded demo account** (`demo@arborisis.test` / `arborisis-demo`) is created by `prisma db seed` on every deployment. Delete it or change its password before opening the server to the public.
2. **Host hardening** — SSH keys, unattended upgrades, and fail2ban are your machine's concern, not the stack's.

See [Security](../SECURITY.md) for the application threat model and disclosure process.

---

## Troubleshooting

### The site is unreachable after install

```bash
arborisis doctor
```

Check, in order: DNS `A` record actually points at this machine, ports 80/443 open in the provider's firewall, and `arborisis logs caddy` for ACME errors. Caddy retries certificate issuance on its own once DNS is correct.

### API never becomes healthy

The API waits for `migrate` to exit successfully. Read that container first:

```bash
arborisis logs migrate
```

A failure there is almost always a database connectivity or migration problem, not an API problem.

### `no space left on device`

Old images accumulate across updates:

```bash
docker system prune -af --filter 'until=168h'
```

Never prune volumes — `postgres-data` is the game.

### Realtime updates stop working

Confirm Caddy still routes the WebSocket path:

```bash
curl -sS -o /dev/null -w '%{http_code}\n' "$(arborisis config | sed -n 's/^PUBLIC_URL=//p')/socket.io/?EIO=4&transport=polling"
```

A `200` means the route reaches the API. Anything else points at the Caddy site block or the API container.

### Rolling back a bad update

```bash
cd /opt/arborisis
sudo git checkout <previous-commit>
arborisis update
```

If a migration is the problem, restore the pre-update dump that `arborisis update` took automatically before rebuilding.

---

## Moving Between Targets

The database is the only thing that binds a deployment to its host.

**Railway → dedicated:** dump from Railway with `pg_dump -Fc`, install here, then `arborisis restore <dump>`.

**Dedicated → Railway:** `arborisis backup`, then `pg_restore` into the Railway Postgres plugin and deploy the services described in [Infrastructure](./INFRASTRUCTURE.md).

Both directions run identical schema and application code, so the only migration work is data transfer and pointing DNS at the new origin.
