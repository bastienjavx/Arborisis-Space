/**
 * Seed Arborisis — idempotent.
 * Crée un compte de démonstration avec un Noyau-Monde prêt à jouer.
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

async function main() {
  const passwordHash = await argon2.hash(DEMO_PASSWORD, { type: argon2.argon2id });

  const user = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: {},
    create: { email: DEMO_EMAIL, username: DEMO_USERNAME, passwordHash },
  });

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
