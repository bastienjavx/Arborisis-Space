# Security Policy

Arborisis is a persistent multiplayer strategy game. The security model is built around one principle: the server owns all meaningful gameplay state.

---

## Reporting a Vulnerability

Please do not open a public issue for security problems.

Private contact: `bastienjavaux@gmail.com`

Include, when possible:

- Affected route, module, or workflow.
- Reproduction steps.
- Expected impact.
- Whether credentials, sessions, game state, or deployment secrets are involved.

---

## Security Model

### Core Assumptions

- Clients are untrusted.
- Network requests can be replayed, delayed, or modified.
- Timed jobs can execute late, execute more than once, or need recovery after downtime.
- Multiple API replicas and workers can operate concurrently.
- Production secrets can rotate and must not be coupled to build artifacts.

### Non-Negotiable Controls

1. Clients submit intentions only; never trusted resource totals, timers, rewards, or combat outcomes.
2. Server services settle time-based resources before reads and mutations.
3. All API inputs use strict validation through Zod.
4. Spend-and-schedule workflows use transactions.
5. BullMQ finalization paths are idempotent.
6. Shared gameplay constants prevent hidden balance drift across app layers.
7. Shared enums and Prisma enums stay synchronized.
8. Mutating routes are protected by authentication, origin checks, and rate limits.

---

## Application Controls

### Authentication and Sessions

- Argon2id password hashing.
- Short-lived access JWT.
- Rotating opaque refresh token.
- httpOnly cookies.
- SameSite=Lax cookies.
- Secure cookies in production.
- Optional AES-256-GCM encryption for TOTP secrets through `TOTP_ENC_KEY`.
- Password reset and email verification flows are backed by server-side tokens.

### API Boundary

- `JwtAuthGuard` protects authenticated routes by default.
- `OriginGuard` protects mutation routes from cross-origin abuse.
- `UserThrottlerGuard` adds user-aware throttling.
- `@nestjs/throttler` uses Redis storage so limits remain coherent across replicas.
- CORS is restricted to `WEB_ORIGIN` with credentials.
- Helmet is enabled globally.
- Query parsing is explicitly configured.

### Data and Secrets

- Prisma is the database access layer.
- No raw SQL should use untrusted input.
- `.env.example` documents variables; `.env` remains local.
- JWT secrets must be strong: `openssl rand -base64 48`.
- Logs redact cookies, authorization headers, and set-cookie values.
- Production secrets live in Railway variables, not in Git.

### Gameplay Integrity

- Resource settlement happens server-side.
- Economy-changing mutations spend and schedule atomically.
- Workers finalize persisted business jobs rather than trusting queued payloads alone.
- Recovery sweeps handle overdue work after worker downtime.
- Distributed locks protect global sweeps and bootstrap work.

---

## CI/CD Security

Expected GitHub checks:

| Check             | Purpose                                                       |
| ----------------- | ------------------------------------------------------------- |
| CI                | Build, lint, format, typecheck, tests, e2e                    |
| CodeQL            | JavaScript/TypeScript static analysis                         |
| Security          | gitleaks, npm runtime audit, Trivy repo/config scan           |
| Dependency Review | Blocks newly introduced HIGH/CRITICAL vulnerable dependencies |
| OSSF Scorecard    | Supply-chain posture monitoring                               |
| Smoke             | Deployment or runtime smoke coverage when configured          |

Security checks are part of the quality gate, not an afterthought.

---

## Incident Playbooks

### Secret Leak

1. Revoke or rotate the exposed secret immediately.
2. Rotate dependent sessions or tokens when needed.
3. Update Railway variables across API, workers, and web as applicable.
4. Redeploy affected services.
5. Inspect logs and audit trails for suspicious use.
6. Remove the secret from history if it entered Git.

### Suspected Gameplay Exploit

1. Identify affected modules, routes, and data tables.
2. Disable or rate-limit the exploit path if possible.
3. Patch server-side validation or settlement logic.
4. Add regression tests for the exploit.
5. Run recovery scripts or corrective migrations only after reviewing blast radius.

### Broken Auth or Session Behavior

1. Treat as high severity.
2. Reproduce with fresh and existing sessions.
3. Verify cookie flags, refresh rotation, JWT validation, and origin checks.
4. Rotate secrets if token integrity may be compromised.
5. Add e2e coverage for the regression.

### Dependency Vulnerability

1. Confirm whether the vulnerable package is runtime or dev-only.
2. Check exploitability in Arborisis.
3. Upgrade or override the package.
4. Run the canonical verification sequence.
5. Document residual risk when a fix is not immediately available.

---

## Security Review Checklist

- Does this change trust client-provided gameplay data?
- Are all inputs validated with Zod?
- Can the operation be replayed safely?
- Are resource spending and job scheduling transactional?
- Does the change introduce a new secret or environment variable?
- Does it widen CORS, cookies, logging, or auth scope?
- Does it change Prisma schema or enum synchronization?
- Does it affect workers, queues, or distributed locks?
- Are failure and abuse cases covered by tests?
