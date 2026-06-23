/**
 * Types de transport partagés (formes des réponses API).
 * Les montants de ressources sont toujours calculés et renvoyés par le serveur.
 */
import { ResourceBundle } from './constants';
import {
  AchievementType,
  AllianceRole,
  ApplicationStatus,
  BuildingType,
  ChatScope,
  ExpeditionOutcome,
  ExpeditionPhase,
  GalacticEventType,
  ItemCategory,
  ItemKey,
  ItemRarity,
  JobKind,
  MarketOrderSide,
  MarketOrderStatus,
  NpcEncounterType,
  PlanetSpecialization,
  PlanetType,
  PveMissionPhase,
  PveOutcome,
  PvpMissionPhase,
  PvpMissionType,
  PvpOutcome,
  RaceType,
  ResearchType,
  ResourceType,
  SeasonRewardScope,
  ShipRole,
  ShipType,
  TradeRouteStatus,
  UniverseStatus,
  UserRole,
  ModerationActionType,
} from './enums';
import { UnmetRequirement } from './formulas';
import { Coordinates, type ExpeditionShipType } from './schemas';

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  role: UserRole;
  race: RaceType;
  universeId: string | null;
  displayName: string | null;
  bannerColor: string | null;
  avatarSeed: string | null;
  totpEnabled: boolean;
  title: string | null;
}

export interface PublicProfile {
  id: string;
  username: string;
  displayName: string | null;
  race: RaceType;
  bannerColor: string;
  bio: string | null;
  allianceTag: string | null;
  allianceName: string | null;
  colonies: number;
  totalShips: number;
  score: number;
  title: string | null;
}

export interface ChatAuthorView {
  id: string;
  username: string;
  displayName: string | null;
  role: UserRole;
  race: RaceType;
  bannerColor: string | null;
  title: string | null;
}

export interface ChatMessageView {
  id: string;
  scope: ChatScope;
  content: string;
  author: ChatAuthorView;
  recipientId: string | null;
  allianceId: string | null;
  createdAt: string;
  deletedAt: string | null;
}

export interface ChatContactView extends ChatAuthorView {
  mutedUntil: string | null;
}

export interface AdminUserView extends ChatContactView {
  email: string;
  createdAt: string;
}

export interface ModerationActionView {
  id: string;
  action: ModerationActionType;
  moderator: Pick<ChatAuthorView, 'id' | 'username' | 'displayName'>;
  target: Pick<ChatAuthorView, 'id' | 'username' | 'displayName'> | null;
  messageId: string | null;
  reason: string | null;
  createdAt: string;
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
  ecologicalStability: number;
  stabilityMaximum: number;
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
  currentEnergyConsumption: number;
  productionIntensity: number;
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
  planetType: PlanetType;
  specialization: PlanetSpecialization | null;
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
  planetId: string | null;
  planetName: string | null;
  ownerName: string | null;
  isOwn: boolean;
}

export interface GalaxySystemView {
  galaxy: number;
  system: number;
  slots: GalaxySlot[];
}

export interface ShipView {
  type: ShipType;
  name: string;
  description: string;
  role: ShipRole;
  available: number;
  cost: ResourceBundle;
  productionTimeSeconds: number;
  cargo: number;
  speed: number;
  requiredNurseryLevel: number;
  unlocked: boolean;
  canAfford: boolean;
}

export interface ShipProductionJobView extends JobView {
  shipType: ShipType;
  quantity: number;
}

export interface FleetOverview {
  ships: ShipView[];
  productionJob: ShipProductionJobView | null;
}

export interface ExpeditionView {
  id: string;
  planetId: string;
  source: Coordinates;
  target: Pick<Coordinates, 'galaxy' | 'system'>;
  phase: ExpeditionPhase;
  ships: Record<ExpeditionShipType, number>;
  arrivesAt: string;
  returnsAt: string;
}

export interface ExpeditionReportView {
  id: string;
  missionId: string;
  outcome: ExpeditionOutcome;
  rulesetVersion: number;
  roll: number;
  rewards: Record<ResourceType, number>;
  losses: Record<ExpeditionShipType, number>;
  overflow: Record<ResourceType, number>;
  isRead: boolean;
  occurredAt: string;
  returnedAt: string | null;
}

