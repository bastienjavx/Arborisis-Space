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

  // ── Recycleur (récolte les champs de débris) ──
  BIO_RECYCLER = 'BIO_RECYCLER',
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
  FUNGAL_HIVEMIND = 'FUNGAL_HIVEMIND',
  VOID_LEVIATHAN = 'VOID_LEVIATHAN',
  CRYSTALLINE_GUARDIAN = 'CRYSTALLINE_GUARDIAN',
  BIOMASS_CORRUPTED = 'BIOMASS_CORRUPTED',
  ANCIENT_SENTINEL = 'ANCIENT_SENTINEL',
  CHITIN_WARLORD = 'CHITIN_WARLORD',
  SPORAL_PARASITE = 'SPORAL_PARASITE',
  MYCOSPORE_SWARM = 'MYCOSPORE_SWARM',
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
  MODERATOR = 'MODERATOR',
  ADMIN = 'ADMIN',
}

/** Visibilité d'un message de chat. */
export enum ChatScope {
  GLOBAL = 'GLOBAL',
  ALLIANCE = 'ALLIANCE',
  PRIVATE = 'PRIVATE',
}

/** Actions conservées dans le journal de modération. */
export enum ModerationActionType {
  DELETE_MESSAGE = 'DELETE_MESSAGE',
  MUTE = 'MUTE',
  UNMUTE = 'UNMUTE',
  ROLE_CHANGE = 'ROLE_CHANGE',
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

/** Statut d'un univers de jeu. */
export enum UniverseStatus {
  ACTIVE = 'ACTIVE',
  PROVISIONING = 'PROVISIONING',
  CLOSED = 'CLOSED',
  FAILED = 'FAILED',
}

export const UNIVERSE_STATUSES = Object.values(UniverseStatus);

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

/** Statut d'une saison de classement. */
export enum SeasonStatus {
  ACTIVE = 'ACTIVE',
  CLOSED = 'CLOSED',
}

/** Portée d'une récompense de saison (classement individuel ou d'alliance). */
export enum SeasonRewardScope {
  PLAYER = 'PLAYER',
  ALLIANCE = 'ALLIANCE',
}

/** Spécialisation d'une planète — confère des bonus/malus ciblés. */
export enum PlanetSpecialization {
  PRODUCTION = 'PRODUCTION',
  MILITARY = 'MILITARY',
  RESEARCH = 'RESEARCH',
  FORTRESS = 'FORTRESS',
}

export const PLANET_SPECIALIZATIONS = Object.values(PlanetSpecialization);

// ═══════════════════════════════════════════════════════════════════
// Économie joueur : objets, marché, artisanat, routes commerciales
// ═══════════════════════════════════════════════════════════════════

/** Clés stables des objets échangeables. Ne jamais renommer sans migration. */
export enum ItemKey {
  // ── Matières premières (drop PvE / expéditions) ──
  MYCELIAL_FIBER = 'MYCELIAL_FIBER',
  BIOLUMINESCENT_GEL = 'BIOLUMINESCENT_GEL',
  CHITIN_SHARD = 'CHITIN_SHARD',
  SPORE_ESSENCE = 'SPORE_ESSENCE',
  VOID_CRYSTAL = 'VOID_CRYSTAL',
  ANCIENT_FRAGMENT = 'ANCIENT_FRAGMENT',

