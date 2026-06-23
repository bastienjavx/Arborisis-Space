import {
  ACHIEVEMENTS,
  AchievementType,
  BASE_STORAGE,
  BUILDINGS,
  BuildingType,
  CHAPTER_UNLOCKS,
  CRAFTING_RECIPES,
  GALACTIC_EVENTS,
  GalacticEventType,
  ITEMS,
  ItemCategory,
  ItemKey,
  ItemRarity,
  LORE_BUILDINGS,
  LORE_RESEARCH,
  LORE_SHIPS,
  PASSIVE_PRODUCTION,
  PLANET_TYPES_CONFIG,
  PlanetSpecialization,
  PlanetType,
  PRODUCTION_LINE_RECIPES,
  RACES,
  RaceType,
  RESEARCHES,
  ResearchType,
  type Requirements,
  type ResourceBundle,
  ResourceType,
  SHIPS,
  ShipRole,
  ShipType,
  SPECIALIZATION_CONFIGS,
  STARTING_RESOURCES,
  UNIVERSE_ORIGIN,
} from '@arborisis/shared';
import {
  FiActivity,
  FiAward,
  FiBookOpen,
  FiCpu,
  FiGlobe,
  FiLayers,
  FiNavigation,
  FiPackage,
  FiRepeat,
  FiShoppingCart,
  FiSliders,
  FiTool,
  FiTruck,
  FiUsers,
  FiZap,
} from 'react-icons/fi';
import type { IconType } from 'react-icons';
import { formatDuration, formatNumber, resourceLabel } from './format';
import { RESOURCE_VISUALS } from './resourceVisuals';

/**
 * Source unique de vérité du **Codex Mycélien** : agrège toutes les données de
 * gameplay partagées (`@arborisis/shared`) en entrées de wiki homogènes. Cette
 * même structure alimente la page `/codex` *et* les fenêtres de survol
 * ({@link WikiPopover}). Les descriptions complètes (souvent tronquées dans
 * l'UI de jeu) et le lore deviennent ainsi consultables partout.
 */

export type CodexAccent = 'canopy' | 'sap' | 'spore';

export interface CodexStat {
  label: string;
  value: string;
}

export type CodexCategoryKey =
  | 'resource'
  | 'building'
  | 'research'
  | 'ship'
  | 'planet'
  | 'race'
  | 'event'
  | 'spec'
  | 'achievement'
  | 'chronicle'
  | 'item'
  | 'mechanic';

export interface CodexEntry {
  id: string;
  category: CodexCategoryKey;
  categoryLabel: string;
  name: string;
  Icon: IconType;
  /** Surcharge éventuelle de la couleur d'icône (ressources). */
  iconClassName?: string;
  accent: CodexAccent;
  summary: string;
  lore?: string;
  stats: CodexStat[];
  /** Coût (pour bâtiments/vaisseaux/recherches). */
  cost?: ResourceBundle;
  costLabel?: string;
  /** Récompense (succès). */
  reward?: ResourceBundle;
  requirements?: string;
  badge?: string;
}

export interface CodexCategory {
  key: CodexCategoryKey;
  label: string;
  Icon: IconType;
  accent: CodexAccent;
  blurb: string;
}

