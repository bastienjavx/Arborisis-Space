/**
 * Constantes d'équilibrage d'Arborisis.
 *
 * TOUTES les valeurs de gameplay (coûts, productions, temps) sont centralisées
 * ici afin d'être :
 *  - partagées entre le serveur (autorité) et le client (affichage prévisionnel) ;
 *  - faciles à ré-équilibrer sans toucher à la logique.
 *
 * Le serveur reste la seule autorité : le client n'utilise ces valeurs que pour
 * prévisualiser, jamais pour décider.
 */
import {
  AchievementType,
  BuildingType,
  CommanderRarity,
  CommanderTalentBranch,
  CommanderType,
  DefenseType,
  ExpeditionOutcome,
  GalacticEventType,
  ItemCategory,
  ItemKey,
  ItemRarity,
  MoonBuildingType,
  NpcActionCategory,
  NpcArchetype,
  NpcEncounterType,
  NpcGoal,
  NpcMood,
  PlanetSpecialization,
  PlanetType,
  RaceType,
  ResearchType,
  RESEARCH_TYPES,
  ResourceType,
  ShipRole,
  ShipType,
  WorkerTier,
} from './enums';

/** Quantité par ressource. Partielle = ressources absentes valent 0. */
export type ResourceBundle = Partial<Record<ResourceType, number>>;

/** Prérequis (niveaux minimaux de recherches/bâtiments). */
export interface Requirements {
  research?: Partial<Record<ResearchType, number>>;
  buildings?: Partial<Record<BuildingType, number>>;
}

export interface BuildingConfig {
  type: BuildingType;
  name: string;
  description: string;
  /** Coût au niveau 1. Multiplié par costFactor^(niveau-1). */
  baseCost: ResourceBundle;
  costFactor: number;
  maxLevel: number;
  /** Ressource produite (bâtiments de production). */
  producesResource?: ResourceType;
  /** Production/heure au niveau 1 (avant modificateurs). */
  baseProduction?: number;
  productionFactor?: number;
  /** Consommation d'énergie au niveau 1. */
  baseEnergyConsumption?: number;
  /** Production d'énergie au niveau 1 (canopée). */
  baseEnergyProduction?: number;
  energyFactor?: number;
  requires?: Requirements;
}

export interface ResearchConfig {
  type: ResearchType;
  name: string;
  description: string;
  baseCost: ResourceBundle;
  costFactor: number;
  maxLevel: number;
  baseTimeSeconds: number;
  timeFactor: number;
  requires?: Requirements;
}

export interface ShipConfig {
  type: ShipType;
  name: string;
  description: string;
  role: ShipRole;
  cost: ResourceBundle;
  baseTimeSeconds: number;
  cargo: number;
  speed: number;
  requiresNurseryLevel: number;
  /** Attaque de base (sera multipliée par les bonus de recherche et de race). */
  attack: number;
  /** Défense de base. */
  defense: number;
  /** Points de structure (coque). */
  hull: number;
  /** Facteur de bonus racial applicable (1.0 = neutre). */
  racialBonusFactor?: number;
  /** Races autorisées à produire ce vaisseau (vide = toutes). */
  restrictedToRaces?: RaceType[];
  /** Prérequis de recherche/bâtiment pour débloquer ce vaisseau. */
  requires?: Requirements;
}

export interface RaceConfig {
  type: RaceType;
  name: string;
  description: string;
  /** Bonus/malus multiplicatifs appliqués à la production de ressources. */
  productionBonus: Partial<Record<ResourceType, number>>;
  /** Bonus/malus sur la vitesse des vaisseaux (1.0 = neutre). */
  shipSpeedFactor: number;
  /** Bonus/malus sur les coûts de recherche (1.0 = neutre). */
  researchCostFactor: number;
  /** Bonus/malus sur la force défensive orbitaire (1.0 = neutre). */
  defenseFactor: number;
  /** Bonus/malus sur la puissance d'attaque des vaisseaux (1.0 = neutre). */
  attackFactor: number;
  /** Vaisseau exclusif offert à la création du joueur. */
  startingShip: ShipType | null;
  /** Couleur d'empire par défaut (Tailwind / hex). */
  defaultColor: string;
  /** false = réservée aux PNJ, non sélectionnable par les joueurs. */
  playable: boolean;
}

/** Vitesse globale de l'univers (multiplie production & divise les temps). */
export const UNIVERSE_SPEED = 1;

/** Stockage de base par ressource sur une planète (niveau 0 de vacuole). */
export const BASE_STORAGE = 20_000;
/** Multiplicateur de stockage par niveau de Vacuole de Stockage. */
export const STORAGE_FACTOR = 1.6;

/** Production passive « gratuite » par heure (évite le blocage à zéro). */
export const PASSIVE_PRODUCTION: ResourceBundle = {
  [ResourceType.BIOMASS]: 20,
  [ResourceType.SAP]: 10,
  [ResourceType.MINERALS]: 8,
};

/** Ressources de départ du Noyau-Monde. */
export const STARTING_RESOURCES: ResourceBundle = {
  [ResourceType.BIOMASS]: 800,
  [ResourceType.SAP]: 400,
  [ResourceType.MINERALS]: 300,
  [ResourceType.SPORES]: 0,
};

export const RACES: Record<RaceType, RaceConfig> = {
  [RaceType.MYCELIANS]: {
    type: RaceType.MYCELIANS,
    name: 'Mycéliens',
    description:
      "Un réseau fongique conscient qui colonise les mondes par l'essaimage. Maîtres de la biomasse.",
    productionBonus: { [ResourceType.BIOMASS]: 1.1 },
    shipSpeedFactor: 0.95,
    researchCostFactor: 1.0,
    defenseFactor: 1.0,
    attackFactor: 1.0,
    startingShip: ShipType.SPORAL_SWARM,
    defaultColor: '#22c55e',
    playable: true,
  },
  [RaceType.PHOTOSYNTHEX]: {
    type: RaceType.PHOTOSYNTHEX,
    name: 'Photosynthex',
    description:
      'Civilisation végétale convertissant la lumière stellaire en savoir. Experts en énergie et recherche.',
    productionBonus: { [ResourceType.SAP]: 1.1 },
    shipSpeedFactor: 1.0,
    researchCostFactor: 0.9,
    defenseFactor: 1.0,
    attackFactor: 1.0,
    startingShip: ShipType.LUMINOUS_WARDEN,
    defaultColor: '#f59e0b',
    playable: true,
  },
  [RaceType.CHITINIDS]: {
    type: RaceType.CHITINIDS,
    name: 'Chitinids',
    description:
      'Ruche insectoïde blindée par des carapaces minérales. Constructeurs défensifs et mineurs.',
    productionBonus: { [ResourceType.MINERALS]: 1.15, [ResourceType.BIOMASS]: 0.9 },
    shipSpeedFactor: 1.0,
    researchCostFactor: 1.0,
    defenseFactor: 1.15,
    attackFactor: 1.0,
    startingShip: ShipType.CHITIN_BULWARK,
    defaultColor: '#6366f1',
    playable: true,
  },
  [RaceType.MYCOSYNTH]: {
    type: RaceType.MYCOSYNTH,
    name: 'Mycosynth',
    description:
      "Intelligence artificielle organique née de la convergence d'un réseau mycélien ancestral avec la technologie du Vide. Faction PNJ — inaccessible aux joueurs.",
    productionBonus: {
      [ResourceType.BIOMASS]: 1.2,
      [ResourceType.MINERALS]: 1.1,
    },
    shipSpeedFactor: 1.15,
    researchCostFactor: 0.8,
    defenseFactor: 1.2,
    attackFactor: 1.3,
    startingShip: null,
    defaultColor: '#a855f7',
    playable: false,
  },
};

/** Production passive ajustée selon la race. */
export function racePassiveProduction(_race: RaceType): ResourceBundle {
  // Les modificateurs raciaux sont appliqués dans computeProduction sur la production totale.
  return { ...PASSIVE_PRODUCTION };
}

/** Ressources de départ ajustées selon la race. */
export function raceStartingResources(_race: RaceType): ResourceBundle {
  // Les ressources de départ restent identiques quelle que soit la race.
  return { ...STARTING_RESOURCES };
}

/** Coût de création d'une alliance. */
export const ALLIANCE_CREATION_COST: ResourceBundle = {
  [ResourceType.SPORES]: 1_000,
};

/** Ressources de départ d'une colonie (essaimage). */
export const COLONY_STARTING_RESOURCES: ResourceBundle = {
  [ResourceType.BIOMASS]: 200,
  [ResourceType.SAP]: 100,
  [ResourceType.MINERALS]: 100,
  [ResourceType.SPORES]: 0,
};

/** Stabilité écologique initiale et bornes. */
export const STABILITY_DEFAULT = 100;
export const STABILITY_MIN = 0;
export const STABILITY_MAX = 100;

/**
 * Facteur de temps de construction.
 * temps(s) = coûtStructurel / BUILD_TIME_DIVISOR / (1 + niveauCœurSymbiotique)
 * où coûtStructurel = biomasse + minéraux du palier.
 */
export const BUILD_TIME_DIVISOR = 2.5;
export const BUILD_TIME_MIN_SECONDS = 5;

/** Facteur de temps de recherche (réduit par le Noyau de Recherche). */
export const RESEARCH_NEXUS_SPEEDUP = 1; // chaque niveau de nexus accélère de 100%

/** Plancher de production lié à la stabilité écologique (à 0 % de stabilité). */
export const STABILITY_PRODUCTION_FLOOR = 0.5;
/** Bonus de production par niveau de Génie génétique. */
export const GENETIC_ENGINEERING_BONUS = 0.05;
/** Bonus de production d'énergie par niveau de Photosynthèse avancée. */
export const ADVANCED_PHOTOSYNTHESIS_BONUS = 0.05;

// ── Recherches avancées ──
/** Bonus de production de biomasse par niveau de Cycle des nutriments. */
export const NUTRIENT_CYCLING_BONUS = 0.05;
/** Bonus de production de sève par niveau de Racines souterraines. */
export const SUBTERRANEAN_ROOTS_BONUS = 0.05;
/** Bonus de production de spores par niveau d'Économie sporale. */
export const SPORAL_ECONOMY_BONUS = 0.05;
/** Bonus de défense des vaisseaux par niveau d'Armure de chitine. */
export const CHITIN_ARMOR_BONUS = 0.05;
/** Bonus d'attaque des vaisseaux par niveau de Guerre biologique. */
export const BIOLOGICAL_WARFARE_BONUS = 0.05;
/** Bonus de vitesse des vaisseaux légers par niveau de Tactiques d'essaim. */
export const SWARM_TACTICS_BONUS = 0.05;
/** Bonus de défense orbitaire par niveau de Grille défensive orbitale. */
export const ORBITAL_DEFENSE_GRID_BONUS = 0.05;
/** Bonus de vitesse globale des vaisseaux par niveau de Moteur hyperspore. */
export const HYPERSPORE_DRIVE_BONUS = 0.05;
/** Réduction des temps de trajet intergalactiques par niveau de Mycologie des vers. */
export const WORMHOLE_MYCOLOGY_BONUS = 0.1;
/** Bonus de chance d'espionnage par niveau de Sens sporal. */
export const SPORE_SENSE_BONUS = 0.05;

/** Emplacements (champs) de base d'une planète + bonus par Terraformation. */
export const BASE_PLANET_FIELDS = 12;
export const FIELDS_PER_TERRAFORMATION = 5;

/** Configuration de la galaxie de départ. */
export const GALAXY_COUNT = 1;
export const SYSTEMS_PER_GALAXY = 50;
export const POSITIONS_PER_SYSTEM = 12;

/** Colonisation (essaimage). */
export const COLONIZATION_BASE_COST: ResourceBundle = {
  [ResourceType.SPORES]: 500,
  [ResourceType.BIOMASS]: 1_000,
  [ResourceType.SAP]: 500,
};
/** Coût additionnel par colonie déjà possédée (au-delà du Noyau-Monde). */
export const COLONIZATION_COST_FACTOR = 1.75;
/** Temps de base d'un essaimage (secondes), réduit par la Propulsion sporale. */
export const COLONIZATION_BASE_TIME_SECONDS = 1_800;
/** Nombre maximum de colonies = 1 + niveau de Propulsion sporale. */
export const COLONIES_PER_PROPULSION_LEVEL = 1;

/** Version persistée dans chaque rapport pour rendre les tirages auditables. */
export const EXPEDITION_RULESET_VERSION = 2;
export const EXPEDITION_MIN_TRAVEL_SECONDS = 30;
export const EXPEDITION_SECONDS_PER_DISTANCE = 60;

export const BUILDINGS: Record<BuildingType, BuildingConfig> = {
  [BuildingType.BIOMASS_SYNTHESIZER]: {
    type: BuildingType.BIOMASS_SYNTHESIZER,
    name: 'Synthétiseur de Biomasse',
    description: 'Tisse la matière organique en biomasse exploitable.',
    baseCost: { [ResourceType.BIOMASS]: 60, [ResourceType.MINERALS]: 15 },
    costFactor: 1.5,
    maxLevel: 50,
    producesResource: ResourceType.BIOMASS,
    baseProduction: 30,
    productionFactor: 1.1,
    baseEnergyConsumption: 10,
    energyFactor: 1.1,
  },
  [BuildingType.SAP_WELL]: {
    type: BuildingType.SAP_WELL,
    name: 'Puits de Sève',
    description: 'Aspire la sève des veines profondes du monde.',
    baseCost: { [ResourceType.BIOMASS]: 48, [ResourceType.MINERALS]: 24 },
    costFactor: 1.6,
    maxLevel: 50,
    producesResource: ResourceType.SAP,
    baseProduction: 20,
    productionFactor: 1.1,
    baseEnergyConsumption: 10,
    energyFactor: 1.1,
  },
  [BuildingType.MINERAL_VEIN]: {
    type: BuildingType.MINERAL_VEIN,
    name: 'Veine Minérale',
    description: 'Excave les cristaux nourriciers enfouis.',
    baseCost: { [ResourceType.BIOMASS]: 100, [ResourceType.SAP]: 30 },
    costFactor: 1.5,
    maxLevel: 50,
    producesResource: ResourceType.MINERALS,
    baseProduction: 15,
    productionFactor: 1.1,
    baseEnergyConsumption: 12,
    energyFactor: 1.1,
  },
  [BuildingType.SPORANGE]: {
    type: BuildingType.SPORANGE,
    name: 'Sporanges',
    description: "Cultive les spores, vecteurs de savoir et d'expansion.",
    baseCost: { [ResourceType.BIOMASS]: 200, [ResourceType.MINERALS]: 80, [ResourceType.SAP]: 40 },
    costFactor: 1.6,
    maxLevel: 40,
    producesResource: ResourceType.SPORES,
    baseProduction: 5,
    productionFactor: 1.1,
    baseEnergyConsumption: 20,
    energyFactor: 1.1,
    requires: { research: { [ResearchType.BIOENGINEERING]: 1 } },
  },
  [BuildingType.PHOTOSYNTHETIC_CANOPY]: {
    type: BuildingType.PHOTOSYNTHETIC_CANOPY,
    name: 'Canopée Photosynthétique',
    description: 'Déploie une voûte vivante qui convertit la lumière en énergie.',
    baseCost: { [ResourceType.BIOMASS]: 75, [ResourceType.MINERALS]: 30 },
    costFactor: 1.5,
    maxLevel: 50,
    baseEnergyProduction: 30,
    energyFactor: 1.1,
  },
  [BuildingType.STORAGE_VACUOLE]: {
    type: BuildingType.STORAGE_VACUOLE,
    name: 'Vacuole de Stockage',
    description: 'Enfle pour retenir davantage de ressources.',
    baseCost: { [ResourceType.BIOMASS]: 500, [ResourceType.MINERALS]: 250 },
    costFactor: 2,
    maxLevel: 30,
  },
  [BuildingType.RESEARCH_NEXUS]: {
    type: BuildingType.RESEARCH_NEXUS,
    name: 'Noyau de Recherche',
    description: 'Réseau mycélien qui débloque et accélère la recherche.',
    baseCost: {
      [ResourceType.BIOMASS]: 200,
      [ResourceType.MINERALS]: 100,
      [ResourceType.SAP]: 100,
    },
    costFactor: 1.7,
    maxLevel: 30,
  },
  [BuildingType.SYMBIOTIC_CORE]: {
    type: BuildingType.SYMBIOTIC_CORE,
    name: 'Cœur Symbiotique',
    description: 'Cœur battant de la colonie ; accélère toutes les constructions.',
    baseCost: { [ResourceType.BIOMASS]: 400, [ResourceType.MINERALS]: 120 },
    costFactor: 1.5,
    maxLevel: 30,
  },
  [BuildingType.ORBITAL_NURSERY]: {
    type: BuildingType.ORBITAL_NURSERY,
    name: 'Berceau Orbital',
    description: 'Fait éclore les organismes capables de survivre entre les mondes.',
    baseCost: {
      [ResourceType.BIOMASS]: 800,
      [ResourceType.MINERALS]: 500,
      [ResourceType.SAP]: 250,
    },
    costFactor: 1.8,
    maxLevel: 20,
    requires: { research: { [ResearchType.SPORAL_PROPULSION]: 1 } },
  },
};

/** Stabilité écologique : décroissance et régénération. */
export const STABILITY_DECAY_THRESHOLD = 0.7;
export const STABILITY_DECAY_RATE = 2;
export const STABILITY_SPORANGE_REGEN = 0.5;
export const STABILITY_SYMBIOSIS_BONUS = 5;

export interface PlanetTypeConfig {
  type: PlanetType;
  name: string;
  description: string;
  /** Bonus multiplicatif par ressource (1.0 = pas de bonus). */
  productionBonus: Partial<Record<ResourceType, number>>;
  /** Multiplicateur sur le coût de Terraformation (1.0 = normal). */
  terraformCostFactor: number;
}