  // ── Objets traités (artisanat) ──
  REINFORCED_CHITIN = 'REINFORCED_CHITIN',
  CRYSTALLIZED_SAP = 'CRYSTALLIZED_SAP',
  NEURAL_MATRIX = 'NEURAL_MATRIX',
  VOID_ALLOY = 'VOID_ALLOY',
  MYCOTOXIN_VIAL = 'MYCOTOXIN_VIAL',
  CONVERGENCE_SHARD = 'CONVERGENCE_SHARD',
}

export const ITEM_KEYS = Object.values(ItemKey);

/** Rareté d'un objet — détermine sa valeur indicative et sa fréquence de drop. */
export enum ItemRarity {
  COMMON = 'COMMON',
  UNCOMMON = 'UNCOMMON',
  RARE = 'RARE',
  EPIC = 'EPIC',
  LEGENDARY = 'LEGENDARY',
}

/** Catégorie d'un objet. */
export enum ItemCategory {
  RAW_MATERIAL = 'RAW_MATERIAL',
  PROCESSED = 'PROCESSED',
}

/** Côté d'un ordre de marché. */
export enum MarketOrderSide {
  BUY = 'BUY',
  SELL = 'SELL',
}

/** Statut d'un ordre de marché. */
export enum MarketOrderStatus {
  OPEN = 'OPEN',
  PARTIALLY_FILLED = 'PARTIALLY_FILLED',
  FILLED = 'FILLED',
  CANCELLED = 'CANCELLED',
}

/** Statut d'une route commerciale automatisée. */
export enum TradeRouteStatus {
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  INSUFFICIENT_SHIPS = 'INSUFFICIENT_SHIPS',
}

/** Statut d'une ligne de production automatique. */
export enum ProductionLineStatus {
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  INPUT_SHORTAGE = 'INPUT_SHORTAGE',
}

/** Type de notification en jeu. */
export enum NotificationType {
  CONSTRUCTION_COMPLETE = 'CONSTRUCTION_COMPLETE',
  RESEARCH_COMPLETE = 'RESEARCH_COMPLETE',
  EXPEDITION_RETURNED = 'EXPEDITION_RETURNED',
  COLONIZATION_COMPLETE = 'COLONIZATION_COMPLETE',
  ATTACK_INCOMING = 'ATTACK_INCOMING',
  ATTACK_REPORT = 'ATTACK_REPORT',
  SHIP_PRODUCED = 'SHIP_PRODUCED',
  TRADE_ROUTE_RUN = 'TRADE_ROUTE_RUN',
  ACHIEVEMENT_UNLOCKED = 'ACHIEVEMENT_UNLOCKED',
  DAILY_REWARD_AVAILABLE = 'DAILY_REWARD_AVAILABLE',
  MARKET_ORDER_FILLED = 'MARKET_ORDER_FILLED',
  PVE_COMPLETE = 'PVE_COMPLETE',
  DEBRIS_FIELD_APPEARED = 'DEBRIS_FIELD_APPEARED',
  DEBRIS_COLLECTED = 'DEBRIS_COLLECTED',
  COMMANDER_LEVELED_UP = 'COMMANDER_LEVELED_UP',
  MOON_CREATED = 'MOON_CREATED',
  TERRITORY_CLAIMED = 'TERRITORY_CLAIMED',
  TERRITORY_ATTACKED = 'TERRITORY_ATTACKED',
  DEFENSE_UNDER_ATTACK = 'DEFENSE_UNDER_ATTACK',
}

/** Statut d'une relation diplomatique entre alliances. */
export enum DiplomaticStatus {
  WAR = 'WAR',
  NON_AGGRESSION_PACT = 'NON_AGGRESSION_PACT',
  TRADE_ALLIANCE = 'TRADE_ALLIANCE',
}

/** Statut d'une offre diplomatique. */
export enum DiplomaticOfferStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  WITHDRAWN = 'WITHDRAWN',
  EXPIRED = 'EXPIRED',
}

// ═══════════════════════════════════════════════════════════════════
// Commandants Symbiotiques (Rise of Kingdoms)
// ═══════════════════════════════════════════════════════════════════

/** Types de commandants recrutables. */
export enum CommanderType {
  // ── Combat ──
  MYCO_WARLORD = 'MYCO_WARLORD',           // Mycélien offensif, maître de l'essaim
  CHITIN_GUARDIAN = 'CHITIN_GUARDIAN',     // Défenseur blindé, boost défenses orbitales
  VOID_REAPER = 'VOID_REAPER',             // Pillard du vide, bonus de pillage PvP
  SPORE_STORM = 'SPORE_STORM',             // Spécialiste raids, vitesse de flotte
  // ── Économie ──
  SYMBIONT_SAGE = 'SYMBIONT_SAGE',         // Maître de la recherche, réduit temps de recherche
  ROOT_WEAVER = 'ROOT_WEAVER',             // Expert agricole, boost production de ressources
  FUNGAL_MERCHANT = 'FUNGAL_MERCHANT',     // Négociant, réduit taxes marché, boost routes
  CANOPY_ARCHITECT = 'CANOPY_ARCHITECT',  // Bâtisseur, réduit temps de construction
  // ── Expédition ──
  VOID_NAVIGATOR = 'VOID_NAVIGATOR',       // Explorateur, boost résultats d'expédition
  SPORE_ORACLE = 'SPORE_ORACLE',           // Espion légendaire, boost espionnage
  // ── Alliance ──
  HIVE_HERALD = 'HIVE_HERALD',             // Leader diplomatique, bonus d'alliance
  ANCIENT_SYMBIONT = 'ANCIENT_SYMBIONT',  // Commandant légendaire universel
}

