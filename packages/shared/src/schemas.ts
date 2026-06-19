/**
 * Schémas Zod partagés (DTO front ↔ back).
 * Le serveur valide chaque entrée avec ces schémas ; le client les réutilise
 * pour la validation de formulaire et l'inférence de types.
 */
import { z } from 'zod';
import { BuildingType, RaceType, ResearchType, ShipType } from './enums';

export const allianceTagSchema = z
  .string()
  .trim()
  .toUpperCase()
  .min(3, 'Au moins 3 caractères')
  .max(4, 'Au plus 4 caractères')
  .regex(/^[A-Z0-9]+$/, 'Lettres et chiffres uniquement');

export const createAllianceSchema = z.object({
  tag: allianceTagSchema,
  name: z.string().trim().min(3, 'Au moins 3 caractères').max(40, 'Au plus 40 caractères'),
  description: z.string().trim().max(500, 'Au plus 500 caractères').optional(),
  bannerColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Couleur hexadécimale attendue (#RRGGBB)')
    .optional(),
});
export type CreateAllianceDto = z.infer<typeof createAllianceSchema>;

export const applyAllianceSchema = z.object({
  message: z.string().trim().max(500, 'Au plus 500 caractères').optional(),
});
export type ApplyAllianceDto = z.infer<typeof applyAllianceSchema>;

export const decideApplicationSchema = z.object({
  decision: z.enum(['ACCEPT', 'REJECT']),
});
export type DecideApplicationDto = z.infer<typeof decideApplicationSchema>;

export const allianceMemberActionSchema = z.object({
  userId: z.string().uuid(),
});
export type AllianceMemberActionDto = z.infer<typeof allianceMemberActionSchema>;

export const emailSchema = z.string().trim().toLowerCase().email().max(254);

export const usernameSchema = z
  .string()
  .trim()
  .min(3, 'Au moins 3 caractères')
  .max(20, 'Au plus 20 caractères')
  .regex(/^[a-zA-Z0-9_-]+$/, 'Lettres, chiffres, tiret et underscore uniquement');

export const passwordSchema = z
  .string()
  .min(10, 'Au moins 10 caractères')
  .max(128, 'Au plus 128 caractères');

export const registerSchema = z.object({
  email: emailSchema,
  username: usernameSchema,
  password: passwordSchema,
  race: z.nativeEnum(RaceType).default(RaceType.MYCELIANS),
});
export type RegisterDto = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
});
export type LoginDto = z.infer<typeof loginSchema>;

export const buildBuildingSchema = z.object({
  planetId: z.string().uuid(),
  type: z.nativeEnum(BuildingType),
});
export type BuildBuildingDto = z.infer<typeof buildBuildingSchema>;

export const startResearchSchema = z.object({
  planetId: z.string().uuid(),
  type: z.nativeEnum(ResearchType),
});
export type StartResearchDto = z.infer<typeof startResearchSchema>;

export const coordinatesSchema = z.object({
  galaxy: z.number().int().min(1),
  system: z.number().int().min(1),
  position: z.number().int().min(1),
});
export type Coordinates = z.infer<typeof coordinatesSchema>;

export const colonizeSchema = z.object({
  sourcePlanetId: z.string().uuid(),
  target: coordinatesSchema,
});
export type ColonizeDto = z.infer<typeof colonizeSchema>;

export const produceShipsSchema = z.object({
  planetId: z.string().uuid(),
  type: z.nativeEnum(ShipType),
  quantity: z.number().int().min(1).max(100),
});
export type ProduceShipsDto = z.infer<typeof produceShipsSchema>;

export const EXPEDITION_SHIP_TYPES = [
  ShipType.SPORAL_SCOUT,
  ShipType.SYMBIOTIC_HARVESTER,
  ShipType.MYCELIAL_TENDRIL,
  ShipType.CHITIN_FREIGHTER,
  ShipType.BIOLUMINESCENT_CRUISER,
  ShipType.SPOROGENESIS_TITAN,
] as const;

export const startExpeditionSchema = z.object({
  planetId: z.string().uuid(),
  target: z.object({
    galaxy: z.number().int().min(1),
    system: z.number().int().min(1),
  }),
  ships: z
    .object({
      [ShipType.SPORAL_SCOUT]: z.number().int().min(0).max(10_000),
      [ShipType.SYMBIOTIC_HARVESTER]: z.number().int().min(0).max(10_000),
      [ShipType.MYCELIAL_TENDRIL]: z.number().int().min(0).max(10_000).default(0),
      [ShipType.CHITIN_FREIGHTER]: z.number().int().min(0).max(10_000).default(0),
      [ShipType.BIOLUMINESCENT_CRUISER]: z.number().int().min(0).max(10_000).default(0),
      [ShipType.SPOROGENESIS_TITAN]: z.number().int().min(0).max(10_000).default(0),
    })
    .refine((ships) => Object.values(ships).some((v) => v > 0), {
      message: 'Au moins un vaisseau doit être envoyé.',
    }),
});
export type StartExpeditionDto = z.infer<typeof startExpeditionSchema>;
export type ExpeditionShipType =
  | ShipType.SPORAL_SCOUT
  | ShipType.SYMBIOTIC_HARVESTER
  | ShipType.MYCELIAL_TENDRIL
  | ShipType.CHITIN_FREIGHTER
  | ShipType.BIOLUMINESCENT_CRUISER
  | ShipType.SPOROGENESIS_TITAN;

