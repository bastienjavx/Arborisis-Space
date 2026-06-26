# Security Policy / Politique de sécurité — Arborisis

This file defines the operational security model and disclosure path for Arborisis.

---

## EN

### Report a vulnerability

Please do **not** open a public issue for security problems.  
Private contact: **bastienjavaux@gmail.com**

### Core security model

1. **Server-authoritative gameplay**: the client sends intentions, never trusted values.
2. **Deterministic resource settlement on server** before reads/mutations.
3. **Strict input validation** with Zod on API boundaries.
4. **Idempotent BullMQ finalization** with lazy read-time safety and recovery sweep.
5. **Transactional integrity** for spend-and-schedule workflows.

### Authentication and session security

- Argon2id password hashing.
- Short-lived access JWT + rotating opaque refresh token.
- Cookies: httpOnly, SameSite=Lax, `Secure` in production.
- Origin/fetch-metadata protections on mutation routes.

### Platform hardening

- Helmet HTTP headers.
- Restricted CORS (`WEB_ORIGIN`) with credentials.
- Rate limiting (`@nestjs/throttler`), stricter on auth endpoints.
- Environment validation at startup (fail-fast for weak/invalid config).
- Structured logs with sensitive field redaction.

### Secrets and data handling

- No plaintext secrets in Git.
- Use strong JWT secrets (`openssl rand -base64 48`).
- `.env.example` documents required variables; `.env` stays local.
- Prisma queries are parameterized; no raw SQL from untrusted input.

---

## FR

### Signaler une vulnérabilité

Merci de **ne pas** ouvrir d’issue publique pour une faille.  
Contact privé : **bastienjavaux@gmail.com**

### Modèle de sécurité

1. **Gameplay autoritaire côté serveur** : le client envoie des intentions uniquement.
2. **Recalcul déterministe des ressources côté serveur** avant lecture/mutation.
3. **Validation stricte** des entrées via Zod.
4. **Finalisation BullMQ idempotente** avec garde-fous à la lecture et sweep de récupération.
5. **Intégrité transactionnelle** sur toutes les opérations de dépense/planification.

### Authentification et sessions

- Hachage des mots de passe avec Argon2id.
- JWT d’accès court + refresh opaque rotatif.
- Cookies httpOnly, SameSite=Lax, `Secure` en production.
- Contrôles Origin/fetch-metadata sur les routes de mutation.

### Durcissement applicatif

- En-têtes de sécurité Helmet.
- CORS restreint à `WEB_ORIGIN` avec credentials.
- Rate limiting global + renforcé sur l’auth.
- Validation d’environnement au démarrage (fail-fast).
- Logs structurés avec masquage des champs sensibles.

### Secrets et données

- Aucun secret en clair dans le dépôt.
- Secrets JWT forts requis (`openssl rand -base64 48`).
- `.env.example` documente, `.env` reste local.
- Accès DB via Prisma (requêtes paramétrées).
