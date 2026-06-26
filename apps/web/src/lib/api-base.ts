import type {
  AddToQueueDto,
  AllianceApplicationView,
  AllianceDetailView,
  AllianceView,
  ApplyAllianceDto,
  AttackEncounterDto,
  AttackPlanetDto,
  AuthUser,
  AdminUserView,
  BuildBuildingDto,
  ColonizeDto,
  ConstructionQueueItemView,
  CreateAllianceDto,
  CreateDiplomaticOfferDto,
  CreateFleetPresetDto,
  CreateTradeRouteDto,
  DecideApplicationDto,
  DiplomaticOfferView,
  DiplomaticRelationView,
  EmpireOverview,
  EngagementOverview,
  FleetPresetView,
  GalaxySystemView,
  FleetOverview,
  ExpeditionView,
  ExpeditionReportView,
  IncomingAttackView,
  InventorySlotView,
  ItemKey,
  JobView,
  ListUniversesView,
  MarketOrderView,
  MarketSummaryView,
  MarketTradeView,
  NotificationView,
  NpcEncounterView,
  OhlcvCandleView,
  OrderBookView,
  PlanetDetail,
  PlanetSummary,
  PlaceMarketOrderDto,
  PublicProfile,
  PveMissionView,
  PveReportView,
  PvpMissionView,
  PvpReportView,
  RenamePlanetDto,
  ResearchOverview,
  ResourceTransferMissionView,
  StartCraftingDto,
  StartResearchDto,
  ProduceShipsDto,
  CreateProductionLineDto,
  SetSpecializationDto,
  SetProductionIntensitiesDto,
  SpyPlanetDto,
  StartExpeditionDto,
  ShipProductionJobView,
  CraftingJobView,
  CraftingRecipeConfig,
  ProductionLineView,
  UnreadCountView,
  UpdateProductionLineDto,
  TradeRouteView,
  TradeRouteStatus,
  LeaderboardEntry,
  AllianceLeaderboardEntry,
  SeasonOverview,
  ActiveEventView,
  AchievementView,
  QuestsOverview,
  ClaimQuestDto,
  DailyRewardView,
  DailyQuestsOverview,
  AbsenceSummaryView,
  TransferResourcesDto,
  UpdateProfileDto,
  ChatContactView,
  ChatMessageView,
  ChatScope,
  ChangeUserRoleDto,
  ModerateUserDto,
  ModerationActionView,
  SendChatMessageDto,
  CommanderView,
  CommandersOverview,
  CommanderType,
  CommanderTalentBranch,
  PlanetDefensesView,
  DefenseType,
  DebrisFieldView,
  MoonView,
  MoonBuildingType,
} from '@arborisis/shared';

export const BASE = '/api';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function parseError(res: Response): Promise<string> {
  try {
    const body = await res.json();
    if (typeof body?.message === 'string') return body.message;
    if (Array.isArray(body?.message)) return body.message.join(', ');
    if (Array.isArray(body?.errors)) {
      return body.errors.map((e: { message: string }) => e.message).join(', ');
    }
  } catch {
    /* ignore */
  }
  return `Erreur ${res.status}`;
}

export interface RequestOptions {
  method?: string;
  body?: unknown;
  /** Empêche la tentative de refresh (utilisé par les routes d'auth). */
  noRefresh?: boolean;
  _retried?: boolean;
  timeoutMs?: number;
}

export function buildRequest(
  path: string,
  opts: RequestOptions,
): { url: string; init: RequestInit } {
  return {
    url: `${BASE}${path}`,
    init: {
      method: opts.method ?? 'GET',
      credentials: 'include',
      headers: opts.body ? { 'Content-Type': 'application/json' } : undefined,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      cache: 'no-store',
    },
  };
}

export async function requestBase<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { url, init } = buildRequest(path, opts);
  const res = await fetch(url, init);

  if (!res.ok) throw new ApiError(res.status, await parseError(res));
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export type RequestFn = <T>(path: string, opts?: RequestOptions) => Promise<T>;