export const CODEX_CATEGORIES: CodexCategory[] = [
  {
    key: 'resource',
    label: 'Ressources',
    Icon: FiActivity,
    accent: 'canopy',
    blurb: 'Les quatre sèves vitales de votre empire.',
  },
  {
    key: 'building',
    label: 'Structures',
    Icon: FiLayers,
    accent: 'canopy',
    blurb: 'Les organes vivants de vos mondes.',
  },
  {
    key: 'research',
    label: 'Recherches',
    Icon: FiCpu,
    accent: 'spore',
    blurb: 'Les savoirs perdus des Tisserands.',
  },
  {
    key: 'ship',
    label: 'Vaisseaux',
    Icon: FiNavigation,
    accent: 'sap',
    blurb: 'Les organismes qui traversent le vide.',
  },
  {
    key: 'planet',
    label: 'Mondes',
    Icon: FiGlobe,
    accent: 'canopy',
    blurb: 'Les types de planètes et leurs dons.',
  },
  {
    key: 'race',
    label: 'Civilisations',
    Icon: FiUsers,
    accent: 'spore',
    blurb: 'Les trois lignées organiques jouables.',
  },
  {
    key: 'event',
    label: 'Événements',
    Icon: FiZap,
    accent: 'sap',
    blurb: 'Les caprices de la galaxie.',
  },
  {
    key: 'spec',
    label: 'Spécialisations',
    Icon: FiSliders,
    accent: 'canopy',
    blurb: 'Les vocations de vos colonies.',
  },
  {
    key: 'achievement',
    label: 'Succès',
    Icon: FiAward,
    accent: 'sap',
    blurb: 'Les jalons de votre renaissance.',
  },
  {
    key: 'item',
    label: 'Objets',
    Icon: FiPackage,
    accent: 'sap',
    blurb: 'Matières premières et objets traités échangeables sur le marché.',
  },
  {
    key: 'mechanic',
    label: 'Économie',
    Icon: FiShoppingCart,
    accent: 'canopy',
    blurb: 'Marché, artisanat, lignes de production et routes commerciales.',
  },
  {
    key: 'chronicle',
    label: 'Chronique',
    Icon: FiBookOpen,
    accent: 'spore',
    blurb: 'Le récit de la Convergence brisée.',
  },
];

/** Classes Tailwind par accent (littérales pour le JIT). */
export const ACCENT_CLASSES: Record<
  CodexAccent,
  { text: string; node: string; glow: string; glowHover: string; dot: string; chip: string }
> = {
  canopy: {
    text: 'text-canopy-300',
    node: 'border-canopy-300/30 bg-canopy-500/[0.08]',
    glow: 'shadow-[0_0_20px_rgba(63,217,137,0.4)]',
    glowHover: 'group-hover:shadow-[0_0_20px_rgba(63,217,137,0.4)]',
    dot: 'bg-canopy-400',
    chip: 'border-canopy-300/25 bg-canopy-500/10 text-canopy-200',
  },
  sap: {
    text: 'text-sap-400',
    node: 'border-sap-400/30 bg-sap-500/[0.08]',
    glow: 'shadow-[0_0_20px_rgba(245,201,107,0.38)]',
    glowHover: 'group-hover:shadow-[0_0_20px_rgba(245,201,107,0.38)]',
    dot: 'bg-sap-400',
    chip: 'border-sap-400/25 bg-sap-500/10 text-sap-400',
  },
  spore: {
    text: 'text-spore-400',
    node: 'border-spore-500/30 bg-spore-500/[0.08]',
    glow: 'shadow-[0_0_20px_rgba(155,140,255,0.42)]',
    glowHover: 'group-hover:shadow-[0_0_20px_rgba(155,140,255,0.42)]',
    dot: 'bg-spore-400',
    chip: 'border-spore-500/25 bg-spore-500/10 text-spore-400',
  },
};

const ROLE_LABELS: Record<ShipRole, string> = {
  [ShipRole.COMBAT]: 'Combat',
  [ShipRole.TRANSPORT]: 'Transport',
  [ShipRole.ESPIONAGE]: 'Espionnage',
  [ShipRole.DEFENSE]: 'Défense',
  [ShipRole.SUPPORT]: 'Support',
};

const RACE_LABELS: Record<RaceType, string> = {
  [RaceType.MYCELIANS]: 'Mycéliens',
  [RaceType.PHOTOSYNTHEX]: 'Photosynthex',
  [RaceType.CHITINIDS]: 'Chitinids',
};

