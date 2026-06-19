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
  ExpeditionOutcome,
  GalacticEventType,
  NpcEncounterType,
  PlanetSpecialization,
  PlanetType,
  RaceType,
  ResearchType,
  RESEARCH_TYPES,
  ResourceType,
  ShipRole,
  ShipType,
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
}

export const ACHIEVEMENTS: Record<AchievementType, AchievementConfig> = {
  [AchievementType.FIRST_SPROUT]: {
    type: AchievementType.FIRST_SPROUT,
    name: 'Première Pousse',
    description: 'Améliorer un premier bâtiment.',
    rewardText: "L'éveil commence. Chapitre I débloqué.",
  },
  [AchievementType.RESEARCH_PIONEER]: {
    type: AchievementType.RESEARCH_PIONEER,
    name: 'Pionnier de la Recherche',
    description: 'Terminer une première recherche.',
    rewardText: 'Les souvenirs des Tisserands refluent.',
  },
  [AchievementType.COSMIC_TRAVELER]: {
    type: AchievementType.COSMIC_TRAVELER,
    name: 'Voyageur Cosmique',
    description: 'Lancer une première expédition.',
    rewardText: 'Le Réseau Mycélial attend.',
  },
  [AchievementType.COLONIAL_FUNGUS]: {
    type: AchievementType.COLONIAL_FUNGUS,
    name: 'Fonge Coloniale',
    description: 'Fonder une première colonie.',
    rewardText: "L'essaimage reprend. Chapitre II débloqué.",
  },
  [AchievementType.FLEET_COMMANDER]: {
    type: AchievementType.FLEET_COMMANDER,
    name: 'Commandant de Flotte',
    description: 'Posséder 10 vaisseaux au total.',
    rewardText: 'La flotte prend vie.',
  },
  [AchievementType.SPORE_MASTER]: {
    type: AchievementType.SPORE_MASTER,
    name: 'Maître des Spores',
    description: 'Atteindre Sporanges niveau 5.',
    rewardText: 'Les spores obéissent à votre volonté.',
  },
  [AchievementType.ANCIENT_DISCOVERY]: {
    type: AchievementType.ANCIENT_DISCOVERY,
    name: 'Découverte Ancienne',
    description: "Obtenir le résultat ANOMALIE lors d'une expédition.",
    rewardText: 'Un artefact des Tisserands trouvé. Chapitre III débloqué.',
  },
  [AchievementType.GALACTIC_HIVE]: {
    type: AchievementType.GALACTIC_HIVE,
    name: 'Ruche Galactique',
    description: 'Posséder 5 colonies.',
    rewardText: "L'empire organique prend forme.",
  },
  [AchievementType.MASTER_BUILDER]: {
    type: AchievementType.MASTER_BUILDER,
    name: 'Grand Architecte',
    description: 'Atteindre 50 niveaux de bâtiments au total.',
    rewardText: 'La mémoire architecturale est restaurée.',
  },
  [AchievementType.SCHOLAR]: {
    type: AchievementType.SCHOLAR,
    name: 'Érudit',
    description: `Débloquer les ${RESEARCH_TYPES.length} types de recherche (≥ niveau 1).`,
    rewardText: 'Toutes les branches du savoir sont explorées.',
  },
  [AchievementType.TITAN_BREEDER]: {
    type: AchievementType.TITAN_BREEDER,
    name: 'Éleveur de Titans',
    description: 'Posséder un Titan Sporogenèse.',
    rewardText: 'Le plus grand organisme interstellaire est né.',
  },
  [AchievementType.HUNDRED_SHIPS]: {
    type: AchievementType.HUNDRED_SHIPS,
    name: 'Centurion Stellaire',
    description: 'Posséder 100 vaisseaux au total.',
    rewardText: 'La flotte est une force de nature.',
  },
  [AchievementType.CONVERGENCE_HERALD]: {
    type: AchievementType.CONVERGENCE_HERALD,
    name: 'Héraut de la Convergence',
    description: '3 artefacts arborisiens récupérés.',
    rewardText: 'La Convergence se rapproche. Vitesse de recherche +15%.',
  },
  [AchievementType.EVENT_SURVIVOR]: {
    type: AchievementType.EVENT_SURVIVOR,
    name: 'Survivant',
    description: 'Traverser une Épidémie Mycotoxique.',
    rewardText: 'Ce qui ne tue pas rend plus fort.',
  },
  [AchievementType.DEEP_SPACE]: {
    type: AchievementType.DEEP_SPACE,
    name: 'Explorateur des Profondeurs',
    description: 'Lancer une expédition à distance ≥ 20.',
    rewardText: 'Les confins de la galaxie vous appellent.',
  },
  [AchievementType.RESOURCE_BARON]: {
    type: AchievementType.RESOURCE_BARON,
    name: 'Baron des Ressources',
    description: 'Stocker 100 000 Biomasse.',
    rewardText: "L'abondance organique est maîtrisée.",
  },
  [AchievementType.SPEED_BUILDER]: {
    type: AchievementType.SPEED_BUILDER,
    name: 'Bâtisseur Éclair',
    description: 'Construire un bâtiment en moins de 10 secondes.',
    rewardText: "Le temps n'a plus de prise sur vous.",
  },
  [AchievementType.PEACEFUL_EXPLORER]: {
    type: AchievementType.PEACEFUL_EXPLORER,
    name: 'Explorateur Pacifique',
    description: '50 expéditions sans incident.',
    rewardText: 'La chance sourit aux prudents.',
  },
  [AchievementType.SPORAL_SAGE]: {
    type: AchievementType.SPORAL_SAGE,
    name: 'Sage Sporique',
    description: 'Atteindre Propulsion Sporale niveau 10.',
    rewardText: "Le cosmos entier s'ouvre à votre essaimage.",
  },
  [AchievementType.THE_CONVERGENCE]: {
    type: AchievementType.THE_CONVERGENCE,
    name: 'La Convergence',
    description: 'Posséder 10 colonies actives.',
    rewardText: "Vous avez reconstitué l'empire des Tisserands. Titre : Tisserand Ressuscité.",
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

export const NPC_SPAWN_TARGET = 25;
export const NPC_SPAWN_INTERVAL_MS = 5 * 60 * 1_000;
export const NPC_SPAWN_WEIGHTS: Record<'easy' | 'medium' | 'hard' | 'elite', number> = {
  easy: 30,
  medium: 40,
  hard: 20,
  elite: 10,
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
