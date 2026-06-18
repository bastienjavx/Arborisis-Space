/**
 * Types de transport partagés (formes des réponses API).
 * Les montants de ressources sont toujours calculés et renvoyés par le serveur.
 */
import { ResourceBundle } from './constants';
import { BuildingType, JobKind, ResearchType, ResourceType, UserRole } from './enums';
import { UnmetRequirement } from './formulas';
import { Coordinates } from './schemas';

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  role: UserRole;
}

export interface ResourceState {
  /** Montants courants (recalculés serveur au moment de la requête). */
  amounts: Record<ResourceType, number>;
  /** Production nette par heure. */
  perHour: Record<ResourceType, number>;
  /** Capacité de stockage par ressource. */
  capacity: Record<ResourceType, number>;
  energyProduced: number;
  energyConsumed: number;
  energyRatio: number;
  stability: number;
}

export interface BuildingView {
  type: BuildingType;
  name: string;
  description: string;
  level: number;
  nextLevelCost: ResourceBundle;
  nextLevelTimeSeconds: number;
  /** Production/heure au niveau actuel (0 si non producteur). */
  currentProduction: number;
  canAfford: boolean;
  unmet: UnmetRequirement[];
}

export interface ResearchView {
  type: ResearchType;
  name: string;
  description: string;
  level: number;
  nextLevelCost: ResourceBundle;
  nextLevelTimeSeconds: number;
  canAfford: boolean;
  unmet: UnmetRequirement[];
}

export interface JobView {
  id: string;
  kind: JobKind;
  /** BuildingType | ResearchType selon le type ; null pour colonisation. */
  targetType: string | null;
  targetLevel: number | null;
  startedAt: string;
  finishesAt: string;
}

export interface PlanetSummary {
  id: string;
  name: string;
  coordinates: Coordinates;
  isHomeworld: boolean;
  usedFields: number;
  maxFields: number;
}

export interface PlanetDetail extends PlanetSummary {
  resources: ResourceState;
  buildings: BuildingView[];
  /** Job de construction en cours sur cette planète (le cas échéant). */
  constructionJob: JobView | null;
}

export interface ResearchOverview {
  /** Recherche en cours (empire-wide), le cas échéant. */
  activeJob: JobView | null;
  researches: ResearchView[];
}

export interface GalaxySlot {
  coordinates: Coordinates;
  occupied: boolean;
  planetName: string | null;
  ownerName: string | null;
  isOwn: boolean;
}

export interface GalaxySystemView {
  galaxy: number;
  system: number;
  slots: GalaxySlot[];
}
