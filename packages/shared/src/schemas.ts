/**
 * Schémas Zod partagés (DTO front ↔ back).
 * Le serveur valide chaque entrée avec ces schémas ; le client les réutilise
 * pour la validation de formulaire et l'inférence de types.
 */
import { z } from 'zod';
import {
  BuildingType,
  ChatScope,
  DefenseType,
  ItemKey,
  MarketOrderSide,
  PlanetSpecialization,
  ProductionLineStatus,
  RaceType,
  ResearchType,
  ResourceType,
  ShipType,
  TradeRouteStatus,
  UniverseStatus,
  UserRole,
  PLAYABLE_RACE_TYPES,
} from './enums';

export const sendChatMessageSchema = z
  .object({
    scope: z.nativeEnum(ChatScope),
    content: z.string().trim().min(1, 'Message vide').max(1_000, 'Au plus 1 000 caractères'),
    recipientId: z.string().uuid().optional(),
  })
  .superRefine((value, context) => {
    if (value.scope === ChatScope.PRIVATE && !value.recipientId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['recipientId'],
        message: 'Un destinataire est requis.',
      });
    }
    if (value.scope !== ChatScope.PRIVATE && value.recipientId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['recipientId'],
        message: 'Le destinataire est réservé aux messages privés.',
      });
    }
  });
export type SendChatMessageDto = z.infer<typeof sendChatMessageSchema>;

export const deleteChatMessageSchema = z.object({
  reason: z.string().trim().max(500).optional(),
});
export type DeleteChatMessageDto = z.infer<typeof deleteChatMessageSchema>;

export const changeUserRoleSchema = z.object({
  role: z.enum([UserRole.PLAYER, UserRole.MODERATOR]),
});
export type ChangeUserRoleDto = z.infer<typeof changeUserRoleSchema>;

export const moderateUserSchema = z.object({
  mutedUntil: z.string().datetime().nullable(),
  reason: z.string().trim().max(500).optional(),
});
export type ModerateUserDto = z.infer<typeof moderateUserSchema>;

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
  race: z
    .nativeEnum(RaceType)
    .default(RaceType.MYCELIANS)
    .refine((r) => PLAYABLE_RACE_TYPES.includes(r), { message: 'Race non sélectionnable.' }),
});
export type RegisterDto = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(128),
});
export type LoginDto = z.infer<typeof loginSchema>;

export const resetPasswordSchema = z.object({
  token: z.string().trim().min(1, 'Token requis').max(512),
  password: passwordSchema,
});
export type ResetPasswordDto = z.infer<typeof resetPasswordSchema>;

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

export const buildDefenseSchema = z.object({
  defenseType: z.nativeEnum(DefenseType),
  quantity: z.number().int().min(1).max(10_000),
});
export type BuildDefenseDto = z.infer<typeof buildDefenseSchema>;

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
    [ShipType.BIO_RECYCLER]: shipField(),
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
    [ShipType.BIO_RECYCLER]: shipField(),
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

export const setProductionIntensitiesSchema = z.object({
  intensities: z.record(
    z.nativeEnum(BuildingType),
    z
      .number()
      .int()
      .min(0, 'L’intensité minimale est 0 %')
      .max(100, 'L’intensité maximale est 100 %'),
  ),
});
export type SetProductionIntensitiesDto = z.infer<typeof setProductionIntensitiesSchema>;

export const claimQuestSchema = z.object({
  questId: z.string().trim().min(1, 'questId requis').max(64),
});
export type ClaimQuestDto = z.infer<typeof claimQuestSchema>;

export const createUniverseSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1, 'Le slug est requis')
    .max(64, 'Au plus 64 caractères')
    .regex(/^[a-z0-9-]+$/, 'Lettres minuscules, chiffres et tirets uniquement'),
  name: z.string().trim().min(1, 'Le nom est requis').max(100, 'Au plus 100 caractères'),
  internalApiUrl: z.string().trim().url('URL interne invalide'),
  maxPlayers: z.coerce.number().int().min(1).default(500),
});
export type CreateUniverseDto = z.infer<typeof createUniverseSchema>;

export const universeSummarySchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  name: z.string(),
  playerCount: z.number().int().min(0),
  maxPlayers: z.number().int().min(1),
  status: z.nativeEnum(UniverseStatus),
});