export const COMMANDER_TYPES = Object.values(CommanderType);

/** Rareté d'un commandant — détermine ses stats de base et sa capacité max de talents. */
export enum CommanderRarity {
  COMMON = 'COMMON',
  UNCOMMON = 'UNCOMMON',
  RARE = 'RARE',
  EPIC = 'EPIC',
  LEGENDARY = 'LEGENDARY',
}

/** Branches de talent d'un commandant. */
export enum CommanderTalentBranch {
  COMBAT = 'COMBAT',           // Attaque, défense, rapid-fire
  GATHERING = 'GATHERING',     // Collecte de ressources, expéditions
  CONSTRUCTION = 'CONSTRUCTION', // Vitesse de construction, coût des bâtiments
  RESEARCH = 'RESEARCH',       // Vitesse de recherche, coût des recherches
  LEADERSHIP = 'LEADERSHIP',   // Bonus d'alliance, vitesse de flotte, multi-queues
}

/** Statut d'un commandant. */
export enum CommanderStatus {
  IDLE = 'IDLE',
  ON_FLEET = 'ON_FLEET',
  ASSIGNED_TO_PLANET = 'ASSIGNED_TO_PLANET',
}

// ═══════════════════════════════════════════════════════════════════
// Lunes Organiques + Débris (OGame)
// ═══════════════════════════════════════════════════════════════════

/** Bâtiments construisibles sur une lune organique. */
export enum MoonBuildingType {
  LUNAR_CORE = 'LUNAR_CORE',               // Hub de la lune, nécessaire pour tout
  SPORE_PHALANX = 'SPORE_PHALANX',         // Détecte les flottes ennemies en transit
  BIO_JUMP_GATE = 'BIO_JUMP_GATE',         // Téléportation instantanée inter-lunes
  LUNAR_NURSERY = 'LUNAR_NURSERY',         // Produit des vaisseaux depuis la lune
  CRYSTALLINE_SILO = 'CRYSTALLINE_SILO',   // Stockage supplémentaire sur la lune
}

export const MOON_BUILDING_TYPES = Object.values(MoonBuildingType);

// ═══════════════════════════════════════════════════════════════════
// Territoire d'Alliance (Rise of Kingdoms)
// ═══════════════════════════════════════════════════════════════════

/** Statut d'un secteur de territoire d'alliance. */
export enum AllianceTerritoryStatus {
  NEUTRAL = 'NEUTRAL',
  CLAIMED = 'CLAIMED',
  CONTESTED = 'CONTESTED',
}

/** Statut d'une balise sporale. */
export enum BeaconStatus {
  ACTIVE = 'ACTIVE',
  DECAYING = 'DECAYING',
  DESTROYED = 'DESTROYED',
}

// ═══════════════════════════════════════════════════════════════════
// Population / Main-d'œuvre (Prosperous Universe)
// ═══════════════════════════════════════════════════════════════════

/** Niveau de qualification des travailleurs Symbiotes. */
export enum WorkerTier {
  BASIC = 'BASIC',     // Bâtiments niveaux 1-4
  SKILLED = 'SKILLED', // Bâtiments niveaux 5-9
  EXPERT = 'EXPERT',   // Bâtiments niveau 10+
}

// ═══════════════════════════════════════════════════════════════════
// Défenses Orbitales (OGame)
// ═══════════════════════════════════════════════════════════════════

/** Structures défensives orbitales fixes sur une planète. */
export enum DefenseType {
  ION_CANNON = 'ION_CANNON',             // Canon ionique — défense légère polyvalente
  SPORE_NET = 'SPORE_NET',               // Filet sporale — ralentit les flottes d'assaut
  SHIELD_MEMBRANE = 'SHIELD_MEMBRANE',   // Membrane bouclier — absorbe les premiers tirs
  MYCELIAL_TURRET = 'MYCELIAL_TURRET',   // Tourelle mycélienne — haute cadence de tir
  VOID_LANCE = 'VOID_LANCE',             // Lance du Vide — anti-gros vaisseaux
  ORBITAL_THORN_BED = 'ORBITAL_THORN_BED', // Lit d'épines orbitales — dégâts de zone
}

export const DEFENSE_TYPES = Object.values(DefenseType);
