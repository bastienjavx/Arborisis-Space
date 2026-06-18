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

/** Nature d'un job temporisé (file de construction / recherche / essaimage). */
export enum JobKind {
  CONSTRUCTION = 'CONSTRUCTION',
  RESEARCH = 'RESEARCH',
  COLONIZATION = 'COLONIZATION',
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