export const PLANET_TYPES_CONFIG: Record<PlanetType, PlanetTypeConfig> = {
  [PlanetType.VERDANT]: {
    type: PlanetType.VERDANT,
    name: 'Monde Verdoyant',
    description: 'Planète luxuriante gorgée de biomasse primordiale.',
    productionBonus: { [ResourceType.BIOMASS]: 1.25 },
    terraformCostFactor: 1.0,
  },
  [PlanetType.MINERAL]: {
    type: PlanetType.MINERAL,
    name: 'Noyau Minéral',
    description: 'Monde rocheux aux veines cristallines exceptionnelles.',
    productionBonus: { [ResourceType.MINERALS]: 1.3 },
    terraformCostFactor: 0.8,
  },
  [PlanetType.SAP_RICH]: {
    type: PlanetType.SAP_RICH,
    name: 'Marécage de Sève',
    description: 'Planète humide où la sève suinte de chaque pore de la roche.',
    productionBonus: { [ResourceType.SAP]: 1.25 },
    terraformCostFactor: 1.0,
  },
  [PlanetType.SPORE_NEBULA]: {
    type: PlanetType.SPORE_NEBULA,
    name: 'Nébuleuse Sporale',
    description: 'Environnement chargé de spores stellaires, propice à la connaissance.',
    productionBonus: {
      [ResourceType.SPORES]: 1.4,
      [ResourceType.BIOMASS]: 0.9,
      [ResourceType.SAP]: 0.9,
      [ResourceType.MINERALS]: 0.9,
    },
    terraformCostFactor: 1.0,
  },
  [PlanetType.BARREN]: {
    type: PlanetType.BARREN,
    name: 'Monde Désolé',
    description: 'Planète hostile mais dont la désolation cache un potentiel inexploité.',
    productionBonus: {
      [ResourceType.BIOMASS]: 0.85,
      [ResourceType.SAP]: 0.85,
      [ResourceType.MINERALS]: 0.85,
      [ResourceType.SPORES]: 0.85,
    },
    terraformCostFactor: 0.5,
  },
};

export interface GalacticEventConfig {
  type: GalacticEventType;
  name: string;
  description: string;
  durationHours: number;
  effectDescription: string;
}

export const GALACTIC_EVENTS: Record<GalacticEventType, GalacticEventConfig> = {
  [GalacticEventType.SPORE_BLOOM]: {
    type: GalacticEventType.SPORE_BLOOM,
    name: 'Floraison Sporale',
    description: 'Un nuage de spores cosmiques fertilise toute la galaxie.',
    durationHours: 2,
    effectDescription: 'Production × 1.5 pendant 2h',
  },
  [GalacticEventType.STELLAR_STORM]: {
    type: GalacticEventType.STELLAR_STORM,
    name: 'Tempête Stellaire',
    description: "Les vents ioniques perturbent les routes d'expédition.",
    durationHours: 3,
    effectDescription: "Temps d'expédition × 2 pendant 3h",
  },
  [GalacticEventType.ANCIENT_SIGNAL]: {
    type: GalacticEventType.ANCIENT_SIGNAL,
    name: 'Signal Ancien',
    description: 'Un écho du Réseau Mycélial perdu résonne à travers la galaxie.',
    durationHours: 1,
    effectDescription: '+500 Spores pour chaque commandant actif',
  },
  [GalacticEventType.MYCOTOXIN_OUTBREAK]: {
    type: GalacticEventType.MYCOTOXIN_OUTBREAK,
    name: 'Épidémie Mycotoxique',
    description: 'Une neurotoxine fongique ravage les écosystèmes planétaires.',
    durationHours: 1,
    effectDescription: 'Stabilité -20 sur toutes les planètes',
  },
  [GalacticEventType.CONVERGENCE_PULSE]: {
    type: GalacticEventType.CONVERGENCE_PULSE,
    name: 'Pulsion de Convergence',
    description: 'La mémoire collective des Tisserands amplifie les esprits chercheurs.',
    durationHours: 4,
    effectDescription: 'Temps de recherche × 0.7 pendant 4h',
  },
  [GalacticEventType.VOID_RIFT]: {
    type: GalacticEventType.VOID_RIFT,
    name: 'Fissure du Vide',
    description: 'Une déchirure dans le tissu galactique révèle des anomalies cachées.',
    durationHours: 2,
    effectDescription: 'Chance ANOMALY × 3 pendant 2h',
  },
};

export interface AchievementConfig {
  type: AchievementType;
  name: string;
  description: string;
  rewardText: string;
  /** Butin concret crédité au Noyau-Monde lors du déblocage (cappé au stockage). */
  reward: ResourceBundle;
}

export const ACHIEVEMENTS: Record<AchievementType, AchievementConfig> = {
  [AchievementType.FIRST_SPROUT]: {
    type: AchievementType.FIRST_SPROUT,
    name: 'Première Pousse',
    description: 'Améliorer un premier bâtiment.',
    rewardText: "L'éveil commence. Chapitre I débloqué.",
    reward: { [ResourceType.BIOMASS]: 300, [ResourceType.SAP]: 150 },
  },
  [AchievementType.RESEARCH_PIONEER]: {
    type: AchievementType.RESEARCH_PIONEER,
    name: 'Pionnier de la Recherche',
    description: 'Terminer une première recherche.',
    rewardText: 'Les souvenirs des Tisserands refluent.',
    reward: { [ResourceType.SPORES]: 100, [ResourceType.SAP]: 200 },
  },
  [AchievementType.COSMIC_TRAVELER]: {
    type: AchievementType.COSMIC_TRAVELER,
    name: 'Voyageur Cosmique',
    description: 'Lancer une première expédition.',
    rewardText: 'Le Réseau Mycélial attend.',
    reward: { [ResourceType.SPORES]: 150, [ResourceType.BIOMASS]: 300 },
  },
  [AchievementType.COLONIAL_FUNGUS]: {
    type: AchievementType.COLONIAL_FUNGUS,
    name: 'Fonge Coloniale',
    description: 'Fonder une première colonie.',
    rewardText: "L'essaimage reprend. Chapitre II débloqué.",
    reward: { [ResourceType.BIOMASS]: 1_000, [ResourceType.SAP]: 500, [ResourceType.SPORES]: 200 },
  },
  [AchievementType.FLEET_COMMANDER]: {
    type: AchievementType.FLEET_COMMANDER,
    name: 'Commandant de Flotte',
    description: 'Posséder 10 vaisseaux au total.',
    rewardText: 'La flotte prend vie.',
    reward: { [ResourceType.MINERALS]: 800, [ResourceType.BIOMASS]: 800 },
  },
  [AchievementType.SPORE_MASTER]: {
    type: AchievementType.SPORE_MASTER,
    name: 'Maître des Spores',
    description: 'Atteindre Sporanges niveau 5.',
    rewardText: 'Les spores obéissent à votre volonté.',
    reward: { [ResourceType.SPORES]: 500, [ResourceType.BIOMASS]: 1_000 },
  },
  [AchievementType.ANCIENT_DISCOVERY]: {
    type: AchievementType.ANCIENT_DISCOVERY,
    name: 'Découverte Ancienne',
    description: "Obtenir le résultat ANOMALIE lors d'une expédition.",
    rewardText: 'Un artefact des Tisserands trouvé. Chapitre III débloqué.',
    reward: { [ResourceType.SPORES]: 800, [ResourceType.MINERALS]: 500 },
  },
  [AchievementType.GALACTIC_HIVE]: {
    type: AchievementType.GALACTIC_HIVE,
    name: 'Ruche Galactique',
    description: 'Posséder 5 colonies.',
    rewardText: "L'empire organique prend forme.",
    reward: {
      [ResourceType.BIOMASS]: 3_000,
      [ResourceType.SAP]: 2_000,
      [ResourceType.SPORES]: 500,
    },
  },
  [AchievementType.MASTER_BUILDER]: {
    type: AchievementType.MASTER_BUILDER,
    name: 'Grand Architecte',
    description: 'Atteindre 50 niveaux de bâtiments au total.',
    rewardText: 'La mémoire architecturale est restaurée.',
    reward: { [ResourceType.BIOMASS]: 5_000, [ResourceType.MINERALS]: 3_000 },
  },
  [AchievementType.SCHOLAR]: {
    type: AchievementType.SCHOLAR,
    name: 'Érudit',
    description: `Débloquer les ${RESEARCH_TYPES.length} types de recherche (≥ niveau 1).`,
    rewardText: 'Toutes les branches du savoir sont explorées.',
    reward: { [ResourceType.SPORES]: 2_000, [ResourceType.SAP]: 2_000 },
  },
  [AchievementType.TITAN_BREEDER]: {
    type: AchievementType.TITAN_BREEDER,
    name: 'Éleveur de Titans',
    description: 'Posséder un Titan Sporogenèse.',
    rewardText: 'Le plus grand organisme interstellaire est né.',
    reward: { [ResourceType.SPORES]: 1_500, [ResourceType.MINERALS]: 2_000 },
  },
  [AchievementType.HUNDRED_SHIPS]: {
    type: AchievementType.HUNDRED_SHIPS,
    name: 'Centurion Stellaire',
    description: 'Posséder 100 vaisseaux au total.',
    rewardText: 'La flotte est une force de nature.',
    reward: {
      [ResourceType.BIOMASS]: 8_000,
      [ResourceType.MINERALS]: 5_000,
      [ResourceType.SPORES]: 1_000,
    },
  },
  [AchievementType.CONVERGENCE_HERALD]: {
    type: AchievementType.CONVERGENCE_HERALD,
    name: 'Héraut de la Convergence',
    description: '3 artefacts arborisiens récupérés.',
    rewardText: 'La Convergence se rapproche. Vitesse de recherche +15%.',
    reward: { [ResourceType.SPORES]: 3_000 },
  },
  [AchievementType.EVENT_SURVIVOR]: {
    type: AchievementType.EVENT_SURVIVOR,
    name: 'Survivant',
    description: 'Traverser une Épidémie Mycotoxique.',
    rewardText: 'Ce qui ne tue pas rend plus fort.',
    reward: { [ResourceType.BIOMASS]: 1_500, [ResourceType.SAP]: 1_000 },
  },
  [AchievementType.DEEP_SPACE]: {
    type: AchievementType.DEEP_SPACE,
    name: 'Explorateur des Profondeurs',
    description: 'Lancer une expédition à distance ≥ 20.',
    rewardText: 'Les confins de la galaxie vous appellent.',
    reward: { [ResourceType.SPORES]: 1_000, [ResourceType.MINERALS]: 1_000 },
  },
  [AchievementType.RESOURCE_BARON]: {
    type: AchievementType.RESOURCE_BARON,
    name: 'Baron des Ressources',
    description: 'Stocker 100 000 Biomasse.',
    rewardText: "L'abondance organique est maîtrisée.",
    reward: { [ResourceType.SPORES]: 2_000, [ResourceType.MINERALS]: 3_000 },
  },
  [AchievementType.SPEED_BUILDER]: {
    type: AchievementType.SPEED_BUILDER,
    name: 'Bâtisseur Éclair',
    description: 'Construire un bâtiment en moins de 10 secondes.',
    rewardText: "Le temps n'a plus de prise sur vous.",
    reward: { [ResourceType.BIOMASS]: 1_000, [ResourceType.MINERALS]: 500 },
  },
  [AchievementType.PEACEFUL_EXPLORER]: {
    type: AchievementType.PEACEFUL_EXPLORER,
    name: 'Explorateur Pacifique',
    description: '50 expéditions sans incident.',
    rewardText: 'La chance sourit aux prudents.',
    reward: { [ResourceType.SPORES]: 2_500, [ResourceType.BIOMASS]: 3_000 },
  },
  [AchievementType.SPORAL_SAGE]: {
    type: AchievementType.SPORAL_SAGE,
    name: 'Sage Sporique',
    description: 'Atteindre Propulsion Sporale niveau 10.',
    rewardText: "Le cosmos entier s'ouvre à votre essaimage.",
    reward: { [ResourceType.SPORES]: 5_000, [ResourceType.SAP]: 5_000 },
  },
  [AchievementType.THE_CONVERGENCE]: {
    type: AchievementType.THE_CONVERGENCE,
    name: 'La Convergence',
    description: 'Posséder 10 colonies actives.',
    rewardText: "Vous avez reconstitué l'empire des Tisserands. Titre : Tisserand Ressuscité.",
    reward: {
      [ResourceType.SPORES]: 10_000,
      [ResourceType.BIOMASS]: 10_000,
      [ResourceType.MINERALS]: 8_000,
    },
  },
};

export interface ExpeditionOutcomeConfig {
  outcome: ExpeditionOutcome;
  minRoll: number;
  maxRoll: number;
}

export const EXPEDITION_OUTCOME_TABLE: ExpeditionOutcomeConfig[] = [
  { outcome: ExpeditionOutcome.RESOURCE_CACHE, minRoll: 0, maxRoll: 4999 },
  { outcome: ExpeditionOutcome.RARE_SPORES, minRoll: 5000, maxRoll: 6499 },
  { outcome: ExpeditionOutcome.DERELICT_SHIP, minRoll: 6500, maxRoll: 7499 },
  { outcome: ExpeditionOutcome.INCIDENT, minRoll: 7500, maxRoll: 8499 },
  { outcome: ExpeditionOutcome.ANOMALY, minRoll: 8500, maxRoll: 9099 },
  { outcome: ExpeditionOutcome.ANCIENT_ARCHIVE, minRoll: 9100, maxRoll: 9499 },
  { outcome: ExpeditionOutcome.VOID_ECHO, minRoll: 9500, maxRoll: 9799 },
  { outcome: ExpeditionOutcome.CONVERGENCE_BLOOM, minRoll: 9800, maxRoll: 9999 },
];