export interface LeaderboardEntry {
  rank: number;
  username: string;
  score: number;
  colonies: number;
  ships: number;
  lastActive: string;
  /** Titre cosmétique courant (saison/succès), le cas échéant. */
  title: string | null;
}

export interface AllianceLeaderboardEntry {
  rank: number;
  tag: string;
  name: string;
  bannerColor: string;
  memberCount: number;
  score: number;
}

export interface SeasonView {
  index: number;
  startedAt: string;
  endsAt: string;
}

export interface SeasonRewardView {
  id: string;
  scope: SeasonRewardScope;
  seasonIndex: number;
  rank: number;
  score: number;
  title: string | null;
  reward: ResourceBundle;
}

export interface SeasonOverview {
  current: SeasonView | null;
  /** Récompenses de saison non encore réclamées par le joueur. */
  unclaimedRewards: SeasonRewardView[];
}

export interface ActiveEventView {
  type: GalacticEventType;
  name: string;
  effectDescription: string;
  endsAt: string;
}

export interface AchievementView {
  type: AchievementType;
  name: string;
  description: string;
  rewardText: string;
  /** Butin concret crédité au déblocage. */
  reward: ResourceBundle;
  unlockedAt: string | null;
  /** Progression calculée par le serveur. */
  progress: number;
  target: number;
  progressLabel: string;
}

export interface QuestView {
  id: string;
  name: string;
  description: string;
  order: number;
  reward: ResourceBundle;
  progress: number;
  target: number;
  /** Objectif atteint (réclamable si pas encore réclamé). */
  completed: boolean;
  claimedAt: string | null;
}

export interface QuestsOverview {
  /** Première quête non réclamée — mise en avant dans l'UI. */
  active: QuestView | null;
  quests: QuestView[];
  claimableCount: number;
}

export interface AbsenceSummaryView {
  /** Afficher le résumé ? (faux si absence trop courte ou rien à signaler). */
  show: boolean;
  /** Durée d'absence en secondes depuis la dernière session vue. */
  awaySeconds: number;
  /** Estimation des ressources produites pendant l'absence (cappée au stockage). */
  producedResources: Record<ResourceType, number>;
  completedJobs: {
    construction: number;
    research: number;
    ships: number;
    colonization: number;
  };
  /** Expéditions revenues pendant l'absence. */
  expeditionsReturned: number;
  /** Raids PvE achevés pendant l'absence. */
  pveResolved: number;
  /** Attaques subies sur vos planètes pendant l'absence. */
  attacksSuffered: number;
}

export interface DailyRewardView {
  /** Le joueur peut-il réclamer maintenant (≥ 24h depuis la dernière fois) ? */
  canClaim: boolean;
  /** Série courante (nombre de jours consécutifs réclamés). */
  streak: number;
  /** Index [0..6] du jour réclamable dans le cycle. */
  dayIndex: number;
  /** Butin du jour réclamable. */
  todayReward: ResourceBundle;
  /** Cycle complet de 7 jours (pour affichage). */
  cycle: ResourceBundle[];
  /** Date de réclamation possible suivante (ISO), null si réclamable maintenant. */
  nextClaimAt: string | null;
}

export interface AllianceView {
  id: string;
  tag: string;
  name: string;
  description: string | null;
  bannerColor: string;
  leaderId: string;
  memberCount: number;
  totalScore: number;
}

export interface AllianceMemberView {
  userId: string;
  username: string;
  displayName: string | null;
  race: RaceType;
  role: AllianceRole;
  joinedAt: string;
}

export interface AllianceApplicationView {
  id: string;
  userId: string;
  username: string;
  message: string | null;
  status: ApplicationStatus;
  createdAt: string;
}

export interface AllianceDetailView extends AllianceView {
  members: AllianceMemberView[];
  applications?: AllianceApplicationView[];
}

export interface NpcEncounterView {
  id: string;
  type: NpcEncounterType;
  coordinates: Coordinates;
  difficulty: number;
  health: number;
  maxHealth: number;
  rewards: ResourceBundle;
  expiresAt: string;
}

export interface PveResultView {
  outcome: PveOutcome;
  lostShips: Record<ShipType, number>;
  rewards: ResourceBundle;
}

