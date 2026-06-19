import { z } from 'zod';

/**
 * Validation stricte de l'environnement au démarrage.
 * Échoue vite (fail-fast) si une variable critique manque ou est invalide.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().int().positive().default(4000),
  PORT: z.coerce.number().int().positive().optional(),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET doit faire ≥ 32 caractères'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET doit faire ≥ 32 caractères'),
  JWT_ACCESS_TTL: z.coerce.number().int().positive().default(900),
  JWT_REFRESH_TTL: z.coerce.number().int().positive().default(1_209_600),
  WEB_ORIGIN: z.string().url().default('http://localhost:3000'),
  COOKIE_DOMAIN: z.string().optional(),
  // Adresse réseau privée de CETTE instance API (ex. http://api:4000 sur Railway).
  // Si définie, l'univers par défaut est réaligné sur cette URL au démarrage afin
  // que le proxy web route correctement (la migration insère un placeholder localhost).
  API_INTERNAL_URL: z.string().url().optional(),
  RAILWAY_API_TOKEN: z.string().min(1).optional(),
  RAILWAY_PROJECT_ID: z.string().optional(),
  RAILWAY_SERVICE_TEMPLATE_ID: z.string().optional(),
  RAILWAY_ENVIRONMENT_ID: z.string().optional(),
  UNIVERSE_PROVISIONING_ENABLED: z.enum(['true', 'false']).default('false'),
  UNIVERSE_MAX_PLAYERS: z.coerce.number().int().positive().default(500),
  // Email (Mailtrap SMTP — optionnel en dev, requis en prod pour la vérification)
  MAILTRAP_HOST: z.string().default('sandbox.smtp.mailtrap.io'),
  MAILTRAP_PORT: z.coerce.number().int().positive().default(2525),
  MAILTRAP_USER: z.string().optional(),
  MAILTRAP_PASS: z.string().optional(),
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
