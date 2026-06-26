# Contributing to Arborisis / Contribuer à Arborisis

**EN** and **FR** guidance for contributors.  
Read this with [`README.md`](./README.md), [`SECURITY.md`](./SECURITY.md), and [`docs/INFRASTRUCTURE.md`](./docs/INFRASTRUCTURE.md).

---

## EN

### Prerequisites

- Node **22+**
- npm **10+**
- Docker (PostgreSQL + Redis must be running before tests/e2e/dev)

### Setup

```bash
cp .env.example .env
npm install
docker compose up -d postgres redis
npm run db:migrate
npm run db:seed
npm run dev
```

### Repository rules

1. **Server authority first**: never trust client-provided gameplay values.
2. **Shared is the source of truth**: gameplay constants/formulas belong in `packages/shared`.
3. **No enum drift**: keep `packages/shared/src/enums.ts` in sync with `prisma/schema.prisma`.
4. **Zod validation everywhere**: all API inputs must use the existing validation pattern.
5. **Idempotent finalization**: timed jobs must remain replay-safe.

### Verification before PR

```bash
npm run build
npm run lint
npm run format:check
npm run typecheck
npm run test
npm run test:e2e -w @arborisis/api
```

### Pull requests

- Keep commits atomic and descriptive.
- Explain behavioral impact and risk areas.
- If schema/enums changed, include migration files and mention rollout implications.
- Never commit secrets. Keep `.env` local only.

### Expected security checks on PRs

- `Security / Scan de secrets (gitleaks)`
- `Security / Audit dépendances runtime`
- `Security / Scan Trivy (repo/config)`
- `CodeQL / Analyse CodeQL`
- `Dependency Review / Dependency Review (HIGH + CRITICAL bloquant)`

---

## FR

### Prérequis

- Node **22+**
- npm **10+**
- Docker (PostgreSQL + Redis doivent tourner avant dev/tests/e2e)

### Installation

```bash
cp .env.example .env
npm install
docker compose up -d postgres redis
npm run db:migrate
npm run db:seed
npm run dev
```

### Règles du dépôt

1. **Autorité serveur** : aucune confiance dans les valeurs gameplay venant du client.
2. **`packages/shared` = source de vérité** : constantes/formules gameplay centralisées.
3. **Synchronisation des enums** : aligner `shared/enums.ts` et `prisma/schema.prisma`.
4. **Validation Zod systématique** : suivre le pattern existant sur toutes les entrées API.
5. **Idempotence des jobs** : finalisations temporisées rejouables sans effet double.

### Vérifications avant PR

```bash
npm run build
npm run lint
npm run format:check
npm run typecheck
npm run test
npm run test:e2e -w @arborisis/api
```

### Pull requests

- Commits atomiques, message clair.
- Décrire l’impact fonctionnel et les zones à risque.
- Si schema/enums évoluent, inclure les migrations et noter l’impact déploiement.
- Ne jamais versionner de secrets.

### Checks sécurité attendus sur PR

- `Security / Scan de secrets (gitleaks)`
- `Security / Audit dépendances runtime`
- `Security / Scan Trivy (repo/config)`
- `CodeQL / Analyse CodeQL`
- `Dependency Review / Dependency Review (HIGH + CRITICAL bloquant)`
