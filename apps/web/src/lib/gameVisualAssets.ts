import {
  BUILDINGS,
  COMMANDERS,
  DEFENSES,
  ITEMS,
  MOON_BUILDINGS,
  NPC_ENCOUNTER_CONFIGS,
  SHIPS,
  BuildingType,
  CommanderType,
  DefenseType,
  ItemKey,
  MoonBuildingType,
  NpcEncounterType,
  ShipType,
} from '@arborisis/shared';

export type GameVisualCategory =
  | 'buildings'
  | 'moon-buildings'
  | 'ships'
  | 'items'
  | 'commanders'
  | 'npc'
  | 'defenses';

export interface GameVisualAsset {
  category: GameVisualCategory;
  key: string;
  name: string;
  description: string;
  src: string;
  alt: string;
  fallbackIcon: string;
}

function slugifyEnum(value: string): string {
  return value.toLowerCase().replace(/_/g, '-');
}

function makeAsset(
  category: GameVisualCategory,
  key: string,
  name: string,
  description: string,
  fallbackIcon: string,
): GameVisualAsset {
  return {
    category,
    key,
    name,
    description,
    src: `/images/game/${category}/${slugifyEnum(key)}.webp`,
    alt: `${name} - concept art Arborisis`,
    fallbackIcon,
  };
}

export const BUILDING_VISUALS: Record<BuildingType, GameVisualAsset> = Object.fromEntries(
  Object.values(BuildingType).map((type) => {
    const config = BUILDINGS[type];
    return [type, makeAsset('buildings', type, config.name, config.description, 'wrench')] as const;
  }),
) as Record<BuildingType, GameVisualAsset>;

export const MOON_BUILDING_VISUALS: Record<MoonBuildingType, GameVisualAsset> = Object.fromEntries(
  Object.values(MoonBuildingType).map((type) => {
    const config = MOON_BUILDINGS[type];
    return [
      type,
      makeAsset('moon-buildings', type, config.name, config.description, 'circle'),
    ] as const;
  }),
) as Record<MoonBuildingType, GameVisualAsset>;

export const SHIP_VISUALS: Record<ShipType, GameVisualAsset> = Object.fromEntries(
  Object.values(ShipType).map((type) => {
    const config = SHIPS[type];
    return [type, makeAsset('ships', type, config.name, config.description, 'rocket')] as const;
  }),
) as Record<ShipType, GameVisualAsset>;

export const ITEM_VISUALS: Record<ItemKey, GameVisualAsset> = Object.fromEntries(
  Object.values(ItemKey).map((key) => {
    const config = ITEMS[key];
    return [
      key,
      makeAsset('items', key, config.name, config.description, config.icon || 'package'),
    ] as const;
  }),
) as Record<ItemKey, GameVisualAsset>;

export const COMMANDER_VISUALS: Record<CommanderType, GameVisualAsset> = Object.fromEntries(
  Object.values(CommanderType).map((type) => {
    const config = COMMANDERS[type];
    return [type, makeAsset('commanders', type, config.name, config.lore, 'brain')] as const;
  }),
) as Record<CommanderType, GameVisualAsset>;

export const NPC_VISUALS: Record<NpcEncounterType, GameVisualAsset> = Object.fromEntries(
  Object.values(NpcEncounterType).map((type) => {
    const config = NPC_ENCOUNTER_CONFIGS[type];
    return [
      type,
      makeAsset('npc', type, config.name, config.description, 'alertTriangle'),
    ] as const;
  }),
) as Record<NpcEncounterType, GameVisualAsset>;

export const DEFENSE_VISUALS: Record<DefenseType, GameVisualAsset> = Object.fromEntries(
  Object.values(DefenseType).map((type) => {
    const config = DEFENSES[type];
    return [type, makeAsset('defenses', type, config.name, config.description, 'shield')] as const;
  }),
) as Record<DefenseType, GameVisualAsset>;

export const GAME_VISUAL_ASSET_GROUPS = {
  buildings: BUILDING_VISUALS,
  'moon-buildings': MOON_BUILDING_VISUALS,
  ships: SHIP_VISUALS,
  items: ITEM_VISUALS,
  commanders: COMMANDER_VISUALS,
  npc: NPC_VISUALS,
  defenses: DEFENSE_VISUALS,
} as const;
