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
  PlanetType,
  ResearchType,
  ResourceType,
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
  cost: ResourceBundle;
  baseTimeSeconds: number;
  cargo: number;
  speed: number;
  requiresNurseryLevel: number;
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
    description: 'Cultive les spores, vecteurs de savoir et d’expansion.',
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
    description: "La mémoire collective des Tisserands amplifie les esprits chercheurs.",
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
    description: 'Débloquer les 6 types de recherche (≥ niveau 1).',
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
    rewardText: 'Le cosmos entier s\'ouvre à votre essaimage.',
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
  { outcome: ExpeditionOutcome.RESOURCE_CACHE,    minRoll: 0,    maxRoll: 4999 },
  { outcome: ExpeditionOutcome.RARE_SPORES,       minRoll: 5000, maxRoll: 6499 },
  { outcome: ExpeditionOutcome.DERELICT_SHIP,     minRoll: 6500, maxRoll: 7499 },
  { outcome: ExpeditionOutcome.INCIDENT,          minRoll: 7500, maxRoll: 8499 },
  { outcome: ExpeditionOutcome.ANOMALY,           minRoll: 8500, maxRoll: 9099 },
  { outcome: ExpeditionOutcome.ANCIENT_ARCHIVE,   minRoll: 9100, maxRoll: 9499 },
  { outcome: ExpeditionOutcome.VOID_ECHO,         minRoll: 9500, maxRoll: 9799 },
  { outcome: ExpeditionOutcome.CONVERGENCE_BLOOM, minRoll: 9800, maxRoll: 9999 },
];

export const SHIPS: Record<ShipType, ShipConfig> = {
  [ShipType.SPORAL_SCOUT]: {
    type: ShipType.SPORAL_SCOUT,
    name: 'Éclaireur sporique',
    description: 'Organisme rapide dont les filaments sondent les anomalies galactiques.',
    cost: {
      [ResourceType.BIOMASS]: 250,
      [ResourceType.MINERALS]: 150,
      [ResourceType.SPORES]: 25,
    },
    baseTimeSeconds: 180,
    cargo: 100,
    speed: 10,
    requiresNurseryLevel: 1,
  },
  [ShipType.SYMBIOTIC_HARVESTER]: {
    type: ShipType.SYMBIOTIC_HARVESTER,
    name: 'Moissonneur symbiotique',
    description: 'Large organisme de collecte conçu pour ramener les découvertes.',
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
  },
  [ShipType.MYCELIAL_TENDRIL]: {
    type: ShipType.MYCELIAL_TENDRIL,
    name: 'Filament Mycélial',
    description: 'Filament ultra-rapide qui sonde les anomalies à la vitesse du spore.',
    cost: {
      [ResourceType.BIOMASS]: 150,
      [ResourceType.MINERALS]: 80,
      [ResourceType.SPORES]: 15,
    },
    baseTimeSeconds: 120,
    cargo: 50,
    speed: 20,
    requiresNurseryLevel: 1,
  },
  [ShipType.CHITIN_FREIGHTER]: {
    type: ShipType.CHITIN_FREIGHTER,
    name: 'Frégat de Chitine',
    description: 'Mastodonte de transport blindé par une carapace chitineuse.',
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
  },
  [ShipType.BIOLUMINESCENT_CRUISER]: {
    type: ShipType.BIOLUMINESCENT_CRUISER,
    name: 'Croiseur Bioluminescent',
    description: 'Organisme intermédiaire aux filaments phosphorescents, polyvalent et redoutable.',
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
  },
  [ShipType.SPOROGENESIS_TITAN]: {
    type: ShipType.SPOROGENESIS_TITAN,
    name: 'Titan Sporogenèse',
    description: 'Léviathan organique capable de transporter une civilisation entière entre les étoiles.',
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
  },
};

export const RESEARCHES: Record<ResearchType, ResearchConfig> = {
  [ResearchType.ADVANCED_PHOTOSYNTHESIS]: {
    type: ResearchType.ADVANCED_PHOTOSYNTHESIS,
    name: 'Photosynthèse avancée',
    description: '+5% de production d’énergie par niveau.',
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
    description: 'Permet l’essaimage vers de nouveaux mondes (+1 colonie/niveau).',
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
};