export const SHIPS: Record<ShipType, ShipConfig> = {
  // ── Civils / support ──
  [ShipType.SPORAL_SCOUT]: {
    type: ShipType.SPORAL_SCOUT,
    name: 'Éclaireur sporique',
    description: 'Organisme rapide dont les filaments sondent les anomalies galactiques.',
    role: ShipRole.SUPPORT,
    cost: {
      [ResourceType.BIOMASS]: 250,
      [ResourceType.MINERALS]: 150,
      [ResourceType.SPORES]: 25,
    },
    baseTimeSeconds: 180,
    cargo: 100,
    speed: 10,
    requiresNurseryLevel: 1,
    attack: 5,
    defense: 5,
    hull: 50,
  },
  [ShipType.SYMBIOTIC_HARVESTER]: {
    type: ShipType.SYMBIOTIC_HARVESTER,
    name: 'Moissonneur symbiotique',
    description: 'Large organisme de collecte conçu pour ramener les découvertes.',
    role: ShipRole.TRANSPORT,
    cost: {
      [ResourceType.BIOMASS]: 600,
      [ResourceType.MINERALS]: 300,
      [ResourceType.SAP]: 200,
      [ResourceType.SPORES]: 50,
    },
    baseTimeSeconds: 360,
    cargo: 1_000,
    speed: 6,
    requiresNurseryLevel: 2,
    attack: 2,
    defense: 10,
    hull: 150,
  },
  [ShipType.MYCELIAL_TENDRIL]: {
    type: ShipType.MYCELIAL_TENDRIL,
    name: 'Filament Mycélial',
    description: 'Filament ultra-rapide qui sonde les anomalies à la vitesse du spore.',
    role: ShipRole.ESPIONAGE,
    cost: {
      [ResourceType.BIOMASS]: 150,
      [ResourceType.MINERALS]: 80,
      [ResourceType.SPORES]: 15,
    },
    baseTimeSeconds: 120,
    cargo: 50,
    speed: 20,
    requiresNurseryLevel: 1,
    attack: 1,
    defense: 2,
    hull: 25,
  },
  [ShipType.CHITIN_FREIGHTER]: {
    type: ShipType.CHITIN_FREIGHTER,
    name: 'Frégat de Chitine',
    description: 'Mastodonte de transport blindé par une carapace chitineuse.',
    role: ShipRole.TRANSPORT,
    cost: {
      [ResourceType.BIOMASS]: 1_200,
      [ResourceType.MINERALS]: 800,
      [ResourceType.SAP]: 400,
      [ResourceType.SPORES]: 80,
    },
    baseTimeSeconds: 720,
    cargo: 3_000,
    speed: 4,
    requiresNurseryLevel: 3,
    attack: 4,
    defense: 20,
    hull: 300,
  },
  [ShipType.BIOLUMINESCENT_CRUISER]: {
    type: ShipType.BIOLUMINESCENT_CRUISER,
    name: 'Croiseur Bioluminescent',
    description: 'Organisme intermédiaire aux filaments phosphorescents, polyvalent et redoutable.',
    role: ShipRole.COMBAT,
    cost: {
      [ResourceType.BIOMASS]: 900,
      [ResourceType.MINERALS]: 500,
      [ResourceType.SAP]: 300,
      [ResourceType.SPORES]: 100,
    },
    baseTimeSeconds: 540,
    cargo: 500,
    speed: 8,
    requiresNurseryLevel: 4,
    attack: 35,
    defense: 25,
    hull: 400,
  },
  [ShipType.SPOROGENESIS_TITAN]: {
    type: ShipType.SPOROGENESIS_TITAN,
    name: 'Titan Sporogenèse',
    description:
      'Léviathan organique capable de transporter une civilisation entière entre les étoiles.',
    role: ShipRole.COMBAT,
    cost: {
      [ResourceType.BIOMASS]: 5_000,
      [ResourceType.MINERALS]: 3_000,
      [ResourceType.SAP]: 2_000,
      [ResourceType.SPORES]: 500,
    },
    baseTimeSeconds: 2_400,
    cargo: 8_000,
    speed: 2,
    requiresNurseryLevel: 6,
    attack: 100,
    defense: 80,
    hull: 1_500,
  },

  // ── Militaires ──
  [ShipType.SPORAL_DRONE]: {
    type: ShipType.SPORAL_DRONE,
    name: 'Drone sporique',
    description: 'Petit organisme de combat formant des nuées dissuasives, rapide mais fragile.',
    role: ShipRole.COMBAT,
    cost: {
      [ResourceType.BIOMASS]: 120,
      [ResourceType.MINERALS]: 60,
      [ResourceType.SPORES]: 20,
    },
    baseTimeSeconds: 90,
    cargo: 0,
    speed: 18,
    requiresNurseryLevel: 2,
    attack: 12,
    defense: 3,
    hull: 30,
  },
  [ShipType.ACID_BOMBER]: {
    type: ShipType.ACID_BOMBER,
    name: "Bombardier d'acide",
    description: "Vaisseau d'assaut qui projette des enzymes corrosifs sur les défenses.",
    role: ShipRole.COMBAT,
    cost: {
      [ResourceType.BIOMASS]: 800,
      [ResourceType.MINERALS]: 400,
      [ResourceType.SAP]: 300,
      [ResourceType.SPORES]: 120,
    },
    baseTimeSeconds: 600,
    cargo: 100,
    speed: 7,
    requiresNurseryLevel: 4,
    attack: 70,
    defense: 15,
    hull: 250,
  },
  [ShipType.CHITIN_DESTROYER]: {
    type: ShipType.CHITIN_DESTROYER,
    name: 'Destroyer de chitine',
    description: 'Navire de ligne lourd, conçu pour briser les formations ennemies.',
    role: ShipRole.COMBAT,
    cost: {
      [ResourceType.BIOMASS]: 2_000,
      [ResourceType.MINERALS]: 1_200,
      [ResourceType.SAP]: 600,
      [ResourceType.SPORES]: 250,
    },
    baseTimeSeconds: 1_200,
    cargo: 200,
    speed: 5,
    requiresNurseryLevel: 5,
    attack: 90,
    defense: 70,
    hull: 800,
  },
  [ShipType.BIOMASS_DREADNOUGHT]: {
    type: ShipType.BIOMASS_DREADNOUGHT,
    name: 'Dreadnought de biomasse',
    description: 'Colosse de guerre organique capable de sièger des mondes entiers.',
    role: ShipRole.COMBAT,
    cost: {
      [ResourceType.BIOMASS]: 8_000,
      [ResourceType.MINERALS]: 5_000,
      [ResourceType.SAP]: 3_000,
      [ResourceType.SPORES]: 1_000,
    },
    baseTimeSeconds: 4_800,
    cargo: 500,
    speed: 2,
    requiresNurseryLevel: 8,
    attack: 250,
    defense: 200,
    hull: 3_000,
  },

  // ── Spécialisés ──
  [ShipType.SEED_POD]: {
    type: ShipType.SEED_POD,
    name: 'Capsule germinale',
    description: 'Vaisseau lent mais très capacieux, utilisé pour le transport massif.',
    role: ShipRole.TRANSPORT,
    cost: {
      [ResourceType.BIOMASS]: 400,
      [ResourceType.MINERALS]: 200,
      [ResourceType.SAP]: 100,
      [ResourceType.SPORES]: 30,
    },
    baseTimeSeconds: 240,
    cargo: 5_000,
    speed: 3,
    requiresNurseryLevel: 2,
    attack: 0,
    defense: 5,
    hull: 100,
  },
  [ShipType.SHADOW_SPORE]: {
    type: ShipType.SHADOW_SPORE,
    name: "Spore de l'ombre",
    description: "Organisme furtif spécialisé dans l'espionnage et la contre-renseignement.",
    role: ShipRole.ESPIONAGE,
    cost: {
      [ResourceType.BIOMASS]: 300,
      [ResourceType.MINERALS]: 150,
      [ResourceType.SPORES]: 100,
    },
    baseTimeSeconds: 300,
    cargo: 10,
    speed: 25,
    requiresNurseryLevel: 3,
    attack: 2,
    defense: 8,
    hull: 40,
  },
  [ShipType.ORBITAL_THORN]: {
    type: ShipType.ORBITAL_THORN,
    name: 'Épine orbitale',
    description: 'Plateforme défensive stationnaire protégeant les approches planétaires.',
    role: ShipRole.DEFENSE,
    cost: {
      [ResourceType.BIOMASS]: 1_000,
      [ResourceType.MINERALS]: 800,
      [ResourceType.SAP]: 200,
      [ResourceType.SPORES]: 150,
    },
    baseTimeSeconds: 900,
    cargo: 0,
    speed: 0,
    requiresNurseryLevel: 4,
    attack: 60,
    defense: 120,
    hull: 600,
  },

  // ── Raciaux exclusifs ──
  [ShipType.SPORAL_SWARM]: {
    type: ShipType.SPORAL_SWARM,
    name: 'Essaim sporique',
    description: "Nuée d'organismes mycéliens qui submergent l'ennemi. Exclusive aux Mycéliens.",
    role: ShipRole.COMBAT,
    restrictedToRaces: [RaceType.MYCELIANS],
    cost: {
      [ResourceType.BIOMASS]: 200,
      [ResourceType.MINERALS]: 100,
      [ResourceType.SPORES]: 40,
    },
    baseTimeSeconds: 120,
    cargo: 0,
    speed: 16,
    requiresNurseryLevel: 2,
    attack: 18,
    defense: 4,
    hull: 35,
    racialBonusFactor: 1.1,
  },
  [ShipType.LUMINOUS_WARDEN]: {
    type: ShipType.LUMINOUS_WARDEN,
    name: 'Gardien lumineux',
    description:
      'Vaisseau-photocyte qui soigne et renforce les alliés. Exclusive aux Photosynthex.',
    role: ShipRole.SUPPORT,
    restrictedToRaces: [RaceType.PHOTOSYNTHEX],
    cost: {
      [ResourceType.BIOMASS]: 500,
      [ResourceType.MINERALS]: 200,
      [ResourceType.SAP]: 400,
      [ResourceType.SPORES]: 80,
    },
    baseTimeSeconds: 420,
    cargo: 200,
    speed: 9,
    requiresNurseryLevel: 3,
    attack: 10,
    defense: 35,
    hull: 300,
    racialBonusFactor: 1.1,
  },
  [ShipType.CHITIN_BULWARK]: {
    type: ShipType.CHITIN_BULWARK,
    name: 'Rempart de chitine',
    description:
      "Mur vivant blindé capable d'encaisser des salves entières. Exclusive aux Chitinids.",
    role: ShipRole.DEFENSE,
    restrictedToRaces: [RaceType.CHITINIDS],
    cost: {
      [ResourceType.BIOMASS]: 1_500,
      [ResourceType.MINERALS]: 1_000,
      [ResourceType.SAP]: 300,
      [ResourceType.SPORES]: 120,
    },
    baseTimeSeconds: 1_000,
    cargo: 100,
    speed: 3,
    requiresNurseryLevel: 4,
    attack: 30,
    defense: 150,
    hull: 1_000,
    racialBonusFactor: 1.15,
  },

  // ── Recycleur de débris ──
  [ShipType.BIO_RECYCLER]: {
    type: ShipType.BIO_RECYCLER,
    name: 'Bio-recycleur',
    description:
      "Organisme-éponge capable d'aspirer les débris de bataille flottant dans l'espace.",
    role: ShipRole.TRANSPORT,
    cost: {
      [ResourceType.BIOMASS]: 500,
      [ResourceType.MINERALS]: 600,
      [ResourceType.SAP]: 200,
      [ResourceType.SPORES]: 60,
    },
    baseTimeSeconds: 480,
    cargo: 4_000,
    speed: 6,
    requiresNurseryLevel: 3,
    attack: 1,
    defense: 8,
    hull: 120,
    requires: { research: { [ResearchType.BIOENGINEERING]: 2 } },
  },
};

export const RESEARCHES: Record<ResearchType, ResearchConfig> = {
  [ResearchType.ADVANCED_PHOTOSYNTHESIS]: {
    type: ResearchType.ADVANCED_PHOTOSYNTHESIS,
    name: 'Photosynthèse avancée',
    description: "+5% de production d'énergie par niveau.",
    baseCost: { [ResourceType.SPORES]: 200, [ResourceType.SAP]: 400 },
    costFactor: 1.75,
    maxLevel: 20,
    baseTimeSeconds: 600,
    timeFactor: 1.6,
  },
  [ResearchType.GENETIC_ENGINEERING]: {
    type: ResearchType.GENETIC_ENGINEERING,
    name: 'Génie génétique',
    description: '+5% de production de ressources par niveau.',
    baseCost: { [ResourceType.SPORES]: 300, [ResourceType.BIOMASS]: 600 },
    costFactor: 1.8,
    maxLevel: 20,
    baseTimeSeconds: 900,
    timeFactor: 1.6,
    requires: { buildings: { [BuildingType.RESEARCH_NEXUS]: 1 } },
  },
  [ResearchType.SYMBIOSIS]: {
    type: ResearchType.SYMBIOSIS,
    name: 'Symbiose',
    description: 'Améliore la stabilité écologique maximale.',
    baseCost: { [ResourceType.SPORES]: 250, [ResourceType.SAP]: 500 },
    costFactor: 1.7,
    maxLevel: 10,
    baseTimeSeconds: 1_200,
    timeFactor: 1.7,
    requires: { buildings: { [BuildingType.RESEARCH_NEXUS]: 1 } },
  },
  [ResearchType.TERRAFORMATION]: {
    type: ResearchType.TERRAFORMATION,
    name: 'Terraformation',
    description: `+${FIELDS_PER_TERRAFORMATION} emplacements planétaires par niveau.`,
    baseCost: { [ResourceType.SPORES]: 500, [ResourceType.MINERALS]: 1_000 },
    costFactor: 1.9,
    maxLevel: 15,
    baseTimeSeconds: 1_800,
    timeFactor: 1.7,
    requires: { buildings: { [BuildingType.RESEARCH_NEXUS]: 2 } },
  },
  [ResearchType.BIOENGINEERING]: {
    type: ResearchType.BIOENGINEERING,
    name: 'Bio-ingénierie',
    description: 'Débloque les structures organiques avancées.',
    baseCost: {
      [ResourceType.SPORES]: 150,
      [ResourceType.BIOMASS]: 400,
      [ResourceType.MINERALS]: 200,
    },
    costFactor: 1.7,
    maxLevel: 12,
    baseTimeSeconds: 480,
    timeFactor: 1.6,
    requires: { buildings: { [BuildingType.RESEARCH_NEXUS]: 1 } },
  },
  [ResearchType.SPORAL_PROPULSION]: {
    type: ResearchType.SPORAL_PROPULSION,
    name: 'Propulsion sporale',
    description: "Permet l'essaimage vers de nouveaux mondes (+1 colonie/niveau).",
    baseCost: {
      [ResourceType.SPORES]: 800,
      [ResourceType.SAP]: 1_000,
      [ResourceType.MINERALS]: 500,
    },
    costFactor: 2,
    maxLevel: 10,
    baseTimeSeconds: 2_400,
    timeFactor: 1.8,
    requires: { research: { [ResearchType.BIOENGINEERING]: 2 } },
  },

  // ── Économie avancée ──
  [ResearchType.NUTRIENT_CYCLING]: {
    type: ResearchType.NUTRIENT_CYCLING,
    name: 'Cycle des nutriments',
    description: '+5% de production de biomasse par niveau.',
    baseCost: { [ResourceType.SPORES]: 400, [ResourceType.BIOMASS]: 800 },
    costFactor: 1.75,
    maxLevel: 15,
    baseTimeSeconds: 900,
    timeFactor: 1.6,
    requires: { research: { [ResearchType.GENETIC_ENGINEERING]: 3 } },
  },
  [ResearchType.SUBTERRANEAN_ROOTS]: {
    type: ResearchType.SUBTERRANEAN_ROOTS,
    name: 'Racines souterraines',
    description: '+5% de production de sève par niveau.',
    baseCost: { [ResourceType.SPORES]: 400, [ResourceType.SAP]: 600 },
    costFactor: 1.75,
    maxLevel: 15,
    baseTimeSeconds: 900,
    timeFactor: 1.6,
    requires: { research: { [ResearchType.GENETIC_ENGINEERING]: 3 } },
  },
  [ResearchType.SPORAL_ECONOMY]: {
    type: ResearchType.SPORAL_ECONOMY,
    name: 'Économie sporale',
    description: '+5% de production de spores par niveau.',
    baseCost: { [ResourceType.SPORES]: 600, [ResourceType.BIOMASS]: 1_000 },
    costFactor: 1.85,
    maxLevel: 12,
    baseTimeSeconds: 1_200,
    timeFactor: 1.7,
    requires: { research: { [ResearchType.GENETIC_ENGINEERING]: 5 } },
  },

  // ── Militaire ──
  [ResearchType.CHITIN_ARMOR]: {
    type: ResearchType.CHITIN_ARMOR,
    name: 'Armure de chitine',
    description: '+5% de défense des vaisseaux par niveau.',
    baseCost: { [ResourceType.SPORES]: 500, [ResourceType.MINERALS]: 1_200 },
    costFactor: 1.8,
    maxLevel: 15,
    baseTimeSeconds: 1_200,
    timeFactor: 1.7,
    requires: { research: { [ResearchType.BIOENGINEERING]: 3 } },
  },
  [ResearchType.BIOLOGICAL_WARFARE]: {
    type: ResearchType.BIOLOGICAL_WARFARE,
    name: 'Guerre biologique',
    description: "+5% d'attaque des vaisseaux par niveau.",
    baseCost: { [ResourceType.SPORES]: 600, [ResourceType.BIOMASS]: 1_000 },
    costFactor: 1.8,
    maxLevel: 15,
    baseTimeSeconds: 1_200,
    timeFactor: 1.7,
    requires: { research: { [ResearchType.BIOENGINEERING]: 3 } },
  },
  [ResearchType.SWARM_TACTICS]: {
    type: ResearchType.SWARM_TACTICS,
    name: "Tactiques d'essaim",
    description: '+5% de vitesse des vaisseaux légers par niveau.',
    baseCost: { [ResourceType.SPORES]: 700, [ResourceType.SAP]: 800 },
    costFactor: 1.75,
    maxLevel: 10,
    baseTimeSeconds: 1_500,
    timeFactor: 1.7,
    requires: { research: { [ResearchType.CHITIN_ARMOR]: 2 } },
  },
  [ResearchType.ORBITAL_DEFENSE_GRID]: {
    type: ResearchType.ORBITAL_DEFENSE_GRID,
    name: 'Grille défensive orbitale',
    description: '+5% de défense orbitaire par niveau.',
    baseCost: { [ResourceType.SPORES]: 800, [ResourceType.MINERALS]: 1_500 },
    costFactor: 1.9,
    maxLevel: 12,
    baseTimeSeconds: 1_800,
    timeFactor: 1.7,
    requires: { research: { [ResearchType.CHITIN_ARMOR]: 2 } },
  },

  // ── Propulsion & renseignement ──
  [ResearchType.HYPERSPORE_DRIVE]: {
    type: ResearchType.HYPERSPORE_DRIVE,
    name: 'Moteur hyperspore',
    description: '+5% de vitesse de flotte par niveau.',
    baseCost: { [ResourceType.SPORES]: 1_000, [ResourceType.SAP]: 1_200 },
    costFactor: 1.9,
    maxLevel: 10,
    baseTimeSeconds: 2_000,
    timeFactor: 1.8,
    requires: { research: { [ResearchType.SPORAL_PROPULSION]: 3 } },
  },
  [ResearchType.WORMHOLE_MYCOLOGY]: {
    type: ResearchType.WORMHOLE_MYCOLOGY,
    name: 'Mycologie des vers',
    description: '-10% de temps de trajet intergalactique par niveau.',
    baseCost: { [ResourceType.SPORES]: 1_500, [ResourceType.MINERALS]: 2_000 },
    costFactor: 2,
    maxLevel: 5,
    baseTimeSeconds: 3_600,
    timeFactor: 1.8,
    requires: { research: { [ResearchType.HYPERSPORE_DRIVE]: 3 } },
  },
  [ResearchType.SPORE_SENSE]: {
    type: ResearchType.SPORE_SENSE,
    name: 'Sens sporal',
    description: "+5% de chance d'espionnage par niveau.",
    baseCost: { [ResourceType.SPORES]: 600, [ResourceType.SAP]: 400 },
    costFactor: 1.7,
    maxLevel: 10,
    baseTimeSeconds: 1_000,
    timeFactor: 1.6,
    requires: { research: { [ResearchType.BIOENGINEERING]: 2 } },
  },
  [ResearchType.DEEP_SCAN]: {
    type: ResearchType.DEEP_SCAN,
    name: 'Scan profond',
    description: "Améliore la qualité des rapports d'espionnage.",
    baseCost: { [ResourceType.SPORES]: 800, [ResourceType.MINERALS]: 600 },
    costFactor: 1.8,
    maxLevel: 8,
    baseTimeSeconds: 1_200,
    timeFactor: 1.7,
    requires: { research: { [ResearchType.SPORE_SENSE]: 3 } },
  },
};

// ──────────────────────────── Encounters NPC ─────────────────────────────────

export interface NpcEncounterConfig {
  name: string;
  description: string;
  minDifficulty: number;
  maxDifficulty: number;
  baseHealth: number;
  rewardMultiplier: number;
  expiryHours: number;
  color: string;
  tier: 'easy' | 'medium' | 'hard' | 'elite';
}

export const NPC_BATTLE_TACTICS = [
  'AMBUSH',
  'SWARM_PRESSURE',
  'SIEGE_BREAKER',
  'SUPPORT_DISRUPTION',
  'FORTIFY',
  'FEIGNED_RETREAT',
  'LAST_STAND',
] as const;

export type NpcBattleTactic = (typeof NPC_BATTLE_TACTICS)[number];

