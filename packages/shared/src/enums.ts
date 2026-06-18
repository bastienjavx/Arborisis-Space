/**
 * Énumérations de domaine d'Arborisis.
 * Univers organique : ressources, bâtiments et recherches « vivants ».
 * Les valeurs string sont stables et persistées en base — ne pas les renommer
 * sans migration.
 */

/** Ressources stockables sur une planète. */
export enum ResourceType {
  /** Biomasse — matériau de construction primaire. */
  BIOMASS = 'BIOMASS',
  /** Sève — fluide vital, carburant des structures. */
  SAP = 'SAP',
  /** Minéraux — matériau structurel avancé. */
  MINERALS = 'MINERALS',
  /** Spores — monnaie de recherche et d'expansion. */
  SPORES = 'SPORES',
}

export const RESOURCE_TYPES = Object.values(ResourceType);

/** Types de bâtiments constructibles sur une planète. */
export enum BuildingType {
  /** Synthétiseur de Biomasse — produit de la biomasse. */
  BIOMASS_SYNTHESIZER = 'BIOMASS_SYNTHESIZER',
  /** Puits de Sève — produit de la sève. */
  SAP_WELL = 'SAP_WELL',
  /** Veine Minérale — extrait des minéraux. */
  MINERAL_VEIN = 'MINERAL_VEIN',
  /** Sporanges — cultive des spores. */
  SPORANGE = 'SPORANGE',
  /** Canopée Photosynthétique — produit de l'énergie (photosynthèse). */
  PHOTOSYNTHETIC_CANOPY = 'PHOTOSYNTHETIC_CANOPY',
  /** Vacuole de Stockage — augmente la capacité de stockage. */
  STORAGE_VACUOLE = 'STORAGE_VACUOLE',
  /** Noyau de Recherche — débloque et accélère la recherche. */
  RESEARCH_NEXUS = 'RESEARCH_NEXUS',
  /** Cœur Symbiotique — hub principal, réduit les temps de construction. */
  SYMBIOTIC_CORE = 'SYMBIOTIC_CORE',
  /** Berceau Orbital — produit les bio-vaisseaux. */
  ORBITAL_NURSERY = 'ORBITAL_NURSERY',
}

export const BUILDING_TYPES = Object.values(BuildingType);

/** Types de recherches (empire-wide, partagées entre toutes les planètes). */
export enum ResearchType {
  /** Photosynthèse avancée — augmente la production d'énergie. */
  ADVANCED_PHOTOSYNTHESIS = 'ADVANCED_PHOTOSYNTHESIS',
  /** Génie génétique — augmente la production de ressources. */
  GENETIC_ENGINEERING = 'GENETIC_ENGINEERING',
  /** Symbiose — améliore la stabilité écologique. */
  SYMBIOSIS = 'SYMBIOSIS',
  /** Terraformation — augmente le nombre d'emplacements planétaires. */
  TERRAFORMATION = 'TERRAFORMATION',
  /** Bio-ingénierie — prérequis des bâtiments avancés. */
  BIOENGINEERING = 'BIOENGINEERING',
  /** Propulsion sporale — débloque la colonisation (essaimage). */
  SPORAL_PROPULSION = 'SPORAL_PROPULSION',
}

export const RESEARCH_TYPES = Object.values(ResearchType);

/** Bio-vaisseaux disponibles dans le premier cycle d'exploration. */
export enum ShipType {
  SPORAL_SCOUT = 'SPORAL_SCOUT',
  SYMBIOTIC_HARVESTER = 'SYMBIOTIC_HARVESTER',
  MYCELIAL_TENDRIL = 'MYCELIAL_TENDRIL',
  CHITIN_FREIGHTER = 'CHITIN_FREIGHTER',
  BIOLUMINESCENT_CRUISER = 'BIOLUMINESCENT_CRUISER',
  SPOROGENESIS_TITAN = 'SPOROGENESIS_TITAN',
}

