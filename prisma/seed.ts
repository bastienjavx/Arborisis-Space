/**
 * Seed Arborisis — idempotent.
 * Crée un univers par défaut et un compte de démonstration avec un Noyau-Monde prêt à jouer.
 * Lancé via `npm run db:seed` (tsx prisma/seed.ts).
 */
import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';
import {
  BUILDING_TYPES,
  RESEARCH_TYPES,
  ResourceType,
  STABILITY_DEFAULT,
  STARTING_RESOURCES,
} from '@arborisis/shared';

const prisma = new PrismaClient();

const DEMO_EMAIL = 'demo@arborisis.test';
const DEMO_USERNAME = 'Sylvestre';
const DEMO_PASSWORD = 'arborisis-demo';

const DEFAULT_UNIVERSE_SLUG = 'default';
const DEFAULT_UNIVERSE_NAME = 'Monde Originel';

async function main() {
  // Univers par défaut, source de vérité du seed.
  const defaultUniverse = await prisma.universe.upsert({
    where: { slug: DEFAULT_UNIVERSE_SLUG },
    update: {
      name: DEFAULT_UNIVERSE_NAME,
      internalApiUrl: process.env.API_INTERNAL_URL ?? 'http://localhost:4000',
    },
    create: {
      slug: DEFAULT_UNIVERSE_SLUG,
      name: DEFAULT_UNIVERSE_NAME,
      internalApiUrl: process.env.API_INTERNAL_URL ?? 'http://localhost:4000',
    },
  });

  // Rétro-compatibilité : rattacher les entités orphelines à l'univers par défaut.
  // On utilise du SQL brut car `universeId` est NOT NULL dans le schéma ; Prisma
  // n'accepte pas de filtre `null` sur une colonne non nullable. La migration
  // backfill déjà les lignes existantes, ce bloc reste une sécurité idempotente.
  const defaultUniverseId = defaultUniverse.id;

  const orphanCounts = await prisma.$queryRaw<{ table_name: string; orphan_count: number }[]>`
    SELECT * FROM (
      SELECT 'users' AS table_name, COUNT(*)::int AS orphan_count FROM "users" WHERE "universeId" IS NULL
      UNION ALL
      SELECT 'planets', COUNT(*)::int FROM "planets" WHERE "universeId" IS NULL
      UNION ALL
      SELECT 'npc_encounters', COUNT(*)::int FROM "npc_encounters" WHERE "universeId" IS NULL
      UNION ALL
      SELECT 'galactic_events', COUNT(*)::int FROM "galactic_events" WHERE "universeId" IS NULL
    ) counts
    WHERE orphan_count > 0;
  `;

  if (orphanCounts.length > 0) {
    await prisma.$executeRawUnsafe(
      `UPDATE "users" SET "universeId" = $1 WHERE "universeId" IS NULL;`,
      defaultUniverseId,
    );
    await prisma.$executeRawUnsafe(
      `UPDATE "planets" SET "universeId" = $1 WHERE "universeId" IS NULL;`,
      defaultUniverseId,
    );
    await prisma.$executeRawUnsafe(
      `UPDATE "npc_encounters" SET "universeId" = $1 WHERE "universeId" IS NULL;`,
      defaultUniverseId,
    );
    await prisma.$executeRawUnsafe(
      `UPDATE "galactic_events" SET "universeId" = $1 WHERE "universeId" IS NULL;`,
      defaultUniverseId,
    );
    console.log(
      `✓ ${orphanCounts.reduce((sum, row) => sum + row.orphan_count, 0)} entités orphelines rattachées à l'univers par défaut.`,
    );
  }

  const passwordHash = await argon2.hash(DEMO_PASSWORD, { type: argon2.argon2id });

  const user = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: {},
    create: {
      email: DEMO_EMAIL,
      username: DEMO_USERNAME,
      passwordHash,
      universeId: defaultUniverse.id,
    },
  });

  // Si l'utilisateur démo existait déjà sans univers (créé avant cette version du seed), on le rattache.
  if (user.universeId !== defaultUniverse.id) {
    await prisma.user.update({
      where: { id: user.id },
      data: { universeId: defaultUniverse.id },
    });
  }

  // Niveaux de recherche (empire-wide) à 0.
  for (const type of RESEARCH_TYPES) {
    await prisma.researchLevel.upsert({
      where: { userId_type: { userId: user.id, type } },
      update: {},
      create: { userId: user.id, type, level: 0 },
    });
  }

  // Noyau-Monde si absent.
  const existing = await prisma.planet.findFirst({
    where: { ownerId: user.id, isHomeworld: true },
  });
  if (!existing) {
    const planet = await prisma.planet.create({
      data: {
        name: 'Noyau-Monde',
        ownerId: user.id,
        universeId: defaultUniverse.id,
        isHomeworld: true,
        galaxy: 1,
        system: 1,
        position: 1,
        stability: STABILITY_DEFAULT,
        biomass: STARTING_RESOURCES[ResourceType.BIOMASS] ?? 0,
        sap: STARTING_RESOURCES[ResourceType.SAP] ?? 0,
        minerals: STARTING_RESOURCES[ResourceType.MINERALS] ?? 0,
        spores: STARTING_RESOURCES[ResourceType.SPORES] ?? 0,
        lastResourceUpdate: new Date(),
      },
    });
    for (const type of BUILDING_TYPES) {
      await prisma.planetBuilding.create({ data: { planetId: planet.id, type, level: 0 } });
    }
    console.log(`✓ Noyau-Monde créé pour ${user.username} en 1:1:1`);
  }

  // Synchronise le compteur de joueurs de l'univers par défaut.
  const playerCount = await prisma.user.count({ where: { universeId: defaultUniverse.id } });
  await prisma.universe.update({
    where: { id: defaultUniverse.id },
    data: { playerCount },
  });

  console.log(`✓ Seed terminé. Compte démo : ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