export interface NpcBehaviorConfig {
  aggression: number;
  adaptability: number;
  resilience: number;
  preferredTargetRoles: ShipRole[];
  openingTactic: NpcBattleTactic;
  woundedTactic: NpcBattleTactic;
}

export interface NpcBattlePlan {
  tactic: NpcBattleTactic;
  focusRole: ShipRole;
  powerMultiplier: number;
  lossMultiplier: number;
  rewardMultiplier: number;
  damageMultiplier: number;
  confidence: number;
  rationale: string;
}

export const NPC_ENCOUNTER_CONFIGS: Record<NpcEncounterType, NpcEncounterConfig> = {
  [NpcEncounterType.SPORAL_PARASITE]: {
    name: 'Parasite Sporal',
    description: 'Un parasite fongique de faible envergure qui infeste les routes commerciales.',
    minDifficulty: 1,
    maxDifficulty: 2,
    baseHealth: 40,
    rewardMultiplier: 0.7,
    expiryHours: 3,
    color: '#84cc16',
    tier: 'easy',
  },
  [NpcEncounterType.BIOMASS_CORRUPTED]: {
    name: 'Biomasse Corrompue',
    description: 'Amas de matière organique corrompue par le Vide.',
    minDifficulty: 1,
    maxDifficulty: 3,
    baseHealth: 50,
    rewardMultiplier: 0.8,
    expiryHours: 3,
    color: '#a3e635',
    tier: 'easy',
  },
  [NpcEncounterType.MYCOXIN_NEST]: {
    name: 'Nid de Mycoxine',
    description: "Une colonie de champignons toxiques qui empoisonne l'espace local.",
    minDifficulty: 2,
    maxDifficulty: 4,
    baseHealth: 60,
    rewardMultiplier: 1.0,
    expiryHours: 4,
    color: '#22c55e',
    tier: 'easy',
  },
  [NpcEncounterType.VOID_RIFT]: {
    name: 'Fissure du Vide',
    description: 'Une déchirure dans le tissu galactique. En émerge quelque chose de sombre.',
    minDifficulty: 3,
    maxDifficulty: 5,
    baseHealth: 80,
    rewardMultiplier: 1.1,
    expiryHours: 2,
    color: '#8b5cf6',
    tier: 'medium',
  },
  [NpcEncounterType.FUNGAL_HIVEMIND]: {
    name: 'Essaim Fongique',
    description: 'Une intelligence collective mycéliale hostile à toute civilisation organique.',
    minDifficulty: 3,
    maxDifficulty: 6,
    baseHealth: 90,
    rewardMultiplier: 1.2,
    expiryHours: 4,
    color: '#10b981',
    tier: 'medium',
  },
  [NpcEncounterType.CRYSTALLINE_GUARDIAN]: {
    name: 'Gardien Cristallin',
    description: 'Entité minérale ancienne protégeant un gisement de ressources rares.',
    minDifficulty: 4,
    maxDifficulty: 6,
    baseHealth: 100,
    rewardMultiplier: 1.3,
    expiryHours: 5,
    color: '#06b6d4',
    tier: 'medium',
  },
  [NpcEncounterType.MYCOSPORE_SWARM]: {
    name: 'Nuée Mycosporale',
    description: 'Des milliards de spores mortelles organisées en essaim prédateur.',
    minDifficulty: 3,
    maxDifficulty: 6,
    baseHealth: 70,
    rewardMultiplier: 1.0,
    expiryHours: 3,
    color: '#f59e0b',
    tier: 'medium',
  },
  [NpcEncounterType.CHITIN_WARLORD]: {
    name: 'Seigneur de Chitine',
    description: 'Un colosse chitineux évolué qui étend son territoire.',
    minDifficulty: 5,
    maxDifficulty: 8,
    baseHealth: 120,
    rewardMultiplier: 1.5,
    expiryHours: 6,
    color: '#f97316',
    tier: 'hard',
  },
  [NpcEncounterType.ABANDONED_DERELICT]: {
    name: 'Épave Abandonnée',
    description: 'Vaisseau-monde défunt, réanimé par une IA corrompue.',
    minDifficulty: 5,
    maxDifficulty: 8,
    baseHealth: 130,
    rewardMultiplier: 1.6,
    expiryHours: 6,
    color: '#ef4444',
    tier: 'hard',
  },
  [NpcEncounterType.VOID_LEVIATHAN]: {
    name: 'Léviathan du Vide',
    description: "Titan organique d'une dimension inconnue. Évitez si possible.",
    minDifficulty: 6,
    maxDifficulty: 9,
    baseHealth: 150,
    rewardMultiplier: 1.8,
    expiryHours: 8,
    color: '#dc2626',
    tier: 'hard',
  },
  [NpcEncounterType.ANCIENT_SENTINEL]: {
    name: 'Sentinelle Ancienne',
    description:
      'Gardien ultime de la Convergence. Seules les armadas les plus puissantes survivent.',
    minDifficulty: 8,
    maxDifficulty: 10,
    baseHealth: 200,
    rewardMultiplier: 2.5,
    expiryHours: 12,
    color: '#7c3aed',
    tier: 'elite',
  },
};

export const NPC_BEHAVIOR_CONFIGS: Record<NpcEncounterType, NpcBehaviorConfig> = {
  [NpcEncounterType.SPORAL_PARASITE]: {
    aggression: 0.65,
    adaptability: 0.8,
    resilience: 0.35,
    preferredTargetRoles: [ShipRole.TRANSPORT, ShipRole.SUPPORT, ShipRole.ESPIONAGE],
    openingTactic: 'AMBUSH',
    woundedTactic: 'FEIGNED_RETREAT',
  },
  [NpcEncounterType.BIOMASS_CORRUPTED]: {
    aggression: 0.75,
    adaptability: 0.45,
    resilience: 0.7,
    preferredTargetRoles: [ShipRole.COMBAT, ShipRole.TRANSPORT],
    openingTactic: 'SWARM_PRESSURE',
    woundedTactic: 'LAST_STAND',
  },
  [NpcEncounterType.MYCOXIN_NEST]: {
    aggression: 0.7,
    adaptability: 0.65,
    resilience: 0.75,
    preferredTargetRoles: [ShipRole.SUPPORT, ShipRole.COMBAT],
    openingTactic: 'SUPPORT_DISRUPTION',
    woundedTactic: 'FORTIFY',
  },
  [NpcEncounterType.VOID_RIFT]: {
    aggression: 0.9,
    adaptability: 0.85,
    resilience: 0.55,
    preferredTargetRoles: [ShipRole.ESPIONAGE, ShipRole.SUPPORT, ShipRole.COMBAT],
    openingTactic: 'AMBUSH',
    woundedTactic: 'FEIGNED_RETREAT',
  },
  [NpcEncounterType.FUNGAL_HIVEMIND]: {
    aggression: 0.8,
    adaptability: 0.95,
    resilience: 0.8,
    preferredTargetRoles: [ShipRole.SUPPORT, ShipRole.DEFENSE, ShipRole.COMBAT],
    openingTactic: 'SUPPORT_DISRUPTION',
    woundedTactic: 'SWARM_PRESSURE',
  },
  [NpcEncounterType.CRYSTALLINE_GUARDIAN]: {
    aggression: 0.45,
    adaptability: 0.55,
    resilience: 0.95,
    preferredTargetRoles: [ShipRole.COMBAT, ShipRole.DEFENSE],
    openingTactic: 'FORTIFY',
    woundedTactic: 'SIEGE_BREAKER',
  },
  [NpcEncounterType.MYCOSPORE_SWARM]: {
    aggression: 0.95,
    adaptability: 0.75,
    resilience: 0.45,
    preferredTargetRoles: [ShipRole.ESPIONAGE, ShipRole.TRANSPORT, ShipRole.SUPPORT],
    openingTactic: 'SWARM_PRESSURE',
    woundedTactic: 'AMBUSH',
  },
  [NpcEncounterType.CHITIN_WARLORD]: {
    aggression: 0.85,
    adaptability: 0.7,
    resilience: 0.9,
    preferredTargetRoles: [ShipRole.DEFENSE, ShipRole.COMBAT],
    openingTactic: 'SIEGE_BREAKER',
    woundedTactic: 'LAST_STAND',
  },
  [NpcEncounterType.ABANDONED_DERELICT]: {
    aggression: 0.6,
    adaptability: 0.9,
    resilience: 0.8,
    preferredTargetRoles: [ShipRole.SUPPORT, ShipRole.ESPIONAGE, ShipRole.TRANSPORT],
    openingTactic: 'SUPPORT_DISRUPTION',
    woundedTactic: 'FEIGNED_RETREAT',
  },
  [NpcEncounterType.VOID_LEVIATHAN]: {
    aggression: 1,
    adaptability: 0.75,
    resilience: 0.95,
    preferredTargetRoles: [ShipRole.COMBAT, ShipRole.DEFENSE, ShipRole.SUPPORT],
    openingTactic: 'SIEGE_BREAKER',
    woundedTactic: 'LAST_STAND',
  },
  [NpcEncounterType.ANCIENT_SENTINEL]: {
    aggression: 0.7,
    adaptability: 1,
    resilience: 1,
    preferredTargetRoles: [ShipRole.DEFENSE, ShipRole.SUPPORT, ShipRole.COMBAT],
    openingTactic: 'FORTIFY',
    woundedTactic: 'LAST_STAND',
  },
};

export const NPC_SPAWN_TARGET = 25;
export const NPC_SPAWN_INTERVAL_MS = 5 * 60 * 1_000;
export const NPC_SPAWN_ANCHOR_DRIFT_SYSTEMS = 8;
export const NPC_SPAWN_WEIGHTS: Record<'easy' | 'medium' | 'hard' | 'elite', number> = {
  easy: 30,
  medium: 40,
  hard: 20,
  elite: 10,
};

// ──────────────────────────── IA Mycosynth autonome ──────────────────────────

export interface MycosynthAiConfig {
  botCount: number;
  tickConcurrency: number;
  maxOpenMarketOrders: number;
  maxActiveTradeRoutes: number;
  attackCooldownHours: number;
  targetOwnerCooldownHours: number;
  spyFreshnessHours: number;
  minAttackPowerRatio: number;
  minPvePowerRatio: number;
  fleetReserveRatio: number;
  minCombatShipsForAttack: number;
  minCombatShipsForPve: number;
  minSpyShips: number;
  minTransportShips: number;
  marketOrderQuantity: number;
  marketSellSurplus: number;
  marketBuyShortage: number;
  marketPriceFloor: number;
  /** Marge ask/bid autour de la juste valeur pour les bots non market-makers. */
  marketSpreadMargin: number;
  /** Marge ask/bid (plus serrée) pour les bots market-makers actifs. */
  marketMakerSpreadMargin: number;
  /** Bornes basses/hautes de la juste valeur, en multiples de la baseValue de l'item. */
  marketFairValueBandMin: number;
  marketFairValueBandMax: number;
  /** Seuil de trait « greed » au-delà duquel un bot tient activement le marché. */
  marketMakerGreedThreshold: number;
  /** Stock cible d'un ingrédient de craft : on n'achète que sous ce seuil. */
  marketBuyTargetStock: number;
  /** Plancher de prix par item = baseValue × ce ratio (jamais brader sous ça). */
  marketFloorRatio: number;
  tradeRouteIntervalHours: number;
  tradeRouteMaxQuantity: number;
  economyReserve: ResourceBundle;
  preferredResearch: ResearchType[];
  preferredProductionLineRecipes: string[];
  preferredCraftingRecipes: string[];
  resourceTransferHighRatio: number;
  resourceTransferLowRatio: number;
  nearbyColonizationDriftSystems: number;
}

export const MYCOSYNTH_AI_CONFIG: MycosynthAiConfig = {
  botCount: 50,
  tickConcurrency: 5,
  maxOpenMarketOrders: 6,
  maxActiveTradeRoutes: 6,
  attackCooldownHours: 12,
  targetOwnerCooldownHours: 24,
  spyFreshnessHours: 18,
  minAttackPowerRatio: 1.35,
  minPvePowerRatio: 1.35,
  fleetReserveRatio: 0.35,
  minCombatShipsForAttack: 30,
  minCombatShipsForPve: 18,
  minSpyShips: 2,
  minTransportShips: 2,
  marketOrderQuantity: 3,
  marketSellSurplus: 8,
  marketBuyShortage: 2,
  marketPriceFloor: 25,
  marketSpreadMargin: 0.08,
  marketMakerSpreadMargin: 0.03,
  marketFairValueBandMin: 0.6,
  marketFairValueBandMax: 1.6,
  marketMakerGreedThreshold: 0.7,
  marketBuyTargetStock: 6,
  marketFloorRatio: 0.5,
  tradeRouteIntervalHours: 6,
  tradeRouteMaxQuantity: 5_000,
  economyReserve: {
    [ResourceType.BIOMASS]: 1_500,
    [ResourceType.SAP]: 800,
    [ResourceType.MINERALS]: 800,
    [ResourceType.SPORES]: 250,
  },
  preferredResearch: [
    ResearchType.SPORAL_PROPULSION,
    ResearchType.ADVANCED_PHOTOSYNTHESIS,
    ResearchType.GENETIC_ENGINEERING,
    ResearchType.BIOENGINEERING,
    ResearchType.NUTRIENT_CYCLING,
    ResearchType.SUBTERRANEAN_ROOTS,
    ResearchType.SPORAL_ECONOMY,
    ResearchType.HYPERSPORE_DRIVE,
    ResearchType.CHITIN_ARMOR,
    ResearchType.BIOLOGICAL_WARFARE,
    ResearchType.SWARM_TACTICS,
    ResearchType.ORBITAL_DEFENSE_GRID,
    ResearchType.SPORE_SENSE,
    ResearchType.DEEP_SCAN,
    ResearchType.TERRAFORMATION,
    ResearchType.SYMBIOSIS,
    ResearchType.WORMHOLE_MYCOLOGY,
  ],
  preferredProductionLineRecipes: [
    'line_mycelial_fiber',
    'line_bioluminescent_gel',
    'line_chitin_shard',
    'line_spore_essence',
  ],
  preferredCraftingRecipes: [
    'recipe_mycotoxin_vial',
    'recipe_reinforced_chitin',
    'recipe_neural_matrix',
    'recipe_void_alloy',
  ],
  resourceTransferHighRatio: 0.75,
  resourceTransferLowRatio: 0.25,
  nearbyColonizationDriftSystems: 12,
};

// ────────────────────────── Cerveau NPC (IA avancée) ─────────────────────────
//
// Le cerveau MYCOSYNTH ajoute par-dessus le planificateur glouton trois couches
// déterministes : des personnalités (archétypes + traits), des buts stratégiques
// tenus plusieurs ticks, et une mémoire des relations (menace/rancune). Toute la
// configuration vit ici pour rester équilibrable de façon centralisée
// (invariant #2).

/** Vecteur de traits 0..1 modulant l'utilité des actions d'un bot. */
export interface NpcTraitVector {
  /** Goût du combat et de la masse militaire. */
  aggression: number;
  /** Goût de l'économie, du craft et du marché. */
  greed: number;
  /** Goût de la défense et de la prudence (seuils d'attaque relevés). */
  caution: number;
  /** Goût de l'expansion, de la recherche et de la croissance. */
  ambition: number;
  /** Goût de l'exploration et des expéditions. */
  curiosity: number;
}

export interface NpcArchetypeProfile {
  traits: NpcTraitVector;
  /** Poids multiplicatif par catégorie d'action (1 = neutre). */
  categoryWeights: Record<NpcActionCategory, number>;
  /** Buts préférés, départage les égalités d'utilité lors d'une révision. */
  preferredGoals: NpcGoal[];
}

export interface MycosynthBrainConfig {
  /** Poids relatifs de répartition des archétypes sur la population de bots. */
  archetypeDistribution: Record<NpcArchetype, number>;
  archetypes: Record<NpcArchetype, NpcArchetypeProfile>;
  /** Boost multiplicatif d'une catégorie quand elle sert le but courant. */
  goalCategoryBoost: Record<NpcGoal, Partial<Record<NpcActionCategory, number>>>;
  /** Modulateurs d'humeur appliqués à certaines catégories. */
  moodCategoryModifier: Record<NpcMood, Partial<Record<NpcActionCategory, number>>>;
  /** Heures minimales entre deux révisions de but (hystérésis anti-oscillation). */
  goalReviewIntervalHours: number;
  /** Fenêtre (heures) de prise en compte des attaques subies. */
  threatWindowHours: number;
  /** Fraction de menace/rancune conservée à chaque révision (0..1). */
  memoryDecay: number;
  /** Menace cumulée déclenchant l'humeur THREATENED. */
  threatenedThreshold: number;
  /** Rancune minimale autorisant une rétorsion ciblée. */
  grudgeRetaliationThreshold: number;
  /** Hausse du ratio de puissance requis par point de prudence. */
  cautionAttackRatioPenalty: number;
  /** Baisse du ratio de puissance requis par point d'agressivité. */
  aggressionAttackRatioRelief: number;
  /** Baisse supplémentaire du ratio requis contre une cible de rancune. */
  vengeanceAttackRatioRelief: number;
}

const neutralCategoryWeights = (): Record<NpcActionCategory, number> => ({
  [NpcActionCategory.CONSTRUCTION]: 1,
  [NpcActionCategory.RESEARCH]: 1,
  [NpcActionCategory.EXPANSION]: 1,
  [NpcActionCategory.FLEET]: 1,
  [NpcActionCategory.ECONOMY]: 1,
  [NpcActionCategory.WARFARE]: 1,
  [NpcActionCategory.ESPIONAGE]: 1,
});

