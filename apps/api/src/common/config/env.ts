import { z } from 'zod';

const emptyStringToUndefined = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((value) => (value === '' ? undefined : value), schema);

/**
 * Validation stricte de l'environnement au démarrage.
 * Échoue vite (fail-fast) si une variable critique manque ou est invalide.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  SERVICE_ROLE: z.enum(['api', 'worker']).default('api'),
  WORKER_ROLE: emptyStringToUndefined(
    z.enum(['gameplay', 'provisioning', 'maintenance']).optional(),
  ),
  API_PORT: z.coerce.number().int().positive().default(4000),
  PORT: z.coerce.number().int().positive().optional(),
  DATABASE_URL: z.string().url(),
  DIRECT_DATABASE_URL: emptyStringToUndefined(z.string().url().optional()),
  REDIS_URL: z.string().url(),
  PRISMA_CONNECTION_LIMIT: z.coerce.number().int().positive().optional(),
  PRISMA_STATEMENT_TIMEOUT_MS: z.coerce.number().int().positive().default(30_000),
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET doit faire ≥ 32 caractères'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET doit faire ≥ 32 caractères'),
  JWT_ACCESS_TTL: z.coerce.number().int().positive().default(900),
  JWT_REFRESH_TTL: z.coerce.number().int().positive().default(1_209_600),
  // Clé de chiffrement au repos des secrets TOTP (AES-256-GCM). Optionnelle : si absente,
  // les secrets sont stockés en clair (compat héritée). Fortement recommandée en production.
  TOTP_ENC_KEY: emptyStringToUndefined(
    z.string().min(32, 'TOTP_ENC_KEY doit faire ≥ 32 caractères').optional(),
  ),
  WEB_ORIGIN: z.string().url().default('http://localhost:3000'),
  COOKIE_DOMAIN: emptyStringToUndefined(z.string().optional()),
  // Adresse réseau privée de CETTE instance API (ex. http://api.railway.internal:4000).
  // Si définie, l'univers par défaut est réaligné sur cette URL au démarrage afin
  // que le proxy web route correctement (la migration insère un placeholder localhost).
  API_INTERNAL_URL: emptyStringToUndefined(z.string().url().optional()),
  RAILWAY_API_TOKEN: emptyStringToUndefined(z.string().min(1).optional()),
  RAILWAY_PROJECT_ID: emptyStringToUndefined(z.string().optional()),
  RAILWAY_SERVICE_TEMPLATE_ID: emptyStringToUndefined(z.string().optional()),
  RAILWAY_ENVIRONMENT_ID: emptyStringToUndefined(z.string().optional()),
  UNIVERSE_PROVISIONING_ENABLED: z.enum(['true', 'false']).default('false'),
  UNIVERSE_MAX_PLAYERS: z.coerce.number().int().positive().default(500),
  // Fraction de `maxPlayers` à partir de laquelle on pré-provisionne un nouvel univers
  // (node chaud AVANT saturation totale). 0.9 = on déclenche à 90 % de remplissage.
  UNIVERSE_PROVISION_THRESHOLD: z.coerce.number().positive().max(1).default(0.9),
  // Nombre de réplicas du service API du node provisionné.
  UNIVERSE_PROVISION_REPLICAS: z.coerce.number().int().positive().default(3),
  // Temps max d'attente que le node provisionné soit sain avant de le passer ACTIVE.
  RAILWAY_DEPLOY_TIMEOUT_MS: z.coerce.number().int().positive().default(180_000),
  // Email (Mailtrap SMTP — optionnel en dev, requis en prod pour la vérification)
  MAILTRAP_HOST: z.string().default('sandbox.smtp.mailtrap.io'),
  MAILTRAP_PORT: z.coerce.number().int().positive().default(2525),
  MAILTRAP_USER: emptyStringToUndefined(z.string().optional()),
  MAILTRAP_PASS: emptyStringToUndefined(z.string().optional()),
  MAILTRAP_FROM: z.string().default('noreply@arborisis.game'),
  APP_URL: z.string().url().default('http://localhost:3000'),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(config);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Configuration d'environnement invalide :\n${issues}`);
  }
  return parsed.data;
}