/** Identifiant stable d'une entrée, partagé entre l'UI de jeu et le codex. */
export const codexId = {
  resource: (t: ResourceType) => `resource:${t}`,
  building: (t: BuildingType) => `building:${t}`,
  research: (t: ResearchType) => `research:${t}`,
  ship: (t: ShipType) => `ship:${t}`,
  planet: (t: PlanetType) => `planet:${t}`,
  race: (t: RaceType) => `race:${t}`,
  event: (t: GalacticEventType) => `event:${t}`,
  spec: (t: PlanetSpecialization) => `spec:${t}`,
  achievement: (t: AchievementType) => `achievement:${t}`,
  item: (k: ItemKey) => `item:${k}`,
  mechanic: (id: string) => `mechanic:${id}`,
};

const RARITY_LABELS: Record<ItemRarity, string> = {
  [ItemRarity.COMMON]: 'Commun',
  [ItemRarity.UNCOMMON]: 'Peu commun',
  [ItemRarity.RARE]: 'Rare',
  [ItemRarity.EPIC]: 'Épique',
  [ItemRarity.LEGENDARY]: 'Légendaire',
};

const CATEGORY_LABELS: Record<ItemCategory, string> = {
  [ItemCategory.RAW_MATERIAL]: 'Matière première',
  [ItemCategory.PROCESSED]: 'Objet traité',
};

function itemAccent(rarity: ItemRarity): CodexAccent {
  if (rarity === ItemRarity.EPIC || rarity === ItemRarity.LEGENDARY) return 'spore';
  if (rarity === ItemRarity.RARE) return 'sap';
  return 'canopy';
}

/** Sources d'obtention par item — utilisé dans le codex pour guider le joueur. */
const ITEM_SOURCES: Partial<Record<ItemKey, string>> = {
  [ItemKey.MYCELIAL_FIBER]: 'PvE (Parasite Sporal, Nuée Mycospore), ligne de production',
  [ItemKey.BIOLUMINESCENT_GEL]: 'PvE (Nid Mycoxine, Corruption de Biomasse), ligne de production',
  [ItemKey.CHITIN_SHARD]: 'PvE (Gardien Cristallin, Réseau Fongique), ligne de production',
  [ItemKey.SPORE_ESSENCE]: 'PvE (Réseau Fongique, Faille du Vide), ligne de production',
  [ItemKey.VOID_CRYSTAL]: 'PvE (Faille du Vide, Gardien Cristallin)',
  [ItemKey.ANCIENT_FRAGMENT]: 'PvE exclusif — Sentinelle Ancienne (boss légendaire)',
  [ItemKey.REINFORCED_CHITIN]: 'Artisanat (5× Éclat de Chitine + Minéraux)',
  [ItemKey.CRYSTALLIZED_SAP]: 'Artisanat (1× Cristal du Vide + Sève)',
  [ItemKey.NEURAL_MATRIX]: 'Artisanat (Fibre Mycéliale + Essence Sporale + Spores)',
  [ItemKey.VOID_ALLOY]: 'Artisanat (3× Cristal du Vide + Minéraux)',
  [ItemKey.MYCOTOXIN_VIAL]: 'Artisanat (3× Gel Bioluminescent + Biomasse)',
  [ItemKey.CONVERGENCE_SHARD]: 'Artisanat endgame (2× Fragment Ancien + 2× Cristal du Vide)',
};

/** Format d'un facteur multiplicatif en écart relatif (1.25 → « +25 % »). */
function pct(factor: number): string {
  const delta = Math.round((factor - 1) * 100);
  return `${delta > 0 ? '+' : ''}${delta} %`;
}

function bonusStats(bonus: Partial<Record<ResourceType, number>>): CodexStat[] {
  return Object.entries(bonus).map(([resource, factor]) => ({
    label: resourceLabel(resource as ResourceType),
    value: pct(factor as number),
  }));
}