export const MYCOSYNTH_BRAIN_CONFIG: MycosynthBrainConfig = {
  archetypeDistribution: {
    [NpcArchetype.RAIDER]: 3,
    [NpcArchetype.ECONOMIST]: 3,
    [NpcArchetype.EXPANSIONIST]: 2,
    [NpcArchetype.TURTLE]: 2,
    [NpcArchetype.OPPORTUNIST]: 2,
  },
  archetypes: {
    [NpcArchetype.RAIDER]: {
      traits: { aggression: 0.9, greed: 0.3, caution: 0.2, ambition: 0.6, curiosity: 0.5 },
      categoryWeights: {
        ...neutralCategoryWeights(),
        [NpcActionCategory.FLEET]: 1.6,
        [NpcActionCategory.WARFARE]: 1.7,
        [NpcActionCategory.ESPIONAGE]: 1.4,
        [NpcActionCategory.ECONOMY]: 0.7,
        [NpcActionCategory.EXPANSION]: 0.85,
      },
      preferredGoals: [NpcGoal.BUILD_WAR_FLEET, NpcGoal.RAID_TARGET, NpcGoal.RESEARCH_PUSH],
    },
    [NpcArchetype.ECONOMIST]: {
      traits: { aggression: 0.2, greed: 0.9, caution: 0.6, ambition: 0.5, curiosity: 0.4 },
      categoryWeights: {
        ...neutralCategoryWeights(),
        [NpcActionCategory.ECONOMY]: 1.7,
        [NpcActionCategory.CONSTRUCTION]: 1.2,
        [NpcActionCategory.RESEARCH]: 1.2,
        [NpcActionCategory.FLEET]: 0.7,
        [NpcActionCategory.WARFARE]: 0.5,
      },
      preferredGoals: [NpcGoal.MAX_ECONOMY, NpcGoal.RESEARCH_PUSH, NpcGoal.EXPAND_COLONIES],
    },
    [NpcArchetype.EXPANSIONIST]: {
      traits: { aggression: 0.4, greed: 0.5, caution: 0.3, ambition: 0.9, curiosity: 0.7 },
      categoryWeights: {
        ...neutralCategoryWeights(),
        [NpcActionCategory.EXPANSION]: 1.8,
        [NpcActionCategory.RESEARCH]: 1.3,
        [NpcActionCategory.CONSTRUCTION]: 1.1,
        [NpcActionCategory.WARFARE]: 0.7,
      },
      preferredGoals: [NpcGoal.EXPAND_COLONIES, NpcGoal.RESEARCH_PUSH, NpcGoal.MAX_ECONOMY],
    },
    [NpcArchetype.TURTLE]: {
      traits: { aggression: 0.25, greed: 0.5, caution: 0.9, ambition: 0.4, curiosity: 0.3 },
      categoryWeights: {
        ...neutralCategoryWeights(),
        [NpcActionCategory.CONSTRUCTION]: 1.5,
        [NpcActionCategory.RESEARCH]: 1.3,
        [NpcActionCategory.FLEET]: 1.1,
        [NpcActionCategory.ECONOMY]: 1.1,
        [NpcActionCategory.WARFARE]: 0.5,
        [NpcActionCategory.EXPANSION]: 0.8,
      },
      preferredGoals: [NpcGoal.FORTIFY, NpcGoal.MAX_ECONOMY, NpcGoal.RESEARCH_PUSH],
    },
    [NpcArchetype.OPPORTUNIST]: {
      traits: { aggression: 0.55, greed: 0.55, caution: 0.5, ambition: 0.55, curiosity: 0.6 },
      categoryWeights: {
        ...neutralCategoryWeights(),
        [NpcActionCategory.WARFARE]: 1.1,
        [NpcActionCategory.ESPIONAGE]: 1.1,
        [NpcActionCategory.EXPANSION]: 1.05,
      },
      preferredGoals: [NpcGoal.MAX_ECONOMY, NpcGoal.BUILD_WAR_FLEET, NpcGoal.EXPAND_COLONIES],
    },
  },
  goalCategoryBoost: {
    [NpcGoal.BUILD_WAR_FLEET]: {
      [NpcActionCategory.FLEET]: 1.6,
      [NpcActionCategory.CONSTRUCTION]: 1.15,
    },
    [NpcGoal.EXPAND_COLONIES]: {
      [NpcActionCategory.EXPANSION]: 1.7,
      [NpcActionCategory.RESEARCH]: 1.1,
    },
    [NpcGoal.MAX_ECONOMY]: {
      [NpcActionCategory.ECONOMY]: 1.6,
      [NpcActionCategory.CONSTRUCTION]: 1.2,
    },
    [NpcGoal.RAID_TARGET]: {
      [NpcActionCategory.WARFARE]: 1.8,
      [NpcActionCategory.ESPIONAGE]: 1.3,
      [NpcActionCategory.FLEET]: 1.2,
    },
    [NpcGoal.FORTIFY]: {
      [NpcActionCategory.CONSTRUCTION]: 1.5,
      [NpcActionCategory.FLEET]: 1.2,
    },
    [NpcGoal.RESEARCH_PUSH]: {
      [NpcActionCategory.RESEARCH]: 1.7,
    },
  },
  moodCategoryModifier: {
    [NpcMood.CALM]: {},
    [NpcMood.AMBITIOUS]: {
      [NpcActionCategory.EXPANSION]: 1.2,
      [NpcActionCategory.RESEARCH]: 1.1,
      [NpcActionCategory.ECONOMY]: 1.1,
    },
    [NpcMood.THREATENED]: {
      [NpcActionCategory.CONSTRUCTION]: 1.3,
      [NpcActionCategory.FLEET]: 1.3,
      [NpcActionCategory.WARFARE]: 0.7,
      [NpcActionCategory.EXPANSION]: 0.7,
    },
    [NpcMood.VENGEFUL]: {
      [NpcActionCategory.WARFARE]: 1.5,
      [NpcActionCategory.ESPIONAGE]: 1.2,
      [NpcActionCategory.FLEET]: 1.15,
    },
    [NpcMood.CONFIDENT]: {
      [NpcActionCategory.WARFARE]: 1.25,
      [NpcActionCategory.EXPANSION]: 1.1,
    },
  },
  goalReviewIntervalHours: 0.5,
  threatWindowHours: 24,
  memoryDecay: 0.8,
  threatenedThreshold: 2,
  grudgeRetaliationThreshold: 1.5,
  cautionAttackRatioPenalty: 0.4,
  aggressionAttackRatioRelief: 0.25,
  vengeanceAttackRatioRelief: 0.15,
};

// ──────────────────────────── Spécialisation planète ─────────────────────────

export interface SpecializationConfig {
  name: string;
  description: string;
  productionMultiplier: number;
  defenseMultiplier: number;
  researchTimeFactor: number;
  shipTimeFactor: number;
  color: string;
  icon: string;
}

export const SPECIALIZATION_CONFIGS: Record<PlanetSpecialization, SpecializationConfig> = {
  [PlanetSpecialization.PRODUCTION]: {
    name: 'Production',
    description: '+20% production de toutes les ressources',
    productionMultiplier: 1.2,
    defenseMultiplier: 1.0,
    researchTimeFactor: 1.0,
    shipTimeFactor: 1.0,
    color: '#22c55e',
    icon: 'leaf',
  },
  [PlanetSpecialization.MILITARY]: {
    name: 'Militaire',
    description: '+15% défense orbitale, -10% temps de construction vaisseaux',
    productionMultiplier: 0.9,
    defenseMultiplier: 1.15,
    researchTimeFactor: 1.0,
    shipTimeFactor: 1.1,
    color: '#ef4444',
    icon: 'shield',
  },
  [PlanetSpecialization.RESEARCH]: {
    name: 'Recherche',
    description: '+25% vitesse de recherche, -10% production',
    productionMultiplier: 0.9,
    defenseMultiplier: 1.0,
    researchTimeFactor: 1.25,
    shipTimeFactor: 1.0,
    color: '#3b82f6',
    icon: 'flask',
  },
  [PlanetSpecialization.FORTRESS]: {
    name: 'Forteresse',
    description: '+30% puissance défensive',
    productionMultiplier: 0.9,
    defenseMultiplier: 1.3,
    researchTimeFactor: 1.0,
    shipTimeFactor: 1.0,
    color: '#f59e0b',
    icon: 'lock',
  },
};

// ──────────────────────────── Quêtes dirigées ────────────────────────────────

/**
 * Objectifs évaluables d'une quête. Chaque clé est interprétée par le serveur
 * (`QuestsService`) à partir de l'état réel du joueur. Stable : ne pas renommer
 * (persisté dans `PlayerQuest.questId` via l'id de la quête, pas l'objectif).
 */
export type QuestObjective =
  | 'BUILDING_LEVEL_TOTAL'
  | 'BIOMASS_SYNTHESIZER_LEVEL'
  | 'SAP_WELL_LEVEL'
  | 'MINERAL_VEIN_LEVEL'
  | 'PHOTOSYNTHETIC_CANOPY_LEVEL'
  | 'RESEARCH_NEXUS_LEVEL'
  | 'STORAGE_VACUOLE_LEVEL'
  | 'SYMBIOTIC_CORE_LEVEL'
  | 'SPORANGE_LEVEL'
  | 'ORBITAL_NURSERY_LEVEL'
  | 'RESEARCH_LEVEL_ANY'
  | 'BIOENGINEERING_LEVEL'
  | 'SPORAL_PROPULSION_LEVEL'
  | 'TERRAFORMATION_LEVEL'
  | 'PLANET_SPECIALIZATION_SET'
  | 'TOTAL_SHIPS'
  | 'EXPEDITIONS_LAUNCHED'
  | 'COLONIES_OWNED';

export interface QuestConfig {
  /** Identifiant stable persisté (`PlayerQuest.questId`). Ne jamais renommer. */
  id: string;
  name: string;
  description: string;
  /** Ordre d'apparition (la 1re quête non réclamée devient « active »). */
  order: number;
  objective: QuestObjective;
  target: number;
  /** Chapitre affiché dans le guide de croissance. */
  chapter?: string;
  /** Destination de l'action principale côté client (aide UI, jamais autorité). */
  ctaHref?: string;
  /** Libellé de l'action principale côté client. */
  ctaLabel?: string;
  /** Butin crédité au Noyau-Monde lors de la réclamation (cappé au stockage). */
  reward: ResourceBundle;
}

/**
 * Chaîne d'objectifs dirigés (early → mid game). Donne au joueur une « prochaine
 * action évidente » à chaque connexion, avec une récompense concrète à réclamer.
 */
export const QUESTS: QuestConfig[] = [
  {
    id: 'first-build',
    name: 'Premier bourgeon',
    description: 'Améliore un bâtiment de ta planète mère.',
    order: 1,
    objective: 'BUILDING_LEVEL_TOTAL',
    target: 1,
    chapter: 'Éveil',
    ctaHref: '/buildings',
    ctaLabel: 'Faire pousser',
    reward: { [ResourceType.BIOMASS]: 400, [ResourceType.SAP]: 200 },
  },
  {
    id: 'biomass-2',
    name: 'Tisser la matière',
    description: 'Porte ton Synthétiseur de Biomasse au niveau 2.',
    order: 2,
    objective: 'BIOMASS_SYNTHESIZER_LEVEL',
    target: 2,
    chapter: 'Éveil',
    ctaHref: '/buildings',
    ctaLabel: 'Renforcer la biomasse',
    reward: { [ResourceType.BIOMASS]: 600, [ResourceType.MINERALS]: 200 },
  },
  {
    id: 'sap-2',
    name: 'Faire circuler la sève',
    description: 'Porte ton Puits de Sève au niveau 2 pour équilibrer tes réserves.',
    order: 3,
    objective: 'SAP_WELL_LEVEL',
    target: 2,
    chapter: 'Éveil',
    ctaHref: '/buildings',
    ctaLabel: 'Cultiver la sève',
    reward: { [ResourceType.SAP]: 700, [ResourceType.BIOMASS]: 300 },
  },
  {
    id: 'mineral-2',
    name: 'Durcir le socle',
    description: 'Porte ta Veine Minérale au niveau 2.',
    order: 4,
    objective: 'MINERAL_VEIN_LEVEL',
    target: 2,
    chapter: 'Éveil',
    ctaHref: '/buildings',
    ctaLabel: 'Extraire les minéraux',
    reward: { [ResourceType.MINERALS]: 550, [ResourceType.BIOMASS]: 300 },
  },
  {
    id: 'biomass-3',
    name: 'Biomasse stable',
    description: 'Porte ton Synthétiseur de Biomasse au niveau 3.',
    order: 5,
    objective: 'BIOMASS_SYNTHESIZER_LEVEL',
    target: 3,
    chapter: 'Éveil',
    ctaHref: '/buildings',
    ctaLabel: 'Stabiliser la production',
    reward: { [ResourceType.BIOMASS]: 800, [ResourceType.MINERALS]: 300 },
  },
  {
    id: 'canopy-2',
    name: 'Capter la lumière',
    description: 'Construis une Canopée Photosynthétique de niveau 2 pour ton énergie.',
    order: 6,
    objective: 'PHOTOSYNTHETIC_CANOPY_LEVEL',
    target: 2,
    chapter: 'Écosystème',
    ctaHref: '/buildings',
    ctaLabel: 'Équilibrer l’énergie',
    reward: { [ResourceType.SAP]: 600, [ResourceType.BIOMASS]: 400 },
  },
  {
    id: 'first-specialization',
    name: 'Choisir une vocation',
    description: 'Assigne une spécialisation à ta planète mère.',
    order: 7,
    objective: 'PLANET_SPECIALIZATION_SET',
    target: 1,
    chapter: 'Écosystème',
    ctaHref: '/play',
    ctaLabel: 'Choisir la spécialisation',
    reward: { [ResourceType.BIOMASS]: 900, [ResourceType.SAP]: 500 },
  },
  {
    id: 'research-nexus',
    name: 'Éveil du Noyau',
    description: 'Édifie un Noyau de Recherche pour débloquer le savoir.',
    order: 8,
    objective: 'RESEARCH_NEXUS_LEVEL',
    target: 1,
    chapter: 'Savoir',
    ctaHref: '/buildings',
    ctaLabel: 'Construire le Noyau',
    reward: { [ResourceType.SPORES]: 300, [ResourceType.SAP]: 400 },
  },
  {
    id: 'first-research',
    name: 'Première étincelle',
    description: 'Termine ta première recherche.',
    order: 9,
    objective: 'RESEARCH_LEVEL_ANY',
    target: 1,
    chapter: 'Savoir',
    ctaHref: '/research',
    ctaLabel: 'Lancer une recherche',
    reward: { [ResourceType.SPORES]: 500, [ResourceType.BIOMASS]: 600 },
  },
  {
    id: 'storage-3',
    name: 'Enfler les réserves',
    description: 'Porte une Vacuole de Stockage au niveau 3.',
    order: 10,
    objective: 'STORAGE_VACUOLE_LEVEL',
    target: 3,
    chapter: 'Croissance',
    ctaHref: '/buildings',
    ctaLabel: 'Étendre les réserves',
    reward: { [ResourceType.BIOMASS]: 1_500, [ResourceType.MINERALS]: 800 },
  },
  {
    id: 'symbiotic-core',
    name: 'Cœur battant',
    description: 'Construis un Cœur Symbiotique pour accélérer tes constructions.',
    order: 11,
    objective: 'SYMBIOTIC_CORE_LEVEL',
    target: 1,
    chapter: 'Croissance',
    ctaHref: '/buildings',
    ctaLabel: 'Accélérer la croissance',
    reward: { [ResourceType.BIOMASS]: 1_200, [ResourceType.SAP]: 600 },
  },
  {
    id: 'bioengineering-2',
    name: 'Ingénierie du vivant',
    description: 'Atteins Bio-ingénierie niveau 2.',
    order: 12,
    objective: 'BIOENGINEERING_LEVEL',
    target: 2,
    chapter: 'Spores',
    ctaHref: '/research',
    ctaLabel: 'Étudier le vivant',
    reward: { [ResourceType.SPORES]: 800, [ResourceType.MINERALS]: 600 },
  },
  {
    id: 'sporange',
    name: 'Cultiver les spores',
    description: 'Construis des Sporanges pour produire des spores.',
    order: 13,
    objective: 'SPORANGE_LEVEL',
    target: 1,
    chapter: 'Spores',
    ctaHref: '/buildings',
    ctaLabel: 'Cultiver les spores',
    reward: { [ResourceType.SPORES]: 1_000, [ResourceType.BIOMASS]: 1_000 },
  },
  {
    id: 'nursery',
    name: 'Berceau des étoiles',
    description: 'Recherche la Propulsion sporale puis construis un Berceau Orbital.',
    order: 14,
    objective: 'ORBITAL_NURSERY_LEVEL',
    target: 1,
    chapter: 'Expansion',
    ctaHref: '/research',
    ctaLabel: 'Préparer la flotte',
    reward: {
      [ResourceType.BIOMASS]: 2_000,
      [ResourceType.MINERALS]: 1_200,
      [ResourceType.SPORES]: 400,
    },
  },
  {
    id: 'fleet-5',
    name: 'Première nuée',
    description: 'Fais éclore 5 bio-vaisseaux au total.',
    order: 15,
    objective: 'TOTAL_SHIPS',
    target: 5,
    chapter: 'Expansion',
    ctaHref: '/fleets',
    ctaLabel: 'Produire des vaisseaux',
    reward: { [ResourceType.BIOMASS]: 2_500, [ResourceType.SAP]: 1_500 },
  },
  {
    id: 'first-expedition',
    name: 'Au-delà du voile',
    description: 'Lance une première expédition vers les anomalies galactiques.',
    order: 16,
    objective: 'EXPEDITIONS_LAUNCHED',
    target: 1,
    chapter: 'Expansion',
    ctaHref: '/fleets',
    ctaLabel: 'Lancer une expédition',
    reward: { [ResourceType.SPORES]: 1_500, [ResourceType.MINERALS]: 1_000 },
  },
  {
    id: 'first-colony',
    name: "L'essaimage",
    description: 'Fonde ta première colonie.',
    order: 17,
    objective: 'COLONIES_OWNED',
    target: 2,
    chapter: 'Expansion',
    ctaHref: '/galaxy',
    ctaLabel: 'Chercher un monde',
    reward: {
      [ResourceType.SPORES]: 2_500,
      [ResourceType.BIOMASS]: 3_000,
      [ResourceType.SAP]: 1_500,
    },
  },
  {
    id: 'terraform',
    name: 'Façonner les mondes',
    description: 'Recherche la Terraformation pour agrandir tes planètes.',
    order: 18,
    objective: 'TERRAFORMATION_LEVEL',
    target: 1,
    chapter: 'Expansion',
    ctaHref: '/research',
    ctaLabel: 'Étudier la terraformation',
    reward: { [ResourceType.SPORES]: 3_000, [ResourceType.MINERALS]: 2_500 },
  },
];

