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
  // ── Énergie & économie ──
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

  // ── Économie avancée ──
  /** Cycle des nutriments — augmente la production de biomasse. */
  NUTRIENT_CYCLING = 'NUTRIENT_CYCLING',
  /** Racines souterraines — augmente la production de sève. */
  SUBTERRANEAN_ROOTS = 'SUBTERRANEAN_ROOTS',
  /** Économie sporale — augmente la production de spores. */
  SPORAL_ECONOMY = 'SPORAL_ECONOMY',

  // ── Militaire ──
  /** Armure de chitine — augmente la défense des vaisseaux. */
  CHITIN_ARMOR = 'CHITIN_ARMOR',
  /** Guerre biologique — augmente l'attaque des vaisseaux. */
  BIOLOGICAL_WARFARE = 'BIOLOGICAL_WARFARE',
  /** Tactiques de essaim — améliore la vitesse des vaisseaux légers. */
  SWARM_TACTICS = 'SWARM_TACTICS',
  /** Grille défensive orbitale — renforce les défenses planétaires. */
  ORBITAL_DEFENSE_GRID = 'ORBITAL_DEFENSE_GRID',

  // ── Propulsion & renseignement ──
  /** Moteur hyperspore — augmente la vitesse de toute la flotte. */
  HYPERSPORE_DRIVE = 'HYPERSPORE_DRIVE',
  /** Mycologie des vers — réduit les temps de trajet intergalactiques. */
  WORMHOLE_MYCOLOGY = 'WORMHOLE_MYCOLOGY',
  /** Sens sporal — améliore la chance d'espionnage. */
  SPORE_SENSE = 'SPORE_SENSE',
  /** Scan profond — améliore la qualité des rapports d'espionnage. */
  DEEP_SCAN = 'DEEP_SCAN',
}

export const RESEARCH_TYPES = Object.values(ResearchType);

/** Rôle d'un vaisseau dans la flotte. */
export enum ShipRole {
  COMBAT = 'COMBAT',
  TRANSPORT = 'TRANSPORT',
  ESPIONAGE = 'ESPIONAGE',
  DEFENSE = 'DEFENSE',
  SUPPORT = 'SUPPORT',
}

/** Bio-vaisseaux disponibles dans le premier cycle d'exploration. */
export enum ShipType {
  // ── Civils / support ──
  SPORAL_SCOUT = 'SPORAL_SCOUT',
  SYMBIOTIC_HARVESTER = 'SYMBIOTIC_HARVESTER',
  MYCELIAL_TENDRIL = 'MYCELIAL_TENDRIL',
  CHITIN_FREIGHTER = 'CHITIN_FREIGHTER',
  BIOLUMINESCENT_CRUISER = 'BIOLUMINESCENT_CRUISER',
  SPOROGENESIS_TITAN = 'SPOROGENESIS_TITAN',

  // ── Militaires ──
  SPORAL_DRONE = 'SPORAL_DRONE',
  ACID_BOMBER = 'ACID_BOMBER',
  CHITIN_DESTROYER = 'CHITIN_DESTROYER',
  BIOMASS_DREADNOUGHT = 'BIOMASS_DREADNOUGHT',

  // ─é Spécialisés ──
  SEED_POD = 'SEED_POD',
  SHADOW_SPORE = 'SHADOW_SPORE',
  ORBITAL_THORN = 'ORBITAL_THORN',

  // ── Raciaux exclusifs ──
  SPORAL_SWARM = 'SPORAL_SWARM',
  LUMINOUS_WARDEN = 'LUMINOUS_WARDEN',
  CHITIN_BULWARK = 'CHITIN_BULWARK',
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

export enum NpcEncounterType {
  VOID_RIFT = 'VOID_RIFT',
  MYCOXIN_NEST = 'MYCOXIN_NEST',
  ABANDONED_DERELICT = 'ABANDONED_DERELICT',
}

export const NPC_ENCOUNTER_TYPES = Object.values(NpcEncounterType);

export enum PveMissionPhase {
  TRAVEL = 'TRAVEL',
  COMBAT = 'COMBAT',
  RETURNING = 'RETURNING',
  COMPLETED = 'COMPLETED',
}

export enum PvpMissionType {
  SPY = 'SPY',
  ATTACK = 'ATTACK',
}

export enum PvpMissionPhase {
  OUTBOUND = 'OUTBOUND',
  RETURNING = 'RETURNING',
  COMPLETED = 'COMPLETED',
}

export enum PvpOutcome {
  SUCCESS = 'SUCCESS',
  FAILURE = 'FAILURE',
  DRAW = 'DRAW',
}

export enum PveOutcome {
  VICTORY = 'VICTORY',
  DEFEAT = 'DEFEAT',
  RETREAT = 'RETREAT',
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

/** Rôles au sein d'une alliance. */
export enum AllianceRole {
  LEADER = 'LEADER',
  OFFICER = 'OFFICER',
  MEMBER = 'MEMBER',
}

export const ALLIANCE_ROLES = Object.values(AllianceRole);

/** Statut d'une candidature à une alliance. */
export enum ApplicationStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
}

export const APPLICATION_STATUSES = Object.values(ApplicationStatus);

/** Races jouables, chacune avec des bonus/malus et un vaisseau exclusif. */
export enum RaceType {
  /** Mycéliens — maîtres de la biomasse et de l'essaimage. */
  MYCELIANS = 'MYCELIANS',
  /** Photosynthex — experts en énergie et en recherche. */
  PHOTOSYNTHEX = 'PHOTOSYNTHEX',
  /** Chitinids — constructeurs défensifs et mineurs. */
  CHITINIDS = 'CHITINIDS',
}

export const RACE_TYPES = Object.values(RaceType);