export const SHIP_TYPES = Object.values(ShipType);

/** Types de planètes avec bonus de production. */
export enum PlanetType {
  VERDANT = 'VERDANT',
  MINERAL = 'MINERAL',
  SAP_RICH = 'SAP_RICH',
  SPORE_NEBULA = 'SPORE_NEBULA',
  BARREN = 'BARREN',
}

export const PLANET_TYPES = Object.values(PlanetType);

/** Types d'événements galactiques périodiques. */
export enum GalacticEventType {
  SPORE_BLOOM = 'SPORE_BLOOM',
  STELLAR_STORM = 'STELLAR_STORM',
  ANCIENT_SIGNAL = 'ANCIENT_SIGNAL',
  MYCOTOXIN_OUTBREAK = 'MYCOTOXIN_OUTBREAK',
  CONVERGENCE_PULSE = 'CONVERGENCE_PULSE',
  VOID_RIFT = 'VOID_RIFT',
}

export const GALACTIC_EVENT_TYPES = Object.values(GalacticEventType);

/** Achievements débloquables par le joueur (20 médailles). */
export enum AchievementType {
  FIRST_SPROUT = 'FIRST_SPROUT',
  RESEARCH_PIONEER = 'RESEARCH_PIONEER',
  COSMIC_TRAVELER = 'COSMIC_TRAVELER',
  COLONIAL_FUNGUS = 'COLONIAL_FUNGUS',
  FLEET_COMMANDER = 'FLEET_COMMANDER',
  SPORE_MASTER = 'SPORE_MASTER',
  ANCIENT_DISCOVERY = 'ANCIENT_DISCOVERY',
  GALACTIC_HIVE = 'GALACTIC_HIVE',
  MASTER_BUILDER = 'MASTER_BUILDER',
  SCHOLAR = 'SCHOLAR',
  TITAN_BREEDER = 'TITAN_BREEDER',
  HUNDRED_SHIPS = 'HUNDRED_SHIPS',
  CONVERGENCE_HERALD = 'CONVERGENCE_HERALD',
  EVENT_SURVIVOR = 'EVENT_SURVIVOR',
  DEEP_SPACE = 'DEEP_SPACE',
  RESOURCE_BARON = 'RESOURCE_BARON',
  SPEED_BUILDER = 'SPEED_BUILDER',
  PEACEFUL_EXPLORER = 'PEACEFUL_EXPLORER',
  SPORAL_SAGE = 'SPORAL_SAGE',
  THE_CONVERGENCE = 'THE_CONVERGENCE',
}

export const ACHIEVEMENT_TYPES = Object.values(AchievementType);

export enum ExpeditionPhase {
  OUTBOUND = 'OUTBOUND',
  RETURNING = 'RETURNING',
  COMPLETED = 'COMPLETED',
}

export enum ExpeditionOutcome {
  RESOURCE_CACHE = 'RESOURCE_CACHE',
  RARE_SPORES = 'RARE_SPORES',
  DERELICT_SHIP = 'DERELICT_SHIP',
  INCIDENT = 'INCIDENT',
  ANOMALY = 'ANOMALY',
  ANCIENT_ARCHIVE = 'ANCIENT_ARCHIVE',
  VOID_ECHO = 'VOID_ECHO',
  CONVERGENCE_BLOOM = 'CONVERGENCE_BLOOM',
}

/** Nature d'un job temporisé (file de construction / recherche / essaimage). */
export enum JobKind {
  CONSTRUCTION = 'CONSTRUCTION',
  RESEARCH = 'RESEARCH',
  COLONIZATION = 'COLONIZATION',
  SHIP_PRODUCTION = 'SHIP_PRODUCTION',
}

/** Statut d'un job temporisé. */
export enum JobStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

/** Rôles utilisateur. */
export enum UserRole {
  PLAYER = 'PLAYER',
  ADMIN = 'ADMIN',
}