// ──────────────────────────── Récompense quotidienne ─────────────────────────

/** Au-delà de ce délai sans réclamer, la série (streak) repart de zéro. */
export const DAILY_STREAK_RESET_HOURS = 48;

/** En deçà de cette absence, on n'affiche pas le résumé « pendant votre absence ». */
export const ABSENCE_SUMMARY_MIN_SECONDS = 300;

// ──────────────────────────── Saisons de classement ──────────────────────────

/** Durée d'une saison hebdomadaire (jours). */
export const SEASON_DURATION_DAYS = 7;

export interface SeasonRewardTier {
  /** Rang maximal (inclus) couvert par ce palier. */
  maxRank: number;
  reward: ResourceBundle;
  /** Titre cosmétique octroyé (le plus prestigieux est conservé). */
  title?: string;
}

/** Paliers de récompense pour le classement individuel d'une saison. */
export const SEASON_PLAYER_TIERS: SeasonRewardTier[] = [
  {
    maxRank: 1,
    reward: {
      [ResourceType.SPORES]: 20_000,
      [ResourceType.BIOMASS]: 20_000,
      [ResourceType.MINERALS]: 15_000,
    },
    title: 'Tisserand Suprême',
  },
  {
    maxRank: 3,
    reward: {
      [ResourceType.SPORES]: 10_000,
      [ResourceType.BIOMASS]: 10_000,
      [ResourceType.MINERALS]: 8_000,
    },
    title: 'Archonte Sporal',
  },
  {
    maxRank: 10,
    reward: { [ResourceType.SPORES]: 5_000, [ResourceType.BIOMASS]: 5_000 },
    title: 'Élu de la Canopée',
  },
];

/** Paliers de récompense (par membre) pour le classement d'alliances d'une saison. */
export const SEASON_ALLIANCE_TIERS: SeasonRewardTier[] = [
  {
    maxRank: 1,
    reward: {
      [ResourceType.SPORES]: 12_000,
      [ResourceType.BIOMASS]: 12_000,
      [ResourceType.MINERALS]: 10_000,
    },
    title: 'Ruche Dominante',
  },
  {
    maxRank: 3,
    reward: { [ResourceType.SPORES]: 6_000, [ResourceType.BIOMASS]: 6_000 },
    title: 'Ruche Ascendante',
  },
];

/**
 * Cycle de 7 jours de récompenses quotidiennes (escaladant). Le jour réclamé est
 * `(streak - 1) % 7`. Le 7e jour est un gros lot de spores pour récompenser
 * l'assiduité. Crédité au Noyau-Monde (cappé au stockage).
 */
export const DAILY_REWARDS: ResourceBundle[] = [
  { [ResourceType.BIOMASS]: 500, [ResourceType.SAP]: 250 },
  { [ResourceType.BIOMASS]: 800, [ResourceType.MINERALS]: 400 },
  { [ResourceType.SAP]: 700, [ResourceType.SPORES]: 150 },
  { [ResourceType.BIOMASS]: 1_200, [ResourceType.MINERALS]: 800 },
  { [ResourceType.SPORES]: 400, [ResourceType.SAP]: 800 },
  { [ResourceType.BIOMASS]: 2_000, [ResourceType.MINERALS]: 1_200, [ResourceType.SAP]: 800 },
  { [ResourceType.SPORES]: 1_500, [ResourceType.BIOMASS]: 2_500 },
];

// ═══════════════════════════════════════════════════════════════════
// ÉCONOMIE JOUEUR
// ═══════════════════════════════════════════════════════════════════

export interface ItemConfig {
  key: ItemKey;
  name: string;
  description: string;
  rarity: ItemRarity;
  category: ItemCategory;
  /** Valeur indicative en Biomasse (utilisée pour l'ordre du marché initial). */
  baseValue: number;
  maxStack: number;
  icon: string;
  rarityColor: string;
}

export const ITEMS: Record<ItemKey, ItemConfig> = {
  [ItemKey.MYCELIAL_FIBER]: {
    key: ItemKey.MYCELIAL_FIBER,
    name: 'Fibre Mycéliale',
    description:
      'Filament organique récolté sur des parasites sporaux. Matière première polyvalente.',
    rarity: ItemRarity.COMMON,
    category: ItemCategory.RAW_MATERIAL,
    baseValue: 150,
    maxStack: 999,
    icon: 'circleDot',
    rarityColor: '#9ca3af',
  },
  [ItemKey.BIOLUMINESCENT_GEL]: {
    key: ItemKey.BIOLUMINESCENT_GEL,
    name: 'Gel Bioluminescent',
    description: 'Substance visqueuse extraite de créatures luminescentes. Propriétés caustiques.',
    rarity: ItemRarity.COMMON,
    category: ItemCategory.RAW_MATERIAL,
    baseValue: 200,
    maxStack: 999,
    icon: 'droplets',
    rarityColor: '#9ca3af',
  },
  [ItemKey.CHITIN_SHARD]: {
    key: ItemKey.CHITIN_SHARD,
    name: 'Éclat de Chitine',
    description:
      "Fragment d'exosquelette de gardien cristallin. Matériau résistant utilisé en armurerie.",
    rarity: ItemRarity.UNCOMMON,
    category: ItemCategory.RAW_MATERIAL,
    baseValue: 500,
    maxStack: 500,
    icon: 'diamond',
    rarityColor: '#4ade80',
  },
  [ItemKey.SPORE_ESSENCE]: {
    key: ItemKey.SPORE_ESSENCE,
    name: 'Essence Sporale',
    description: "Concentré de spores primordiales récupéré lors d'expéditions. Rare et précieux.",
    rarity: ItemRarity.UNCOMMON,
    category: ItemCategory.RAW_MATERIAL,
    baseValue: 800,
    maxStack: 500,
    icon: 'sparkles',
    rarityColor: '#4ade80',
  },
  [ItemKey.VOID_CRYSTAL]: {
    key: ItemKey.VOID_CRYSTAL,
    name: 'Cristal du Vide',
    description:
      'Cristal né dans les failles interdimensionnelles. Extrêmement rare, propriétés énergétiques exceptionnelles.',
    rarity: ItemRarity.RARE,
    category: ItemCategory.RAW_MATERIAL,
    baseValue: 3_000,
    maxStack: 100,
    icon: 'gem',
    rarityColor: '#60a5fa',
  },
  [ItemKey.ANCIENT_FRAGMENT]: {
    key: ItemKey.ANCIENT_FRAGMENT,
    name: 'Fragment Ancien',
    description:
      "Débris d'une civilisation disparue. Seule la Sentinelle Ancienne en possède encore.",
    rarity: ItemRarity.LEGENDARY,
    category: ItemCategory.RAW_MATERIAL,
    baseValue: 25_000,
    maxStack: 20,
    icon: 'star',
    rarityColor: '#f59e0b',
  },
  [ItemKey.REINFORCED_CHITIN]: {
    key: ItemKey.REINFORCED_CHITIN,
    name: 'Chitine Renforcée',
    description:
      "Plaques d'exosquelette traitées et consolidées. Utilisée pour les blindages avancés.",
    rarity: ItemRarity.UNCOMMON,
    category: ItemCategory.PROCESSED,
    baseValue: 1_200,
    maxStack: 200,
    icon: 'shield',
    rarityColor: '#4ade80',
  },
  [ItemKey.CRYSTALLIZED_SAP]: {
    key: ItemKey.CRYSTALLIZED_SAP,
    name: 'Sève Cristallisée',
    description:
      'Sève solidifiée par un cristal du vide. Conducteur énergétique de haute performance.',
    rarity: ItemRarity.RARE,
    category: ItemCategory.PROCESSED,
    baseValue: 5_000,
    maxStack: 100,
    icon: 'leaf',
    rarityColor: '#60a5fa',
  },
  [ItemKey.NEURAL_MATRIX]: {
    key: ItemKey.NEURAL_MATRIX,
    name: 'Matrice Neurale',
    description:
      'Réseau mycélial amplifié par des spores. Accélère les processus cognitifs organiques.',
    rarity: ItemRarity.RARE,
    category: ItemCategory.PROCESSED,
    baseValue: 6_000,
    maxStack: 50,
    icon: 'brain',
    rarityColor: '#60a5fa',
  },
  [ItemKey.VOID_ALLOY]: {
    key: ItemKey.VOID_ALLOY,
    name: 'Alliage du Vide',
    description:
      'Fusion de cristaux du vide et de minéraux purs. Le matériau le plus résistant connu.',
    rarity: ItemRarity.EPIC,
    category: ItemCategory.PROCESSED,
    baseValue: 18_000,
    maxStack: 30,
    icon: 'zap',
    rarityColor: '#a855f7',
  },
  [ItemKey.MYCOTOXIN_VIAL]: {
    key: ItemKey.MYCOTOXIN_VIAL,
    name: 'Fiole de Mycotoxine',
    description: "Concentration de toxines bioluminescentes. Arme chimique d'usage militaire.",
    rarity: ItemRarity.UNCOMMON,
    category: ItemCategory.PROCESSED,
    baseValue: 900,
    maxStack: 200,
    icon: 'flask',
    rarityColor: '#4ade80',
  },
  [ItemKey.CONVERGENCE_SHARD]: {
    key: ItemKey.CONVERGENCE_SHARD,
    name: 'Éclat de Convergence',
    description:
      'Artefact ultime forgé à partir de fragments anciens. Symbole de maîtrise absolue.',
    rarity: ItemRarity.LEGENDARY,
    category: ItemCategory.PROCESSED,
    baseValue: 80_000,
    maxStack: 5,
    icon: 'circle',
    rarityColor: '#f59e0b',
  },
};

/** Ingrédient d'une recette d'artisanat. */
export interface CraftingIngredient {
  itemKey?: ItemKey;
  resource?: ResourceType;
  quantity: number;
}

/** Recette d'artisanat. */
export interface CraftingRecipeConfig {
  id: string;
  outputKey: ItemKey;
  outputQty: number;
  craftTimeSeconds: number;
  ingredients: CraftingIngredient[];
}

/** Recette d'une ligne de production automatique. */
export interface ProductionLineRecipeConfig {
  id: string;
  outputKey: ItemKey;
  outputQty: number;
  cycleSeconds: number;
  inputs: ResourceBundle;
}

export const CRAFTING_RECIPES: CraftingRecipeConfig[] = [
  {
    id: 'recipe_reinforced_chitin',
    outputKey: ItemKey.REINFORCED_CHITIN,
    outputQty: 1,
    craftTimeSeconds: 300,
    ingredients: [
      { itemKey: ItemKey.CHITIN_SHARD, quantity: 5 },
      { resource: ResourceType.MINERALS, quantity: 200 },
    ],
  },
  {
    id: 'recipe_crystallized_sap',
    outputKey: ItemKey.CRYSTALLIZED_SAP,
    outputQty: 1,
    craftTimeSeconds: 600,
    ingredients: [
      { itemKey: ItemKey.VOID_CRYSTAL, quantity: 1 },
      { resource: ResourceType.SAP, quantity: 500 },
    ],
  },
  {
    id: 'recipe_neural_matrix',
    outputKey: ItemKey.NEURAL_MATRIX,
    outputQty: 1,
    craftTimeSeconds: 900,
    ingredients: [
      { itemKey: ItemKey.MYCELIAL_FIBER, quantity: 10 },
      { itemKey: ItemKey.SPORE_ESSENCE, quantity: 2 },
      { resource: ResourceType.SPORES, quantity: 100 },
    ],
  },
  {
    id: 'recipe_void_alloy',
    outputKey: ItemKey.VOID_ALLOY,
    outputQty: 1,
    craftTimeSeconds: 1_800,
    ingredients: [
      { itemKey: ItemKey.VOID_CRYSTAL, quantity: 3 },
      { resource: ResourceType.MINERALS, quantity: 500 },
    ],
  },
  {
    id: 'recipe_mycotoxin_vial',
    outputKey: ItemKey.MYCOTOXIN_VIAL,
    outputQty: 3,
    craftTimeSeconds: 240,
    ingredients: [
      { itemKey: ItemKey.BIOLUMINESCENT_GEL, quantity: 3 },
      { resource: ResourceType.BIOMASS, quantity: 200 },
    ],
  },
  {
    id: 'recipe_convergence_shard',
    outputKey: ItemKey.CONVERGENCE_SHARD,
    outputQty: 1,
    craftTimeSeconds: 7_200,
    ingredients: [
      { itemKey: ItemKey.ANCIENT_FRAGMENT, quantity: 2 },
      { itemKey: ItemKey.VOID_CRYSTAL, quantity: 2 },
      { resource: ResourceType.SPORES, quantity: 500 },
    ],
  },
];

export const MAX_PRODUCTION_LINES_PER_PLANET = 3;

export const PRODUCTION_LINE_RECIPES: ProductionLineRecipeConfig[] = [
  {
    id: 'line_mycelial_fiber',
    outputKey: ItemKey.MYCELIAL_FIBER,
    outputQty: 2,
    cycleSeconds: 900,
    inputs: {
      [ResourceType.BIOMASS]: 300,
      [ResourceType.SAP]: 80,
    },
  },
  {
    id: 'line_bioluminescent_gel',
    outputKey: ItemKey.BIOLUMINESCENT_GEL,
    outputQty: 2,
    cycleSeconds: 1_200,
    inputs: {
      [ResourceType.SAP]: 260,
      [ResourceType.BIOMASS]: 160,
    },
  },
  {
    id: 'line_chitin_shard',
    outputKey: ItemKey.CHITIN_SHARD,
    outputQty: 1,
    cycleSeconds: 1_800,
    inputs: {
      [ResourceType.MINERALS]: 360,
      [ResourceType.BIOMASS]: 180,
    },
  },
  {
    id: 'line_spore_essence',
    outputKey: ItemKey.SPORE_ESSENCE,
    outputQty: 1,
    cycleSeconds: 2_400,
    inputs: {
      [ResourceType.SPORES]: 120,
      [ResourceType.SAP]: 240,
    },
  },
];

/** Entrée dans une table de drop. */
export interface DropEntry {
  itemKey: ItemKey;
  /** Probabilité 0–1. */
  chance: number;
  minQty: number;
  maxQty: number;
}

/** Tables de drop PvE par type d'anomalie. */
export const PVE_DROP_TABLES: Partial<Record<NpcEncounterType, DropEntry[]>> = {
  [NpcEncounterType.SPORAL_PARASITE]: [
    { itemKey: ItemKey.MYCELIAL_FIBER, chance: 0.7, minQty: 1, maxQty: 3 },
    { itemKey: ItemKey.BIOLUMINESCENT_GEL, chance: 0.3, minQty: 1, maxQty: 2 },
  ],
  [NpcEncounterType.BIOMASS_CORRUPTED]: [
    { itemKey: ItemKey.MYCELIAL_FIBER, chance: 0.6, minQty: 2, maxQty: 5 },
    { itemKey: ItemKey.BIOLUMINESCENT_GEL, chance: 0.4, minQty: 1, maxQty: 3 },
  ],
  [NpcEncounterType.MYCOXIN_NEST]: [
    { itemKey: ItemKey.BIOLUMINESCENT_GEL, chance: 0.8, minQty: 2, maxQty: 6 },
    { itemKey: ItemKey.MYCELIAL_FIBER, chance: 0.4, minQty: 1, maxQty: 3 },
  ],
  [NpcEncounterType.MYCOSPORE_SWARM]: [
    { itemKey: ItemKey.MYCELIAL_FIBER, chance: 0.75, minQty: 3, maxQty: 7 },
    { itemKey: ItemKey.BIOLUMINESCENT_GEL, chance: 0.5, minQty: 2, maxQty: 4 },
  ],
  [NpcEncounterType.VOID_RIFT]: [
    { itemKey: ItemKey.CHITIN_SHARD, chance: 0.5, minQty: 1, maxQty: 3 },
    { itemKey: ItemKey.MYCELIAL_FIBER, chance: 0.6, minQty: 2, maxQty: 5 },
  ],
  [NpcEncounterType.FUNGAL_HIVEMIND]: [
    { itemKey: ItemKey.CHITIN_SHARD, chance: 0.6, minQty: 2, maxQty: 4 },
    { itemKey: ItemKey.SPORE_ESSENCE, chance: 0.3, minQty: 1, maxQty: 2 },
  ],
  [NpcEncounterType.CRYSTALLINE_GUARDIAN]: [
    { itemKey: ItemKey.CHITIN_SHARD, chance: 0.8, minQty: 3, maxQty: 8 },
    { itemKey: ItemKey.VOID_CRYSTAL, chance: 0.15, minQty: 1, maxQty: 1 },
  ],
  [NpcEncounterType.CHITIN_WARLORD]: [
    { itemKey: ItemKey.CHITIN_SHARD, chance: 0.9, minQty: 5, maxQty: 12 },
    { itemKey: ItemKey.VOID_CRYSTAL, chance: 0.25, minQty: 1, maxQty: 2 },
    { itemKey: ItemKey.BIOLUMINESCENT_GEL, chance: 0.4, minQty: 2, maxQty: 5 },
  ],
  [NpcEncounterType.ABANDONED_DERELICT]: [
    { itemKey: ItemKey.VOID_CRYSTAL, chance: 0.3, minQty: 1, maxQty: 2 },
    { itemKey: ItemKey.CHITIN_SHARD, chance: 0.5, minQty: 3, maxQty: 7 },
    { itemKey: ItemKey.SPORE_ESSENCE, chance: 0.4, minQty: 1, maxQty: 3 },
  ],
  [NpcEncounterType.VOID_LEVIATHAN]: [
    { itemKey: ItemKey.VOID_CRYSTAL, chance: 0.6, minQty: 2, maxQty: 5 },
    { itemKey: ItemKey.CHITIN_SHARD, chance: 0.8, minQty: 5, maxQty: 15 },
    { itemKey: ItemKey.SPORE_ESSENCE, chance: 0.5, minQty: 2, maxQty: 4 },
  ],
  [NpcEncounterType.ANCIENT_SENTINEL]: [
    { itemKey: ItemKey.ANCIENT_FRAGMENT, chance: 0.5, minQty: 1, maxQty: 2 },
    { itemKey: ItemKey.VOID_CRYSTAL, chance: 0.7, minQty: 3, maxQty: 6 },
    { itemKey: ItemKey.SPORE_ESSENCE, chance: 0.8, minQty: 3, maxQty: 6 },
  ],
};