export interface PveMissionView {
  id: string;
  phase: PveMissionPhase;
  encounter: NpcEncounterView;
  sourcePlanetId: string;
  ships: Record<ShipType, number>;
  travelArrivesAt: string;
  combatEndsAt: string;
  returnsAt: string;
  result?: PveResultView;
}

export interface SpyReportView {
  targetPlanetId: string;
  resources: Record<ResourceType, number>;
  buildings: Partial<Record<BuildingType, number>>;
  fleet: Record<ShipType, number>;
  defenses: Record<ShipType, number>;
  defensePower: number;
}

export interface PvpMissionResultView {
  outcome: PvpOutcome;
  loot?: Record<ResourceType, number>;
  lostShips: Record<ShipType, number>;
  defenderLosses?: Record<ShipType, number>;
  report?: SpyReportView;
}

export interface PvpMissionView {
  id: string;
  type: PvpMissionType;
  source: Coordinates;
  target: Coordinates;
  phase: PvpMissionPhase;
  ships: Record<ShipType, number>;
  arrivesAt: string;
  returnsAt: string;
  result?: PvpMissionResultView;
}

export interface PvpReportView extends PvpMissionView {
  completedAt: string;
  targetName: string;
}

export interface PveReportView extends PveMissionView {
  completedAt: string;
}

export interface IncomingAttackView {
  id: string;
  type: PvpMissionType;
  attackerName: string;
  sourcePlanet: Coordinates;
  targetPlanet: { id: string; name: string; coordinates: Coordinates };
  arrivesAt: string;
}

export interface UniverseSummaryView {
  id: string;
  slug: string;
  name: string;
  playerCount: number;
  maxPlayers: number;
  status: UniverseStatus;
}

export interface UniverseView extends UniverseSummaryView {
  internalApiUrl: string;
  createdAt: string;
}

export type ListUniversesView = UniverseSummaryView[];

export interface ResourceTransferMissionView {
  id: string;
  sourcePlanetId: string;
  sourcePlanetName: string;
  targetPlanetId: string;
  targetPlanetName: string;
  ships: Record<ShipType, number>;
  resources: Record<ResourceType, number>;
  arrivesAt: string;
}

// ═══════════════════════════════════════════════════════════════════
// Économie joueur : inventaire, marché, artisanat, routes
// ═══════════════════════════════════════════════════════════════════

export interface ItemDropView {
  itemKey: ItemKey;
  quantity: number;
}

export interface InventorySlotView {
  itemKey: ItemKey;
  quantity: number;
  planetId: string;
  planetName: string;
}

export interface MarketOrderView {
  id: string;
  itemKey: ItemKey;
  side: MarketOrderSide;
  status: MarketOrderStatus;
  pricePerUnit: number;
  quantity: number;
  filledQuantity: number;
  createdAt: string;
  expiresAt: string | null;
  ownerUsername: string;
  isOwn: boolean;
}

export interface MarketTradeView {
  id: string;
  itemKey: ItemKey;
  price: number;
  quantity: number;
  executedAt: string;
  isBuyer: boolean;
  isSeller: boolean;
}

export interface OhlcvCandleView {
  openTime: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface OrderBookView {
  bids: { price: number; quantity: number; total: number }[];
  asks: { price: number; quantity: number; total: number }[];
  lastPrice: number | null;
  change24h: number | null;
  volume24h: number;
  high24h: number | null;
  low24h: number | null;
}

export interface CraftingJobView {
  id: string;
  recipeId: string;
  outputKey: ItemKey;
  outputQty: number;
  quantity: number;
  planetId: string;
  planetName: string;
  startedAt: string;
  completesAt: string;
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
}

export interface TradeRouteView {
  id: string;
  fromPlanetId: string;
  fromPlanetName: string;
  toPlanetId: string;
  toPlanetName: string;
  itemKey: ItemKey | null;
  resource: ResourceType | null;
  quantityPerRun: number;
  shipType: ShipType;
  shipCount: number;
  intervalHours: number;
  status: TradeRouteStatus;
  lastRunAt: string | null;
  nextRunAt: string | null;
}


export interface MarketSummaryView {
  itemKey: ItemKey;
  lastPrice: number | null;
  change24h: number | null;
  volume24h: number;
  bestBid: number | null;
  bestAsk: number | null;
}