export function createApi(request: RequestFn) {
  return {
    // ── Auth ──
    register: (body: {
      email: string;
      username: string;
      password: string;
      race: string;
      universeId?: string;
    }) =>
      request<{ pending: true; email: string }>('/auth/register', {
        method: 'POST',
        body,
        noRefresh: true,
      }),
    login: (body: { email: string; password: string }) =>
      request<{ user: AuthUser }>('/auth/login', { method: 'POST', body, noRefresh: true }),
    verifyEmail: (token: string) =>
      request<{ user: AuthUser }>('/auth/verify-email', {
        method: 'POST',
        body: { token },
        noRefresh: true,
      }),
    resendVerification: (email: string) =>
      request<{ sent: true }>('/auth/resend-verification', {
        method: 'POST',
        body: { email },
        noRefresh: true,
      }),
    forgotPassword: (email: string) =>
      request<{ sent: true }>('/auth/forgot-password', {
        method: 'POST',
        body: { email },
        noRefresh: true,
      }),
    resetPassword: (token: string, password: string) =>
      request<{ success: true }>('/auth/reset-password', {
        method: 'POST',
        body: { token, password },
        noRefresh: true,
      }),
    loginWith2fa: (tempToken: string, code: string) =>
      request<{ user: AuthUser }>('/auth/login/2fa', {
        method: 'POST',
        body: { tempToken, code },
        noRefresh: true,
      }),
    setup2fa: () =>
      request<{ secret: string; qrCodeDataUrl: string; otpauthUrl: string }>('/auth/2fa/setup', {
        method: 'POST',
      }),
    enable2fa: (code: string) =>
      request<{ success: true }>('/auth/2fa/enable', { method: 'POST', body: { code } }),
    disable2fa: (code: string) =>
      request<{ success: true }>('/auth/2fa/disable', { method: 'POST', body: { code } }),
    logout: () => request<{ success: true }>('/auth/logout', { method: 'POST' }),
    logoutAll: () => request<{ success: true }>('/auth/logout-all', { method: 'POST' }),
    me: () => request<{ user: AuthUser }>('/auth/me'),

    // ── Univers ──
    universes: () => request<ListUniversesView>('/universes'),
    resolveUniverse: (id: string) =>
      request<{ internalApiUrl: string }>(`/universes/${id}/resolve`),

    // ── Profil ──
    updateProfile: (body: UpdateProfileDto) =>
      request<{ user: AuthUser }>('/users/me', { method: 'PATCH', body }),
    publicProfile: (id: string) => request<PublicProfile>(`/users/${id}/profile`),

    // ── Chat ──
    chatMessages: (scope: ChatScope, peerId?: string) =>
      request<ChatMessageView[]>(
        `/chat/messages?scope=${scope}${peerId ? `&peerId=${encodeURIComponent(peerId)}` : ''}`,
      ),
    sendChatMessage: (body: SendChatMessageDto) =>
      request<ChatMessageView>('/chat/messages', { method: 'POST', body }),
    deleteChatMessage: (id: string, reason?: string) =>
      request<void>(`/chat/messages/${id}`, { method: 'DELETE', body: { reason } }),
    chatContacts: (search = '') =>
      request<ChatContactView[]>(`/chat/contacts?search=${encodeURIComponent(search)}`),

    // ── Administration / modération ──
    adminUsers: (search = '') =>
      request<AdminUserView[]>(`/admin/users?search=${encodeURIComponent(search)}`),
    changeUserRole: (id: string, body: ChangeUserRoleDto) =>
      request<void>(`/admin/users/${id}/role`, { method: 'PATCH', body }),
    moderateUser: (id: string, body: ModerateUserDto) =>
      request<void>(`/admin/users/${id}/moderation`, { method: 'PATCH', body }),
    moderationActions: () => request<ModerationActionView[]>('/admin/moderation-actions'),

    // ── Planètes ──
    planets: () => request<PlanetSummary[]>('/planets'),
    planet: (id: string) => request<PlanetDetail>(`/planets/${id}`),
    renamePlanet: (id: string, body: RenamePlanetDto) =>
      request<PlanetSummary>(`/planets/${id}/name`, { method: 'PATCH', body }),
    setSpecialization: (id: string, body: SetSpecializationDto) =>
      request<PlanetSummary>(`/planets/${id}/specialization`, { method: 'PATCH', body }),
    setProductionIntensities: (id: string, body: SetProductionIntensitiesDto) =>
      request<PlanetDetail>(`/planets/${id}/production`, { method: 'PATCH', body }),

    // ── Transferts ──
    transfers: () => request<ResourceTransferMissionView[]>('/transfer'),
    launchTransfer: (body: TransferResourcesDto) =>
      request<ResourceTransferMissionView>('/transfer', { method: 'POST', body }),

    // ── Bâtiments ──
    upgradeBuilding: (body: BuildBuildingDto) =>
      request<JobView>('/buildings', { method: 'POST', body }),
    cancelConstruction: (planetId: string) =>
      request<void>(`/buildings/${planetId}`, { method: 'DELETE' }),

    // ── Recherches ──
    research: (planetId: string) => request<ResearchOverview>(`/research/${planetId}`),
    startResearch: (body: StartResearchDto) =>
      request<JobView>('/research', { method: 'POST', body }),

    // ── Galaxie / colonisation ──
    galaxySystem: (galaxy: number, system: number) =>
      request<GalaxySystemView>(`/galaxy/${galaxy}/${system}`),
    colonizations: () => request<JobView[]>('/colonization'),
    colonize: (body: ColonizeDto) => request<JobView>('/colonization', { method: 'POST', body }),

    // ── Flottes / expéditions ──
    fleet: (planetId: string) => request<FleetOverview>(`/fleets/${planetId}`),
    produceShips: (body: ProduceShipsDto) =>
      request<ShipProductionJobView>('/ships', { method: 'POST', body }),
    expeditions: () => request<ExpeditionView[]>('/expeditions'),
    startExpedition: (body: StartExpeditionDto) =>
      request<ExpeditionView>('/expeditions', { method: 'POST', body }),
    expeditionReports: () => request<ExpeditionReportView[]>('/expeditions/reports'),
    markReportRead: (id: string) =>
      request<ExpeditionReportView>(`/expeditions/reports/${id}/read`, { method: 'PATCH' }),

    // ── Alliances ──
    myAlliance: () => request<AllianceDetailView | null>('/alliances/me'),
    alliances: (search?: string) =>
      request<AllianceView[]>(`/alliances${search ? `?search=${encodeURIComponent(search)}` : ''}`),
    alliance: (id: string) => request<AllianceDetailView>(`/alliances/${id}`),
    createAlliance: (body: CreateAllianceDto) =>
      request<AllianceView>('/alliances', { method: 'POST', body }),
    applyAlliance: (id: string, body: ApplyAllianceDto) =>
      request<void>(`/alliances/${id}/apply`, { method: 'POST', body }),
    allianceApplications: () => request<AllianceApplicationView[]>('/alliances/applications'),
    decideApplication: (id: string, body: DecideApplicationDto) =>
      request<void>(`/alliances/applications/${id}`, { method: 'PATCH', body }),
    leaveAlliance: () => request<void>('/alliances/leave', { method: 'POST' }),
    kickMember: (id: string, userId: string) =>
      request<void>(`/alliances/${id}/kick`, { method: 'POST', body: { userId } }),
    promoteMember: (id: string, userId: string) =>
      request<void>(`/alliances/${id}/promote`, { method: 'POST', body: { userId } }),
    demoteMember: (id: string, userId: string) =>
      request<void>(`/alliances/${id}/demote`, { method: 'POST', body: { userId } }),
    disbandAlliance: (id: string) => request<void>(`/alliances/${id}/disband`, { method: 'POST' }),

    // ── PvE ──
    encounters: () => request<NpcEncounterView[]>('/pve/encounters'),
    attackEncounter: (id: string, body: AttackEncounterDto) =>
      request<PveMissionView>(`/pve/encounters/${id}/attack`, { method: 'POST', body }),
    pveMissions: () => request<PveMissionView[]>('/pve/missions'),
    pveReports: () => request<PveReportView[]>('/pve/reports'),

    // ── PvP ──
    spyPlanet: (body: SpyPlanetDto) =>
      request<PvpMissionView>('/pvp/spy', { method: 'POST', body }),
    attackPlanet: (body: AttackPlanetDto) =>
      request<PvpMissionView>('/pvp/attack', { method: 'POST', body }),
    pvpMissions: () => request<PvpMissionView[]>('/pvp/missions'),
    pvpReports: () => request<PvpReportView[]>('/pvp/reports'),
    incomingAttacks: () => request<IncomingAttackView[]>('/pvp/incoming'),

    // ── Classement / événements / succès ──
    leaderboard: () => request<LeaderboardEntry[]>('/leaderboard'),
    allianceLeaderboard: () => request<AllianceLeaderboardEntry[]>('/leaderboard/alliances'),
    seasons: () => request<SeasonOverview>('/seasons'),
    claimSeasonRewards: () => request<SeasonOverview>('/seasons/claim', { method: 'POST' }),
    activeEvent: () => request<ActiveEventView | null>('/events/active'),
    achievements: () => request<AchievementView[]>('/achievements'),

    // ── Quêtes journalières et engagement ──
    dailyQuests: () => request<DailyQuestsOverview>('/daily-quests'),
    claimDailyQuest: (questId: string) =>
      request<DailyQuestsOverview>(`/daily-quests/${questId}/claim`, { method: 'POST' }),
    claimWeeklyBonus: () =>
      request<DailyQuestsOverview>('/daily-quests/weekly-bonus/claim', { method: 'POST' }),
    engagement: () => request<EngagementOverview>('/engagement'),
    engagementHeartbeat: () =>
      request<EngagementOverview>('/engagement/heartbeat', { method: 'POST' }),

    // ── Quêtes ──
    quests: () => request<QuestsOverview>('/quests'),
    claimQuest: (body: ClaimQuestDto) =>
      request<QuestsOverview>('/quests/claim', { method: 'POST', body }),

    // ── Récompense quotidienne ──
    dailyReward: () => request<DailyRewardView>('/daily-reward'),
    claimDailyReward: () => request<DailyRewardView>('/daily-reward/claim', { method: 'POST' }),

    // ── Résumé d'absence ──
    absenceSummary: () => request<AbsenceSummaryView>('/absence-summary', { method: 'POST' }),

    // ── Inventaire ──
    inventory: () => request<InventorySlotView[]>('/inventory'),
    planetInventory: (planetId: string) =>
      request<InventorySlotView[]>(`/inventory/planet/${planetId}`),

    // ── Marché ──
    marketSummaries: () => request<MarketSummaryView[]>('/market/summaries'),
    marketOrderBook: (itemKey: ItemKey) => request<OrderBookView>(`/market/${itemKey}/orderbook`),
    marketCandles: (itemKey: ItemKey, interval: '1h' | '4h' | '1d' = '1h', limit = 200) =>
      request<OhlcvCandleView[]>(`/market/${itemKey}/candles?interval=${interval}&limit=${limit}`),
    marketOrders: (itemKey: ItemKey) => request<MarketOrderView[]>(`/market/${itemKey}/orders`),
    myMarketOrders: () => request<MarketOrderView[]>('/market/my/orders'),
    myMarketTrades: () => request<MarketTradeView[]>('/market/my/trades'),
    placeMarketOrder: (body: PlaceMarketOrderDto) =>
      request<MarketOrderView>('/market/orders', { method: 'POST', body }),
    cancelMarketOrder: (id: string) => request<void>(`/market/orders/${id}`, { method: 'DELETE' }),

    // ── Artisanat ──
    craftingRecipes: () => request<CraftingRecipeConfig[]>('/crafting/recipes'),
    craftingJobs: () => request<CraftingJobView[]>('/crafting/jobs'),
    craftingJobsByPlanet: (planetId: string) =>
      request<CraftingJobView[]>(`/crafting/jobs/planet/${planetId}`),
    startCrafting: (body: StartCraftingDto) =>
      request<CraftingJobView>('/crafting/start', { method: 'POST', body }),

    // ── Lignes de production ──
    productionLines: () => request<ProductionLineView[]>('/production-lines'),
    createProductionLine: (body: CreateProductionLineDto) =>
      request<ProductionLineView>('/production-lines', { method: 'POST', body }),
    updateProductionLine: (id: string, body: UpdateProductionLineDto) =>
      request<ProductionLineView>(`/production-lines/${id}`, { method: 'PATCH', body }),
    deleteProductionLine: (id: string) =>
      request<void>(`/production-lines/${id}`, { method: 'DELETE' }),

    // ── Routes commerciales ──
    tradeRoutes: () => request<TradeRouteView[]>('/trade-routes'),
    createTradeRoute: (body: CreateTradeRouteDto) =>
      request<TradeRouteView>('/trade-routes', { method: 'POST', body }),
    updateTradeRouteStatus: (id: string, status: TradeRouteStatus) =>
      request<TradeRouteView>(`/trade-routes/${id}/status`, { method: 'PATCH', body: { status } }),
    deleteTradeRoute: (id: string) => request<void>(`/trade-routes/${id}`, { method: 'DELETE' }),

    // ── Notifications ──
    notifications: () => request<NotificationView[]>('/notifications'),
    notificationUnreadCount: () => request<UnreadCountView>('/notifications/unread-count'),
    markNotificationRead: (id: string) =>
      request<void>(`/notifications/${id}/read`, { method: 'PATCH' }),
    markAllNotificationsRead: () => request<void>('/notifications/read-all', { method: 'PATCH' }),
    clearOldNotifications: () => request<void>('/notifications/old', { method: 'DELETE' }),

    // ── Empire ──
    empireOverview: () => request<EmpireOverview>('/empire'),

    // ── File de construction ──
    constructionQueue: (planetId: string) =>
      request<ConstructionQueueItemView[]>(`/construction-queue?planetId=${planetId}`),
    addToConstructionQueue: (body: AddToQueueDto) =>
      request<ConstructionQueueItemView>('/construction-queue', { method: 'POST', body }),
    removeFromConstructionQueue: (id: string) =>
      request<void>(`/construction-queue/${id}`, { method: 'DELETE' }),

    // ── Presets de flotte ──
    fleetPresets: () => request<FleetPresetView[]>('/fleet-presets'),
    createFleetPreset: (body: CreateFleetPresetDto) =>
      request<FleetPresetView>('/fleet-presets', { method: 'POST', body }),
    updateFleetPreset: (id: string, body: Partial<CreateFleetPresetDto>) =>
      request<FleetPresetView>(`/fleet-presets/${id}`, { method: 'PATCH', body }),
    deleteFleetPreset: (id: string) => request<void>(`/fleet-presets/${id}`, { method: 'DELETE' }),

    // ── Diplomatie ──
    diplomaticRelations: () => request<DiplomaticRelationView[]>('/diplomacy/relations'),
    diplomaticOffers: () => request<DiplomaticOfferView[]>('/diplomacy/offers'),
    createDiplomaticOffer: (body: CreateDiplomaticOfferDto) =>
      request<DiplomaticOfferView>('/diplomacy/offers', { method: 'POST', body }),
    decideDiplomaticOffer: (id: string, accept: boolean) =>
      request<void>(`/diplomacy/offers/${id}/decide`, { method: 'PATCH', body: { accept } }),
    withdrawDiplomaticOffer: (id: string) =>
      request<void>(`/diplomacy/offers/${id}`, { method: 'DELETE' }),
    breakDiplomaticRelation: (id: string) =>
      request<void>(`/diplomacy/relations/${id}`, { method: 'DELETE' }),

    // ── Commandants ──
    commanders: () => request<CommandersOverview>('/commanders'),
    recruitCommander: (type: CommanderType) =>
      request<CommanderView>('/commanders/recruit', { method: 'POST', body: { type } }),
    assignCommander: (id: string, planetId: string | null) =>
      request<CommanderView>(`/commanders/${id}/assign`, { method: 'PATCH', body: { planetId } }),
    investTalent: (id: string, branch: CommanderTalentBranch, nodeId: string) =>
      request<CommanderView>(`/commanders/${id}/talent`, {
        method: 'POST',
        body: { branch, nodeId },
      }),

    // ── Défenses orbitales ──
    defenses: (planetId: string) => request<PlanetDefensesView>(`/planets/${planetId}/defenses`),
    buildDefense: (planetId: string, defenseType: DefenseType, quantity: number) =>
      request<PlanetDefensesView>(`/planets/${planetId}/defenses/build`, {
        method: 'POST',
        body: { defenseType, quantity },
      }),

    // ── Lunes & débris ──
    debrisFields: (galaxy: number, system: number) =>
      request<DebrisFieldView[]>(`/galaxy/${galaxy}/system/${system}/debris`),
    moon: (planetId: string) => request<MoonView | null>(`/planets/${planetId}/moon`),
    buildMoonBuilding: (planetId: string, buildingType: MoonBuildingType) =>
      request<MoonView>(`/planets/${planetId}/moon/build`, {
        method: 'POST',
        body: { buildingType },
      }),
  };
}

export const apiBase = createApi(requestBase);