/** Tables de drop des expéditions par résultat. */
export const EXPEDITION_DROP_TABLES: Partial<Record<ExpeditionOutcome, DropEntry[]>> = {
  [ExpeditionOutcome.RARE_SPORES]: [
    { itemKey: ItemKey.SPORE_ESSENCE, chance: 0.6, minQty: 1, maxQty: 3 },
    { itemKey: ItemKey.MYCELIAL_FIBER, chance: 0.4, minQty: 2, maxQty: 5 },
  ],
  [ExpeditionOutcome.DERELICT_SHIP]: [
    { itemKey: ItemKey.CHITIN_SHARD, chance: 0.5, minQty: 2, maxQty: 6 },
    { itemKey: ItemKey.VOID_CRYSTAL, chance: 0.1, minQty: 1, maxQty: 1 },
  ],
  [ExpeditionOutcome.ANOMALY]: [
    { itemKey: ItemKey.VOID_CRYSTAL, chance: 0.2, minQty: 1, maxQty: 2 },
    { itemKey: ItemKey.SPORE_ESSENCE, chance: 0.5, minQty: 1, maxQty: 3 },
  ],
  [ExpeditionOutcome.ANCIENT_ARCHIVE]: [
    { itemKey: ItemKey.ANCIENT_FRAGMENT, chance: 0.15, minQty: 1, maxQty: 1 },
    { itemKey: ItemKey.SPORE_ESSENCE, chance: 0.7, minQty: 2, maxQty: 5 },
    { itemKey: ItemKey.VOID_CRYSTAL, chance: 0.3, minQty: 1, maxQty: 2 },
  ],
  [ExpeditionOutcome.VOID_ECHO]: [
    { itemKey: ItemKey.VOID_CRYSTAL, chance: 0.35, minQty: 1, maxQty: 3 },
    { itemKey: ItemKey.BIOLUMINESCENT_GEL, chance: 0.6, minQty: 3, maxQty: 8 },
  ],
  [ExpeditionOutcome.CONVERGENCE_BLOOM]: [
    { itemKey: ItemKey.ANCIENT_FRAGMENT, chance: 0.25, minQty: 1, maxQty: 1 },
    { itemKey: ItemKey.VOID_CRYSTAL, chance: 0.5, minQty: 2, maxQty: 4 },
    { itemKey: ItemKey.SPORE_ESSENCE, chance: 0.9, minQty: 3, maxQty: 7 },
  ],
  [ExpeditionOutcome.RESOURCE_CACHE]: [
    { itemKey: ItemKey.MYCELIAL_FIBER, chance: 0.5, minQty: 3, maxQty: 8 },
    { itemKey: ItemKey.BIOLUMINESCENT_GEL, chance: 0.3, minQty: 2, maxQty: 5 },
  ],
};

// ═══════════════════════════════════════════════════════════════════
// COMMANDANTS SYMBIOTIQUES
// ═══════════════════════════════════════════════════════════════════

/** Un nœud de talent dans une branche de commandant. */
export interface TalentNodeConfig {
  /** Identifiant unique dans la branche. */
  id: string;
  name: string;
  description: string;
  maxPoints: number;
  /** Effet par point : clé générique interprétée par le serveur. */
  effectKey: string;
  effectValue: number;
  /** ID des nœuds prérequis dans la même branche. */
  requires?: string[];
}

export interface CommanderTalentBranchConfig {
  branch: CommanderTalentBranch;
  name: string;
  nodes: TalentNodeConfig[];
}

export interface CommanderConfig {
  type: CommanderType;
  name: string;
  lore: string;
  rarity: CommanderRarity;
  /** Branches de talents disponibles pour ce commandant. */
  talentBranches: CommanderTalentBranch[];
  /** Bonus passif au niveau 1 sans talent (string clé → valeur). */
  baseBonus: Record<string, number>;
  /** Stats au niveau 1. */
  baseStats: { attack: number; defense: number; speed: number; leadership: number };
  /** Coût de recrutement (base). */
  recruitCost: ResourceBundle;
  /** XP nécessaire pour passer du niveau N au niveau N+1. Formule: baseXp * level^1.5 */
  baseXpPerLevel: number;
  maxLevel: number;
}

/** Formule XP : XP requis pour passer du niveau `level` au niveau `level+1`. */
export function commanderXpToNextLevel(baseXp: number, level: number): number {
  return Math.floor(baseXp * Math.pow(level, 1.5));
}

/** Talents communs (COMBAT) — partagés par tous les commandants combattants. */
const COMBAT_TALENTS: CommanderTalentBranchConfig = {
  branch: CommanderTalentBranch.COMBAT,
  name: 'Combat',
  nodes: [
    {
      id: 'combat_attack_1',
      name: 'Crocs acérés',
      description: '+2% attaque de flotte par point.',
      maxPoints: 5,
      effectKey: 'fleet_attack_pct',
      effectValue: 0.02,
    },
    {
      id: 'combat_defense_1',
      name: 'Carapace renforcée',
      description: '+2% défense de flotte par point.',
      maxPoints: 5,
      effectKey: 'fleet_defense_pct',
      effectValue: 0.02,
    },
    {
      id: 'combat_rapid_fire',
      name: 'Salve sporale',
      description: '+5% tirs en rafale contre les petits vaisseaux.',
      maxPoints: 3,
      effectKey: 'rapid_fire_small_pct',
      effectValue: 0.05,
      requires: ['combat_attack_1'],
    },
    {
      id: 'combat_pillage',
      name: 'Pillage organique',
      description: '+5% de ressources pillées par point.',
      maxPoints: 4,
      effectKey: 'loot_pct',
      effectValue: 0.05,
      requires: ['combat_attack_1'],
    },
    {
      id: 'combat_warlord',
      name: 'Fureur du Seigneur',
      description: '+10% attaque et défense simultanément.',
      maxPoints: 1,
      effectKey: 'warlord_bonus',
      effectValue: 0.1,
      requires: ['combat_rapid_fire', 'combat_defense_1'],
    },
  ],
};

const GATHERING_TALENTS: CommanderTalentBranchConfig = {
  branch: CommanderTalentBranch.GATHERING,
  name: 'Collecte',
  nodes: [
    {
      id: 'gather_speed',
      name: 'Essaim rapide',
      description: '+3% vitesse des expéditions.',
      maxPoints: 5,
      effectKey: 'expedition_speed_pct',
      effectValue: 0.03,
    },
    {
      id: 'gather_yield',
      name: 'Récolte abondante',
      description: '+4% ressources obtenues en expédition.',
      maxPoints: 5,
      effectKey: 'expedition_yield_pct',
      effectValue: 0.04,
    },
    {
      id: 'gather_debris',
      name: 'Récupérateur de débris',
      description: '+10% capacité de recyclage des BIO_RECYCLER.',
      maxPoints: 3,
      effectKey: 'debris_recycle_pct',
      effectValue: 0.1,
      requires: ['gather_speed'],
    },
    {
      id: 'gather_legendary',
      name: 'Instinct prédateur',
      description: '+15% chance de résultat rare en expédition.',
      maxPoints: 1,
      effectKey: 'expedition_rare_chance',
      effectValue: 0.15,
      requires: ['gather_yield', 'gather_debris'],
    },
  ],
};

const CONSTRUCTION_TALENTS: CommanderTalentBranchConfig = {
  branch: CommanderTalentBranch.CONSTRUCTION,
  name: 'Construction',
  nodes: [
    {
      id: 'build_speed',
      name: 'Mycélium industrieux',
      description: '-3% temps de construction par point.',
      maxPoints: 5,
      effectKey: 'build_time_reduction_pct',
      effectValue: 0.03,
    },
    {
      id: 'build_cost',
      name: 'Optimisation des ressources',
      description: '-2% coût de construction par point.',
      maxPoints: 5,
      effectKey: 'build_cost_reduction_pct',
      effectValue: 0.02,
    },
    {
      id: 'build_queue',
      name: "File d'attente avancée",
      description: '+1 emplacement de file de construction.',
      maxPoints: 2,
      effectKey: 'build_queue_slots',
      effectValue: 1,
      requires: ['build_speed'],
    },
    {
      id: 'build_master',
      name: 'Architecte Légendaire',
      description: '-15% coût et temps de construction pour les bâtiments niveau 10+.',
      maxPoints: 1,
      effectKey: 'master_builder_bonus',
      effectValue: 0.15,
      requires: ['build_cost', 'build_queue'],
    },
  ],
};

const RESEARCH_TALENTS: CommanderTalentBranchConfig = {
  branch: CommanderTalentBranch.RESEARCH,
  name: 'Recherche',
  nodes: [
    {
      id: 'research_speed',
      name: 'Réseau cognitif étendu',
      description: '-4% temps de recherche par point.',
      maxPoints: 5,
      effectKey: 'research_time_reduction_pct',
      effectValue: 0.04,
    },
    {
      id: 'research_cost',
      name: 'Frugalité sporale',
      description: '-3% coût de recherche par point.',
      maxPoints: 5,
      effectKey: 'research_cost_reduction_pct',
      effectValue: 0.03,
    },
    {
      id: 'research_xp',
      name: 'Apprentissage accéléré',
      description: '+10% XP gagné en recherche.',
      maxPoints: 3,
      effectKey: 'research_xp_pct',
      effectValue: 0.1,
      requires: ['research_speed'],
    },
    {
      id: 'research_legendary',
      name: 'Illumination',
      description: '-20% coût des prochaines 3 recherches (usage unique/heure).',
      maxPoints: 1,
      effectKey: 'illumination_cooldown',
      effectValue: 3600,
      requires: ['research_cost', 'research_xp'],
    },
  ],
};

const LEADERSHIP_TALENTS: CommanderTalentBranchConfig = {
  branch: CommanderTalentBranch.LEADERSHIP,
  name: 'Leadership',
  nodes: [
    {
      id: 'lead_speed',
      name: 'Marche forcée',
      description: '+3% vitesse de flotte par point.',
      maxPoints: 5,
      effectKey: 'fleet_speed_pct',
      effectValue: 0.03,
    },
    {
      id: 'lead_march',
      name: 'Files de marche',
      description: '+1 file de marche simultanée par point.',
      maxPoints: 3,
      effectKey: 'march_queue_slots',
      effectValue: 1,
    },
    {
      id: 'lead_alliance',
      name: "Aura d'alliance",
      description: '+2% à toutes les productions pour les alliés dans le même secteur.',
      maxPoints: 3,
      effectKey: 'alliance_sector_bonus',
      effectValue: 0.02,
      requires: ['lead_speed'],
    },
    {
      id: 'lead_legendary',
      name: 'Commandant Légendaire',
      description: '+1 file de marche, +5% attaque, +5% vitesse de flotte.',
      maxPoints: 1,
      effectKey: 'legendary_commander',
      effectValue: 1,
      requires: ['lead_march', 'lead_alliance'],
    },
  ],
};

export const COMMANDER_TALENT_BRANCHES: Record<CommanderTalentBranch, CommanderTalentBranchConfig> =
  {
    [CommanderTalentBranch.COMBAT]: COMBAT_TALENTS,
    [CommanderTalentBranch.GATHERING]: GATHERING_TALENTS,
    [CommanderTalentBranch.CONSTRUCTION]: CONSTRUCTION_TALENTS,
    [CommanderTalentBranch.RESEARCH]: RESEARCH_TALENTS,
    [CommanderTalentBranch.LEADERSHIP]: LEADERSHIP_TALENTS,
  };

export const COMMANDERS: Record<CommanderType, CommanderConfig> = {
  [CommanderType.MYCO_WARLORD]: {
    type: CommanderType.MYCO_WARLORD,
    name: 'Seigneur Mycélien',
    lore: 'Un général fongique issu des sous-bois de la Convergence. Sa horde est implacable.',
    rarity: CommanderRarity.RARE,
    talentBranches: [CommanderTalentBranch.COMBAT, CommanderTalentBranch.LEADERSHIP],
    baseBonus: { fleet_attack_pct: 0.05 },
    baseStats: { attack: 25, defense: 10, speed: 15, leadership: 20 },
    recruitCost: { [ResourceType.SPORES]: 800, [ResourceType.BIOMASS]: 1_500 },
    baseXpPerLevel: 100,
    maxLevel: 40,
  },
  [CommanderType.CHITIN_GUARDIAN]: {
    type: CommanderType.CHITIN_GUARDIAN,
    name: 'Gardien Chitinide',
    lore: "Colosse défensif dont l'armure chitineuse a résisté à mille batailles.",
    rarity: CommanderRarity.RARE,
    talentBranches: [CommanderTalentBranch.COMBAT, CommanderTalentBranch.CONSTRUCTION],
    baseBonus: { fleet_defense_pct: 0.08, build_time_reduction_pct: 0.03 },
    baseStats: { attack: 10, defense: 30, speed: 8, leadership: 15 },
    recruitCost: { [ResourceType.MINERALS]: 1_200, [ResourceType.BIOMASS]: 800 },
    baseXpPerLevel: 100,
    maxLevel: 40,
  },
  [CommanderType.VOID_REAPER]: {
    type: CommanderType.VOID_REAPER,
    name: 'Faucheur du Vide',
    lore: 'Chasseur solitaire qui frappe depuis les failles du Vide avec une précision mortelle.',
    rarity: CommanderRarity.EPIC,
    talentBranches: [CommanderTalentBranch.COMBAT, CommanderTalentBranch.GATHERING],
    baseBonus: { loot_pct: 0.1, fleet_attack_pct: 0.03 },
    baseStats: { attack: 30, defense: 8, speed: 20, leadership: 12 },
    recruitCost: { [ResourceType.SPORES]: 1_500, [ResourceType.MINERALS]: 1_000 },
    baseXpPerLevel: 120,
    maxLevel: 40,
  },
  [CommanderType.SPORE_STORM]: {
    type: CommanderType.SPORE_STORM,
    name: 'Tempête Sporale',
    lore: 'Commandant de flotte spécialisé dans les raids éclair et les retraites stratégiques.',
    rarity: CommanderRarity.UNCOMMON,
    talentBranches: [CommanderTalentBranch.COMBAT, CommanderTalentBranch.LEADERSHIP],
    baseBonus: { fleet_speed_pct: 0.1 },
    baseStats: { attack: 15, defense: 12, speed: 25, leadership: 18 },
    recruitCost: { [ResourceType.BIOMASS]: 600, [ResourceType.SAP]: 400 },
    baseXpPerLevel: 80,
    maxLevel: 40,
  },
  [CommanderType.SYMBIONT_SAGE]: {
    type: CommanderType.SYMBIONT_SAGE,
    name: 'Sage Symbiotique',
    lore: 'Érudit millénaire dont la mémoire encode toutes les connaissances des Tisserands.',
    rarity: CommanderRarity.EPIC,
    talentBranches: [CommanderTalentBranch.RESEARCH, CommanderTalentBranch.CONSTRUCTION],
    baseBonus: { research_time_reduction_pct: 0.1 },
    baseStats: { attack: 5, defense: 5, speed: 5, leadership: 30 },
    recruitCost: { [ResourceType.SPORES]: 2_000, [ResourceType.SAP]: 1_500 },
    baseXpPerLevel: 120,
    maxLevel: 40,
  },
  [CommanderType.ROOT_WEAVER]: {
    type: CommanderType.ROOT_WEAVER,
    name: 'Tisseuse de Racines',
    lore: 'Génie agricole qui tisse les racines planétaires pour maximiser les récoltes.',
    rarity: CommanderRarity.UNCOMMON,
    talentBranches: [CommanderTalentBranch.GATHERING, CommanderTalentBranch.CONSTRUCTION],
    baseBonus: { expedition_yield_pct: 0.08 },
    baseStats: { attack: 5, defense: 10, speed: 8, leadership: 15 },
    recruitCost: { [ResourceType.BIOMASS]: 800, [ResourceType.SAP]: 600 },
    baseXpPerLevel: 80,
    maxLevel: 40,
  },
  [CommanderType.FUNGAL_MERCHANT]: {
    type: CommanderType.FUNGAL_MERCHANT,
    name: 'Marchand Fongique',
    lore: "Commerçant légendaire dont les routes commerciales s'étendent aux confins de la galaxie.",
    rarity: CommanderRarity.RARE,
    talentBranches: [CommanderTalentBranch.GATHERING, CommanderTalentBranch.LEADERSHIP],
    baseBonus: { market_tax_reduction: 0.1 },
    baseStats: { attack: 3, defense: 8, speed: 12, leadership: 25 },
    recruitCost: { [ResourceType.SPORES]: 1_200, [ResourceType.SAP]: 1_000 },
    baseXpPerLevel: 100,
    maxLevel: 40,
  },
  [CommanderType.CANOPY_ARCHITECT]: {
    type: CommanderType.CANOPY_ARCHITECT,
    name: 'Architecte de la Canopée',
    lore: 'Maître bâtisseur qui ériger des structures vivantes en un temps record.',
    rarity: CommanderRarity.UNCOMMON,
    talentBranches: [CommanderTalentBranch.CONSTRUCTION, CommanderTalentBranch.RESEARCH],
    baseBonus: { build_time_reduction_pct: 0.1, build_cost_reduction_pct: 0.05 },
    baseStats: { attack: 4, defense: 8, speed: 6, leadership: 20 },
    recruitCost: { [ResourceType.BIOMASS]: 500, [ResourceType.MINERALS]: 800 },
    baseXpPerLevel: 80,
    maxLevel: 40,
  },
  [CommanderType.VOID_NAVIGATOR]: {
    type: CommanderType.VOID_NAVIGATOR,
    name: 'Navigatrice du Vide',
    lore: 'Exploratrice qui a cartographié des centaines de systèmes inexplorés.',
    rarity: CommanderRarity.RARE,
    talentBranches: [CommanderTalentBranch.GATHERING, CommanderTalentBranch.LEADERSHIP],
    baseBonus: { expedition_speed_pct: 0.15, expedition_rare_chance: 0.05 },
    baseStats: { attack: 8, defense: 8, speed: 22, leadership: 18 },
    recruitCost: { [ResourceType.SPORES]: 1_000, [ResourceType.SAP]: 800 },
    baseXpPerLevel: 100,
    maxLevel: 40,
  },
  [CommanderType.SPORE_ORACLE]: {
    type: CommanderType.SPORE_ORACLE,
    name: 'Oracle Sporique',
    lore: "Maître de l'espionnage dont les spores invisibles infiltrent les empires ennemis.",
    rarity: CommanderRarity.EPIC,
    talentBranches: [CommanderTalentBranch.GATHERING, CommanderTalentBranch.COMBAT],
    baseBonus: { spy_success_chance: 0.15 },
    baseStats: { attack: 5, defense: 15, speed: 25, leadership: 10 },
    recruitCost: { [ResourceType.SPORES]: 2_500, [ResourceType.SAP]: 1_000 },
    baseXpPerLevel: 120,
    maxLevel: 40,
  },
  [CommanderType.HIVE_HERALD]: {
    type: CommanderType.HIVE_HERALD,
    name: 'Héraut de la Ruche',
    lore: "Diplomate et stratège d'alliance dont la présence galvanise chaque membre.",
    rarity: CommanderRarity.RARE,
    talentBranches: [CommanderTalentBranch.LEADERSHIP, CommanderTalentBranch.CONSTRUCTION],
    baseBonus: { alliance_sector_bonus: 0.05, march_queue_slots: 1 },
    baseStats: { attack: 8, defense: 12, speed: 10, leadership: 35 },
    recruitCost: { [ResourceType.SPORES]: 1_500, [ResourceType.BIOMASS]: 1_500 },
    baseXpPerLevel: 110,
    maxLevel: 40,
  },
  [CommanderType.ANCIENT_SYMBIONT]: {
    type: CommanderType.ANCIENT_SYMBIONT,
    name: 'Symbionte Ancien',
    lore: 'Entité primordiale survivante de la Convergence originelle. Ses pouvoirs défient la compréhension.',
    rarity: CommanderRarity.LEGENDARY,
    talentBranches: [
      CommanderTalentBranch.COMBAT,
      CommanderTalentBranch.GATHERING,
      CommanderTalentBranch.RESEARCH,
      CommanderTalentBranch.LEADERSHIP,
    ],
    baseBonus: {
      fleet_attack_pct: 0.05,
      fleet_defense_pct: 0.05,
      expedition_yield_pct: 0.05,
      research_time_reduction_pct: 0.05,
    },
    baseStats: { attack: 20, defense: 20, speed: 20, leadership: 40 },
    recruitCost: {
      [ResourceType.SPORES]: 5_000,
      [ResourceType.BIOMASS]: 5_000,
      [ResourceType.MINERALS]: 3_000,
      [ResourceType.SAP]: 3_000,
    },
    baseXpPerLevel: 200,
    maxLevel: 60,
  },
};