const COMBAT_SHIP_TYPES = [
  ShipType.BIOLUMINESCENT_CRUISER,
  ShipType.SPOROGENESIS_TITAN,
  ShipType.SPORAL_DRONE,
  ShipType.ACID_BOMBER,
  ShipType.CHITIN_DESTROYER,
  ShipType.BIOMASS_DREADNOUGHT,
  ShipType.ORBITAL_THORN,
  ShipType.SPORAL_SWARM,
  ShipType.CHITIN_BULWARK,
] as const;

const shipField = () => z.number().int().min(0).max(10_000).default(0);

export const pveShipsSchema = z
  .object({
    [ShipType.SPORAL_SCOUT]: shipField(),
    [ShipType.SYMBIOTIC_HARVESTER]: shipField(),
    [ShipType.MYCELIAL_TENDRIL]: shipField(),
    [ShipType.CHITIN_FREIGHTER]: shipField(),
    [ShipType.BIOLUMINESCENT_CRUISER]: shipField(),
    [ShipType.SPOROGENESIS_TITAN]: shipField(),
    [ShipType.SPORAL_DRONE]: shipField(),
    [ShipType.ACID_BOMBER]: shipField(),
    [ShipType.CHITIN_DESTROYER]: shipField(),
    [ShipType.BIOMASS_DREADNOUGHT]: shipField(),
    [ShipType.SEED_POD]: shipField(),
    [ShipType.SHADOW_SPORE]: shipField(),
    [ShipType.ORBITAL_THORN]: shipField(),
    [ShipType.SPORAL_SWARM]: shipField(),
    [ShipType.LUMINOUS_WARDEN]: shipField(),
    [ShipType.CHITIN_BULWARK]: shipField(),
  })
  .refine(
    (ships) => COMBAT_SHIP_TYPES.some((type) => (ships[type] ?? 0) > 0),
    'Au moins un vaisseau de combat est requis.',
  );

export const attackEncounterSchema = z.object({
  planetId: z.string().uuid(),
  ships: pveShipsSchema,
});
export type AttackEncounterDto = z.infer<typeof attackEncounterSchema>;

export const pvpShipsSchema = z
  .object({
    [ShipType.SPORAL_SCOUT]: shipField(),
    [ShipType.SYMBIOTIC_HARVESTER]: shipField(),
    [ShipType.MYCELIAL_TENDRIL]: shipField(),
    [ShipType.CHITIN_FREIGHTER]: shipField(),
    [ShipType.BIOLUMINESCENT_CRUISER]: shipField(),
    [ShipType.SPOROGENESIS_TITAN]: shipField(),
    [ShipType.SPORAL_DRONE]: shipField(),
    [ShipType.ACID_BOMBER]: shipField(),
    [ShipType.CHITIN_DESTROYER]: shipField(),
    [ShipType.BIOMASS_DREADNOUGHT]: shipField(),
    [ShipType.SEED_POD]: shipField(),
    [ShipType.SHADOW_SPORE]: shipField(),
    [ShipType.ORBITAL_THORN]: shipField(),
    [ShipType.SPORAL_SWARM]: shipField(),
    [ShipType.LUMINOUS_WARDEN]: shipField(),
    [ShipType.CHITIN_BULWARK]: shipField(),
  })
  .refine(
    (ships) => Object.values(ships).some((v) => v > 0),
    'Au moins un vaisseau doit être envoyé.',
  );

export const spyPlanetSchema = z.object({
  sourcePlanetId: z.string().uuid(),
  targetPlanetId: z.string().uuid(),
  ships: pvpShipsSchema.refine(
    (ships) =>
      (ships[ShipType.MYCELIAL_TENDRIL] ?? 0) > 0 || (ships[ShipType.SHADOW_SPORE] ?? 0) > 0,
    'Au moins un vaisseau d’espionnage est requis.',
  ),
});
export type SpyPlanetDto = z.infer<typeof spyPlanetSchema>;

export const attackPlanetSchema = z.object({
  sourcePlanetId: z.string().uuid(),
  targetPlanetId: z.string().uuid(),
  ships: pvpShipsSchema,
});
export type AttackPlanetDto = z.infer<typeof attackPlanetSchema>;

export const updateProfileSchema = z.object({
  displayName: z.string().trim().min(2).max(30).optional(),
  bio: z.string().trim().max(500).optional(),
  bannerColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Couleur hexadécimale attendue (#RRGGBB)')
    .optional(),
  avatarSeed: z.string().trim().min(1).max(64).optional(),
});
export type UpdateProfileDto = z.infer<typeof updateProfileSchema>;

export const renamePlanetSchema = z.object({
  name: z.string().trim().min(3, 'Au moins 3 caractères').max(32, 'Au plus 32 caractères'),
});
export type RenamePlanetDto = z.infer<typeof renamePlanetSchema>;