export const universeViewSchema = universeSummarySchema.extend({
  internalApiUrl: z.string(),
  createdAt: z.string().datetime(),
});

export const listUniversesViewSchema = z.array(universeSummarySchema);

export const setSpecializationSchema = z.object({
  specialization: z.nativeEnum(PlanetSpecialization).nullable(),
});
export type SetSpecializationDto = z.infer<typeof setSpecializationSchema>;

export const TRANSPORT_SHIP_TYPES = [
  ShipType.SYMBIOTIC_HARVESTER,
  ShipType.CHITIN_FREIGHTER,
  ShipType.SEED_POD,
] as const;

const transferShipField = () => z.number().int().min(0).max(10_000).default(0);

export const transferResourcesSchema = z.object({
  sourcePlanetId: z.string().uuid(),
  targetPlanetId: z.string().uuid(),
  ships: z
    .object({
      [ShipType.SYMBIOTIC_HARVESTER]: transferShipField(),
      [ShipType.CHITIN_FREIGHTER]: transferShipField(),
      [ShipType.SEED_POD]: transferShipField(),
    })
    .refine(
      (s) => Object.values(s).some((v) => v > 0),
      'Au moins un vaisseau de transport est requis.',
    ),
  resources: z
    .object({
      [ResourceType.BIOMASS]: z.number().int().min(0).default(0),
      [ResourceType.SAP]: z.number().int().min(0).default(0),
      [ResourceType.MINERALS]: z.number().int().min(0).default(0),
      [ResourceType.SPORES]: z.number().int().min(0).default(0),
    })
    .refine(
      (r) => Object.values(r).some((v) => v > 0),
      'Au moins une ressource doit être transférée.',
    ),
});
export type TransferResourcesDto = z.infer<typeof transferResourcesSchema>;

// ── Économie joueur ──

export const placeMarketOrderSchema = z
  .object({
    itemKey: z.nativeEnum(ItemKey),
    side: z.nativeEnum(MarketOrderSide),
    pricePerUnit: z.number().int().min(1).max(10_000_000),
    quantity: z.number().int().min(1).max(10_000),
    sourcePlanetId: z.string().uuid(),
  })
  .refine(
    (d) => d.pricePerUnit * d.quantity <= 2_147_483_647,
    'Le séquestre total doit tenir dans la limite entière de la base de données.',
  );
export type PlaceMarketOrderDto = z.infer<typeof placeMarketOrderSchema>;

export const startCraftingSchema = z.object({
  recipeId: z.string().min(1).max(80),
  planetId: z.string().uuid(),
  quantity: z.number().int().min(1).max(100),
});
export type StartCraftingDto = z.infer<typeof startCraftingSchema>;

export const createTradeRouteSchema = z
  .object({
    fromPlanetId: z.string().uuid(),
    toPlanetId: z.string().uuid(),
    itemKey: z.nativeEnum(ItemKey).optional(),
    resource: z.nativeEnum(ResourceType).optional(),
    quantityPerRun: z.number().int().min(1).max(50_000),
    shipType: z.nativeEnum(ShipType),
    shipCount: z.number().int().min(1).max(1_000),
    intervalHours: z.number().int().min(1).max(168),
  })
  .refine(
    (d) => (d.itemKey != null) !== (d.resource != null),
    'Spécifiez soit un itemKey, soit une ressource (pas les deux).',
  );
export type CreateTradeRouteDto = z.infer<typeof createTradeRouteSchema>;

export const createProductionLineSchema = z.object({
  planetId: z.string().uuid(),
  recipeId: z.string().min(1).max(80),
});
export type CreateProductionLineDto = z.infer<typeof createProductionLineSchema>;

export const updateProductionLineSchema = z
  .object({
    status: z.nativeEnum(ProductionLineStatus).optional(),
  })
  .refine((d) => d.status != null, 'Au moins un champ doit être fourni.');
export type UpdateProductionLineDto = z.infer<typeof updateProductionLineSchema>;

export const updateTradeRouteStatusSchema = z.object({
  status: z.nativeEnum(TradeRouteStatus),
});
export type UpdateTradeRouteStatusDto = z.infer<typeof updateTradeRouteStatusSchema>;