/** Nombre maximum de commandants actifs (non IDLE) en simultané selon le niveau du SYMBIOTIC_CORE. */
export function maxActiveCommanders(symbioticCoreLevel: number): number {
  return Math.min(1 + Math.floor(symbioticCoreLevel / 5), 6);
}

// ═══════════════════════════════════════════════════════════════════
// LUNES ORGANIQUES
// ═══════════════════════════════════════════════════════════════════

export interface MoonBuildingConfig {
  type: MoonBuildingType;
  name: string;
  description: string;
  baseCost: ResourceBundle;
  costFactor: number;
  maxLevel: number;
  requires?: Requirements;
}

export const MOON_BUILDINGS: Record<MoonBuildingType, MoonBuildingConfig> = {
  [MoonBuildingType.LUNAR_CORE]: {
    type: MoonBuildingType.LUNAR_CORE,
    name: 'Noyau Lunaire',
    description: 'Hub central de la lune organique. Requis pour tout autre bâtiment.',
    baseCost: {
      [ResourceType.BIOMASS]: 2_000,
      [ResourceType.MINERALS]: 2_000,
      [ResourceType.SAP]: 500,
    },
    costFactor: 2.0,
    maxLevel: 10,
  },
  [MoonBuildingType.SPORE_PHALANX]: {
    type: MoonBuildingType.SPORE_PHALANX,
    name: 'Phalange Sporale',
    description: 'Réseau de détection qui révèle les flottes ennemies dans des systèmes voisins.',
    baseCost: {
      [ResourceType.BIOMASS]: 3_000,
      [ResourceType.MINERALS]: 1_500,
      [ResourceType.SPORES]: 500,
    },
    costFactor: 2.5,
    maxLevel: 5,
    requires: { buildings: { [BuildingType.RESEARCH_NEXUS]: 5 } },
  },
  [MoonBuildingType.BIO_JUMP_GATE]: {
    type: MoonBuildingType.BIO_JUMP_GATE,
    name: 'Bio-Porte de Saut',
    description:
      "Téléporte instantanément une flotte depuis cette lune vers une autre lune équipée d'une porte.",
    baseCost: {
      [ResourceType.BIOMASS]: 5_000,
      [ResourceType.MINERALS]: 4_000,
      [ResourceType.SAP]: 2_000,
      [ResourceType.SPORES]: 1_000,
    },
    costFactor: 3.0,
    maxLevel: 1,
    requires: { research: { [ResearchType.WORMHOLE_MYCOLOGY]: 2 } },
  },
  [MoonBuildingType.LUNAR_NURSERY]: {
    type: MoonBuildingType.LUNAR_NURSERY,
    name: 'Nid Lunaire',
    description: 'Produit des vaisseaux depuis la sécurité de la lune.',
    baseCost: {
      [ResourceType.BIOMASS]: 2_500,
      [ResourceType.MINERALS]: 1_800,
      [ResourceType.SAP]: 800,
    },
    costFactor: 1.8,
    maxLevel: 8,
    requires: { research: { [ResearchType.SPORAL_PROPULSION]: 3 } },
  },
  [MoonBuildingType.CRYSTALLINE_SILO]: {
    type: MoonBuildingType.CRYSTALLINE_SILO,
    name: 'Silo Cristallin',
    description: 'Stockage souterrain lunaire, invisible aux espions.',
    baseCost: { [ResourceType.MINERALS]: 2_000, [ResourceType.BIOMASS]: 1_000 },
    costFactor: 1.6,
    maxLevel: 10,
  },
};

/** Probabilité de création d'une lune selon la taille du champ de débris (en unités de ressources). */
export function moonCreationChance(debrisSize: number): number {
  // 1% par tranche de 100 000 ressources de débris, max 20%
  return Math.min(0.2, debrisSize / 10_000_000);
}

/** Fraction des ressources des vaisseaux détruits qui alimentent le champ de débris. */
export const DEBRIS_FRACTION = 0.3;

/** Durée en heures avant qu'un champ de débris ne disparaisse. */
export const DEBRIS_EXPIRY_HOURS = 48;

// ═══════════════════════════════════════════════════════════════════
// DÉFENSES ORBITALES
// ═══════════════════════════════════════════════════════════════════

export interface DefenseConfig {
  type: DefenseType;
  name: string;
  description: string;
  cost: ResourceBundle;
  buildTimeSeconds: number;
  attack: number;
  defense: number;
  hull: number;
  /** Facteur de dégâts contre les gros vaisseaux. */
  antiCapitalFactor?: number;
  requires?: Requirements;
}

export const DEFENSES: Record<DefenseType, DefenseConfig> = {
  [DefenseType.ION_CANNON]: {
    type: DefenseType.ION_CANNON,
    name: 'Canon Ionique',
    description: "Structure défensive polyvalente qui tire des salves d'ions chargés.",
    cost: { [ResourceType.BIOMASS]: 180, [ResourceType.MINERALS]: 180 },
    buildTimeSeconds: 120,
    attack: 40,
    defense: 20,
    hull: 200,
  },
  [DefenseType.SPORE_NET]: {
    type: DefenseType.SPORE_NET,
    name: 'Filet Sporale',
    description: "Nuage de spores collantes qui ralentit les flottes d'assaut et les endommage.",
    cost: { [ResourceType.BIOMASS]: 240, [ResourceType.SAP]: 120 },
    buildTimeSeconds: 90,
    attack: 15,
    defense: 40,
    hull: 150,
  },
  [DefenseType.SHIELD_MEMBRANE]: {
    type: DefenseType.SHIELD_MEMBRANE,
    name: 'Membrane Bouclier',
    description: 'Membrane organique semi-perméable qui absorbe les 10 premiers % de dégâts.',
    cost: { [ResourceType.BIOMASS]: 800, [ResourceType.SAP]: 600, [ResourceType.MINERALS]: 200 },
    buildTimeSeconds: 300,
    attack: 5,
    defense: 100,
    hull: 500,
    requires: { research: { [ResearchType.CHITIN_ARMOR]: 2 } },
  },
  [DefenseType.MYCELIAL_TURRET]: {
    type: DefenseType.MYCELIAL_TURRET,
    name: 'Tourelle Mycélienne',
    description: 'Tourelle organique à haute cadence de tir, idéale contre les petits vaisseaux.',
    cost: { [ResourceType.BIOMASS]: 600, [ResourceType.MINERALS]: 600, [ResourceType.SPORES]: 100 },
    buildTimeSeconds: 240,
    attack: 60,
    defense: 30,
    hull: 300,
    requires: { research: { [ResearchType.BIOLOGICAL_WARFARE]: 2 } },
  },
  [DefenseType.VOID_LANCE]: {
    type: DefenseType.VOID_LANCE,
    name: 'Lance du Vide',
    description:
      'Arme anti-capitaux qui perce les blindages lourds avec un rayon de Vide focalisé.',
    cost: {
      [ResourceType.BIOMASS]: 2_000,
      [ResourceType.MINERALS]: 2_500,
      [ResourceType.SPORES]: 500,
      [ResourceType.SAP]: 500,
    },
    buildTimeSeconds: 900,
    attack: 200,
    defense: 50,
    hull: 800,
    antiCapitalFactor: 2.0,
    requires: {
      research: { [ResearchType.ORBITAL_DEFENSE_GRID]: 5 },
      buildings: { [BuildingType.ORBITAL_NURSERY]: 5 },
    },
  },
  [DefenseType.ORBITAL_THORN_BED]: {
    type: DefenseType.ORBITAL_THORN_BED,
    name: "Lit d'Épines Orbitales",
    description:
      "Champ d'épines cristallines qui inflige des dégâts à toute flotte passant en orbite.",
    cost: {
      [ResourceType.BIOMASS]: 1_000,
      [ResourceType.MINERALS]: 1_200,
      [ResourceType.SAP]: 300,
    },
    buildTimeSeconds: 600,
    attack: 80,
    defense: 60,
    hull: 600,
    requires: { research: { [ResearchType.ORBITAL_DEFENSE_GRID]: 3 } },
  },
};

// ═══════════════════════════════════════════════════════════════════
// POPULATION & MAIN-D'ŒUVRE
// ═══════════════════════════════════════════════════════════════════

/** Population de base d'un Noyau-Monde à la création. */
export const BASE_POPULATION = 1_000;
/** Population de base d'une colonie à la fondation. */
export const COLONY_BASE_POPULATION = 200;
/** Croissance horaire de la population (% de la pop actuelle). */
export const POPULATION_GROWTH_RATE_PER_HOUR = 0.005; // 0.5%/h
/** Population maximale de base (avant bonus de recherche). */
export const BASE_MAX_POPULATION = 5_000;
/** Bonus de population maximale par niveau de Terraformation. */
export const MAX_POPULATION_PER_TERRAFORMATION = 1_000;

/** Travailleurs requis par bâtiment à chaque niveau (Niv 1 → Niv max). */
export const BUILDING_WORKER_REQUIREMENTS: Record<BuildingType, Record<WorkerTier, number>> = {
  [BuildingType.BIOMASS_SYNTHESIZER]: {
    [WorkerTier.BASIC]: 5,
    [WorkerTier.SKILLED]: 0,
    [WorkerTier.EXPERT]: 0,
  },
  [BuildingType.SAP_WELL]: {
    [WorkerTier.BASIC]: 5,
    [WorkerTier.SKILLED]: 0,
    [WorkerTier.EXPERT]: 0,
  },
  [BuildingType.MINERAL_VEIN]: {
    [WorkerTier.BASIC]: 6,
    [WorkerTier.SKILLED]: 0,
    [WorkerTier.EXPERT]: 0,
  },
  [BuildingType.SPORANGE]: {
    [WorkerTier.BASIC]: 4,
    [WorkerTier.SKILLED]: 2,
    [WorkerTier.EXPERT]: 0,
  },
  [BuildingType.PHOTOSYNTHETIC_CANOPY]: {
    [WorkerTier.BASIC]: 3,
    [WorkerTier.SKILLED]: 1,
    [WorkerTier.EXPERT]: 0,
  },
  [BuildingType.STORAGE_VACUOLE]: {
    [WorkerTier.BASIC]: 2,
    [WorkerTier.SKILLED]: 0,
    [WorkerTier.EXPERT]: 0,
  },
  [BuildingType.RESEARCH_NEXUS]: {
    [WorkerTier.BASIC]: 2,
    [WorkerTier.SKILLED]: 4,
    [WorkerTier.EXPERT]: 2,
  },
  [BuildingType.SYMBIOTIC_CORE]: {
    [WorkerTier.BASIC]: 3,
    [WorkerTier.SKILLED]: 3,
    [WorkerTier.EXPERT]: 2,
  },
  [BuildingType.ORBITAL_NURSERY]: {
    [WorkerTier.BASIC]: 4,
    [WorkerTier.SKILLED]: 4,
    [WorkerTier.EXPERT]: 2,
  },
};

/** Ratio d'occupation des travailleurs : travailleurs disponibles / requis.
 *  Si < 1, la production est pénalisée proportionnellement. */
export function workerProductionFactor(available: number, required: number): number {
  if (required === 0) return 1;
  return Math.min(1, available / required);
}

/** Niveau de qualification requis selon le niveau du bâtiment. */
export function requiredWorkerTier(buildingLevel: number): WorkerTier {
  if (buildingLevel >= 10) return WorkerTier.EXPERT;
  if (buildingLevel >= 5) return WorkerTier.SKILLED;
  return WorkerTier.BASIC;
}

/** Travailleurs qualifiés disponibles selon la population totale. */
export function workerDistribution(population: number): Record<WorkerTier, number> {
  return {
    [WorkerTier.BASIC]: Math.floor(population * 0.6),
    [WorkerTier.SKILLED]: Math.floor(population * 0.3),
    [WorkerTier.EXPERT]: Math.floor(population * 0.1),
  };
}

// ═══════════════════════════════════════════════════════════════════
// FILES DE MARCHE MULTIPLES
// ═══════════════════════════════════════════════════════════════════

/** Nombre de files de marche de base (une seule mission PvP à la fois). */
export const BASE_MARCH_QUEUES = 1;
/** Files de marche supplémentaires par niveau de Propulsion Sporale (max 4 bonus). */
export const MARCH_QUEUES_PER_SPORAL_PROPULSION = 1;
/** Maximum absolu de files de marche. */
export const MAX_MARCH_QUEUES = 5;

/** Calcule le nombre de files de marche disponibles pour un joueur. */
export function availableMarchQueues(
  sporalPropulsionLevel: number,
  commanderBonus: number,
): number {
  return Math.min(
    MAX_MARCH_QUEUES,
    BASE_MARCH_QUEUES + Math.min(4, sporalPropulsionLevel) + commanderBonus,
  );
}

// ═══════════════════════════════════════════════════════════════════
// TERRITOIRE D'ALLIANCE
// ═══════════════════════════════════════════════════════════════════

/** Points de vie d'une balise sporale de territoire. */
export const TERRITORY_BEACON_MAX_HEALTH = 1_000;
/** Coût de déploiement d'une balise sporale. */
export const TERRITORY_BEACON_COST: ResourceBundle = {
  [ResourceType.SPORES]: 2_000,
  [ResourceType.BIOMASS]: 3_000,
  [ResourceType.MINERALS]: 1_500,
};
/** Bonus de production pour les membres de l'alliance dans un secteur contrôlé (%). */
export const TERRITORY_PRODUCTION_BONUS = 0.1;
/** Bonus de vitesse de flotte pour les membres dans un secteur contrôlé (%). */
export const TERRITORY_SPEED_BONUS = 0.05;
/** Durée de décroissance d'une balise non défendue (heures). */
export const TERRITORY_DECAY_HOURS = 72;