function requirementString(requires?: Requirements): string | undefined {
  if (!requires) return undefined;
  const parts: string[] = [];
  for (const [type, level] of Object.entries(requires.buildings ?? {})) {
    parts.push(`${BUILDINGS[type as BuildingType].name} niv. ${level}`);
  }
  for (const [type, level] of Object.entries(requires.research ?? {})) {
    parts.push(`${RESEARCHES[type as ResearchType].name} niv. ${level}`);
  }
  return parts.length ? parts.join(' · ') : undefined;
}

const RESOURCE_SUMMARIES: Record<ResourceType, string> = {
  [ResourceType.BIOMASS]:
    'Matériau de construction primaire, tissé depuis la matière organique brute. Le socle de toute croissance.',
  [ResourceType.SAP]:
    'Sang de la planète : fluide vital qui alimente et fait croître la plupart de vos structures.',
  [ResourceType.MINERALS]:
    'Matériau structurel avancé extrait des veines cristallines profondes des mondes.',
  [ResourceType.SPORES]:
    "Monnaie du savoir et de l'expansion : carburant de la recherche et de l'essaimage.",
};

function buildEntries(): CodexEntry[] {
  const entries: CodexEntry[] = [];

  // ── Ressources ──
  for (const type of Object.values(ResourceType)) {
    const visual = RESOURCE_VISUALS[type];
    const passive = PASSIVE_PRODUCTION[type] ?? 0;
    entries.push({
      id: codexId.resource(type),
      category: 'resource',
      categoryLabel: 'Ressource',
      name: resourceLabel(type),
      Icon: visual.Icon,
      iconClassName: visual.className,
      accent: 'canopy',
      summary: RESOURCE_SUMMARIES[type],
      stats: [
        {
          label: 'Production passive',
          value: passive > 0 ? `${formatNumber(passive)}/h` : 'Aucune',
        },
        { label: 'Stockage de base', value: `${formatNumber(BASE_STORAGE)}` },
        {
          label: 'Réserve de départ',
          value: formatNumber(STARTING_RESOURCES[type] ?? 0),
        },
      ],
    });
  }

  // ── Structures ──
  for (const config of Object.values(BUILDINGS)) {
    const stats: CodexStat[] = [];
    if (config.producesResource && config.baseProduction) {
      stats.push({
        label: 'Production (niv. 1)',
        value: `${formatNumber(config.baseProduction)} ${resourceLabel(config.producesResource)}/h`,
      });
    }
    if (config.baseEnergyProduction) {
      stats.push({
        label: 'Énergie produite',
        value: `${formatNumber(config.baseEnergyProduction)}/h`,
      });
    }
    if (config.baseEnergyConsumption) {
      stats.push({
        label: 'Énergie consommée',
        value: `${formatNumber(config.baseEnergyConsumption)}/h`,
      });
    }
    stats.push({ label: 'Niveau max', value: `${config.maxLevel}` });
    stats.push({ label: 'Facteur de coût', value: `×${config.costFactor}/niv.` });
    entries.push({
      id: codexId.building(config.type),
      category: 'building',
      categoryLabel: 'Structure',
      name: config.name,
      Icon: FiLayers,
      accent: 'canopy',
      summary: config.description,
      lore: LORE_BUILDINGS[config.type]?.lore,
      stats,
      cost: config.baseCost,
      costLabel: 'Coût niveau 1',
      requirements: requirementString(config.requires),
    });
  }

  // ── Recherches ──
  for (const config of Object.values(RESEARCHES)) {
    entries.push({
      id: codexId.research(config.type),
      category: 'research',
      categoryLabel: 'Recherche',
      name: config.name,
      Icon: FiCpu,
      accent: 'spore',
      summary: config.description,
      lore: LORE_RESEARCH[config.type]?.lore,
      stats: [
        { label: 'Niveau max', value: `${config.maxLevel}` },
        { label: 'Durée (niv. 1)', value: formatDuration(config.baseTimeSeconds) },
        { label: 'Facteur de coût', value: `×${config.costFactor}/niv.` },
      ],
      cost: config.baseCost,
      costLabel: 'Coût niveau 1',
      requirements: requirementString(config.requires),
    });
  }

  // ── Vaisseaux ──
  for (const config of Object.values(SHIPS)) {
    entries.push({
      id: codexId.ship(config.type),
      category: 'ship',
      categoryLabel: 'Vaisseau',
      name: config.name,
      Icon: FiNavigation,
      accent: 'sap',
      summary: config.description,
      lore: LORE_SHIPS[config.type]?.lore,
      badge:
        config.restrictedToRaces && config.restrictedToRaces.length > 0
          ? `Exclusif · ${config.restrictedToRaces.map((r) => RACE_LABELS[r]).join(', ')}`
          : undefined,
      stats: [
        { label: 'Rôle', value: ROLE_LABELS[config.role] },
        { label: 'Attaque', value: formatNumber(config.attack) },
        { label: 'Défense', value: formatNumber(config.defense) },
        { label: 'Coque', value: formatNumber(config.hull) },
        { label: 'Cargaison', value: formatNumber(config.cargo) },
        { label: 'Vitesse', value: `${config.speed}` },
        { label: 'Croissance', value: formatDuration(config.baseTimeSeconds) },
        { label: 'Berceau requis', value: `Niv. ${config.requiresNurseryLevel}` },
      ],
      cost: config.cost,
      costLabel: "Coût d'éclosion",
    });
  }

  // ── Mondes ──
  for (const config of Object.values(PLANET_TYPES_CONFIG)) {
    entries.push({
      id: codexId.planet(config.type),
      category: 'planet',
      categoryLabel: 'Type de monde',
      name: config.name,
      Icon: FiGlobe,
      accent: 'canopy',
      summary: config.description,
      stats: [
        ...bonusStats(config.productionBonus),
        { label: 'Coût terraformation', value: `×${config.terraformCostFactor}` },
      ],
    });
  }

  // ── Civilisations ──
  for (const config of Object.values(RACES)) {
    const stats: CodexStat[] = [...bonusStats(config.productionBonus)];
    if (config.shipSpeedFactor !== 1)
      stats.push({ label: 'Vitesse des vaisseaux', value: pct(config.shipSpeedFactor) });
    if (config.researchCostFactor !== 1)
      stats.push({ label: 'Coût de recherche', value: pct(config.researchCostFactor) });
    if (config.defenseFactor !== 1)
      stats.push({ label: 'Défense orbitale', value: pct(config.defenseFactor) });
    if (config.attackFactor !== 1)
      stats.push({ label: 'Puissance d’attaque', value: pct(config.attackFactor) });
    if (config.startingShip)
      stats.push({ label: 'Vaisseau de départ', value: SHIPS[config.startingShip].name });
    entries.push({
      id: codexId.race(config.type),
      category: 'race',
      categoryLabel: 'Civilisation',
      name: config.name,
      Icon: FiUsers,
      accent: 'spore',
      summary: config.description,
      stats,
    });
  }

  // ── Événements ──
  for (const config of Object.values(GALACTIC_EVENTS)) {
    entries.push({
      id: codexId.event(config.type),
      category: 'event',
      categoryLabel: 'Événement galactique',
      name: config.name,
      Icon: FiZap,
      accent: 'sap',
      summary: config.description,
      stats: [
        { label: 'Effet', value: config.effectDescription },
        { label: 'Durée', value: `${config.durationHours} h` },
      ],
    });
  }

  // ── Spécialisations ──
  for (const [key, config] of Object.entries(SPECIALIZATION_CONFIGS)) {
    const stats: CodexStat[] = [];
    if (config.productionMultiplier !== 1)
      stats.push({ label: 'Production', value: pct(config.productionMultiplier) });
    if (config.defenseMultiplier !== 1)
      stats.push({ label: 'Défense', value: pct(config.defenseMultiplier) });
    if (config.researchTimeFactor !== 1)
      stats.push({ label: 'Vitesse de recherche', value: pct(config.researchTimeFactor) });
    if (config.shipTimeFactor !== 1)
      stats.push({ label: 'Temps de production', value: pct(config.shipTimeFactor) });
    entries.push({
      id: codexId.spec(key as PlanetSpecialization),
      category: 'spec',
      categoryLabel: 'Spécialisation',
      name: config.name,
      Icon: FiSliders,
      accent: 'canopy',
      summary: config.description,
      stats,
    });
  }

  // ── Succès ──
  for (const config of Object.values(ACHIEVEMENTS)) {
    entries.push({
      id: codexId.achievement(config.type),
      category: 'achievement',
      categoryLabel: 'Succès',
      name: config.name,
      Icon: FiAward,
      accent: 'sap',
      summary: config.description,
      lore: config.rewardText,
      reward: config.reward,
      stats: [],
    });
  }

  // ── Objets ──
  for (const config of Object.values(ITEMS)) {
    const accent = itemAccent(config.rarity);
    const lineRecipe = PRODUCTION_LINE_RECIPES.find((r) => r.outputKey === config.key);
    const craftRecipe = CRAFTING_RECIPES.find((r) => r.outputKey === config.key);
    const stats: CodexStat[] = [
      { label: 'Rareté', value: RARITY_LABELS[config.rarity] },
      { label: 'Type', value: CATEGORY_LABELS[config.category] },
      { label: 'Valeur de base', value: `${config.baseValue.toLocaleString()} B` },
      { label: 'Pile max', value: `${config.maxStack}` },
    ];
    if (lineRecipe) {
      stats.push({
        label: 'Ligne de production',
        value: `${lineRecipe.outputQty} unité(s) / ${formatDuration(lineRecipe.cycleSeconds)}`,
      });
    }
    if (craftRecipe) {
      stats.push({
        label: 'Temps artisanat',
        value: formatDuration(craftRecipe.craftTimeSeconds),
      });
    }
    entries.push({
      id: codexId.item(config.key),
      category: 'item',
      categoryLabel: 'Objet',
      name: config.name,
      Icon: FiPackage,
      accent,
      summary: config.description,
      stats,
      requirements: ITEM_SOURCES[config.key],
      badge: RARITY_LABELS[config.rarity],
    });
  }

  // ── Économie ──
  entries.push({
    id: codexId.mechanic('market'),
    category: 'mechanic',
    categoryLabel: 'Mécanique',
    name: 'Salle des Marchés',
    Icon: FiShoppingCart,
    accent: 'canopy',
    summary:
      "Bourse d'échanges entre joueurs fonctionnant par ordres d'achat (bid) et de vente (ask). Les prix sont entièrement déterminés par l'offre et la demande — aucun NPC ne fixe les cours.",
    stats: [
      { label: 'Accès', value: 'Marché → sélectionner un objet' },
      { label: 'Devise', value: 'Biomasse (B)' },
      { label: 'Mise à jour prix', value: 'Toutes les 15 s' },
      { label: 'Volume 24h', value: 'Affiché par objet' },
    ],
    lore: "Autrefois, les Tisserands traquaient la valeur dans les flux de spores.\nAujourd'hui, c'est toi qui fixes le prix.",
  });

  entries.push({
    id: codexId.mechanic('crafting'),
    category: 'mechanic',
    categoryLabel: 'Mécanique',
    name: 'Artisanat',
    Icon: FiTool,
    accent: 'canopy',
    summary:
      "Atelier de transformation manuelle : combinez des objets bruts et des ressources pour créer des objets traités de rareté supérieure. Chaque recette prend du temps et consomme les ingrédients.",
    stats: [
      { label: 'Recettes disponibles', value: `${CRAFTING_RECIPES.length}` },
      { label: 'Ingrédients', value: 'Objets + ressources de base' },
      { label: 'Accès', value: 'Menu Artisanat' },
      {
        label: 'Durée la plus longue',
        value: formatDuration(Math.max(...CRAFTING_RECIPES.map((r) => r.craftTimeSeconds))),
      },
    ],
    lore: "La chitine brute ne vaut rien. Fondue, renforcée, pressée — elle devient armure.\nL'artisanat est la transformation de la patience en valeur.",
  });

  entries.push({
    id: codexId.mechanic('production-lines'),
    category: 'mechanic',
    categoryLabel: 'Mécanique',
    name: 'Lignes de Production',
    Icon: FiRepeat,
    accent: 'canopy',
    summary:
      "Fabriques automatiques qui convertissent des ressources de base en matières premières à intervalles réguliers. Chaque planète peut accueillir jusqu'à 3 lignes simultanées.",
    stats: [
      { label: 'Max par planète', value: '3 lignes' },
      { label: 'Recettes', value: `${PRODUCTION_LINE_RECIPES.length}` },
      { label: 'Statuts possibles', value: 'Active · Pausée · Intrants manquants' },
      {
        label: 'Cycle le plus rapide',
        value: formatDuration(Math.min(...PRODUCTION_LINE_RECIPES.map((r) => r.cycleSeconds))),
      },
    ],
    lore: "Une colonie qui dort produit quand même.\nConfigurez vos lignes avant de partir en campagne.",
  });

  entries.push({
    id: codexId.mechanic('trade-routes'),
    category: 'mechanic',
    categoryLabel: 'Mécanique',
    name: 'Routes Commerciales',
    Icon: FiTruck,
    accent: 'canopy',
    summary:
      "Convois automatiques qui transfèrent ressources ou objets entre vos planètes à intervalles réguliers. Utilisez les vaisseaux de transport adaptés pour maximiser la cargaison par trajet.",
    stats: [
      { label: 'Types de cargaison', value: "Ressources de base · Objets d'inventaire" },
      { label: 'Vaisseaux transport', value: 'Moissonneur Symbiotique · Frégate Chitine · Nacelle' },
      { label: 'Intervalle min / max', value: '1 h — 168 h' },
      { label: 'Accès', value: 'Routes Commerciales → Nouvelle route' },
    ],
    lore: "Les Tisserands ne portaient rien à la main.\nIls tendaient des fils entre les mondes, et les fils portaient pour eux.",
  });

  // ── Chronique ──
  entries.push({
    id: 'chronicle:origin',
    category: 'chronicle',
    categoryLabel: 'Origine',
    name: 'La Convergence Primordiale',
    Icon: FiBookOpen,
    accent: 'spore',
    summary: 'Aux origines : la grandeur des Tisserands et la Grande Fragmentation.',
    lore: UNIVERSE_ORIGIN,
    stats: [],
  });
  for (const chapter of CHAPTER_UNLOCKS) {
    entries.push({
      id: `chronicle:chapter-${chapter.id}`,
      category: 'chronicle',
      categoryLabel: 'Chapitre',
      name: chapter.title,
      Icon: FiBookOpen,
      accent: 'spore',
      summary: `Déclencheur : ${chapter.trigger}`,
      lore: chapter.text,
      stats: [{ label: 'Déverrouillage', value: chapter.trigger }],
    });
  }

  return entries;
}

export const CODEX_ENTRIES: CodexEntry[] = buildEntries();

const ENTRY_INDEX = new Map(CODEX_ENTRIES.map((entry) => [entry.id, entry]));

export function getCodexEntry(id: string): CodexEntry | undefined {
  return ENTRY_INDEX.get(id);
}

/** Recherche plein texte simple sur nom + résumé + catégorie. */
export function searchCodex(query: string): CodexEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return CODEX_ENTRIES;
  return CODEX_ENTRIES.filter((entry) =>
    `${entry.name} ${entry.summary} ${entry.categoryLabel}`.toLowerCase().includes(q),
  );
}
