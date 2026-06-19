import type {
  AllianceApplicationView,
  AllianceDetailView,
  AllianceView,
  ApplyAllianceDto,
  AttackEncounterDto,
  AttackPlanetDto,
  AuthUser,
  BuildBuildingDto,
  ColonizeDto,
  CreateAllianceDto,
  DecideApplicationDto,
  GalaxySystemView,
  FleetOverview,
  ExpeditionView,
  ExpeditionReportView,
  JobView,
  ListUniversesView,
  NpcEncounterView,
  PlanetDetail,
  PlanetSummary,
  PublicProfile,
  PveMissionView,
  PvpMissionView,
  RenamePlanetDto,
  ResearchOverview,
  ResourceTransferMissionView,
  StartResearchDto,
  ProduceShipsDto,
  SetSpecializationDto,
  SpyPlanetDto,
  StartExpeditionDto,
  ShipProductionJobView,
  LeaderboardEntry,
  ActiveEventView,
  AchievementView,
  TransferResourcesDto,
  UpdateProfileDto,
} from '@arborisis/shared';

const BASE = '/api';
let refreshInFlight: Promise<boolean> | null = null;

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

async function parseError(res: Response): Promise<string> {
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

interface RequestOptions {
  method?: string;
  body?: unknown;
  /** Empêche la tentative de refresh (utilisé par les routes d'auth). */
  noRefresh?: boolean;
  _retried?: boolean;
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: opts.method ?? 'GET',
    credentials: 'include',
    headers: opts.body ? { 'Content-Type': 'application/json' } : undefined,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    cache: 'no-store',
  });

  // Access token expiré → tentative de rotation puis nouvel essai (une fois).
  if (res.status === 401 && !opts.noRefresh && !opts._retried) {
    refreshInFlight ??= fetch(`${BASE}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    })
      .then((response) => response.ok)
      .finally(() => {
        refreshInFlight = null;
      });
    if (await refreshInFlight) {
      return request<T>(path, { ...opts, _retried: true });
    }
  }

  if (!res.ok) throw new ApiError(res.status, await parseError(res));
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  // ── Auth ──
  register: (body: {
    email: string;
    username: string;
    password: string;
    race: string;
    universeId?: string;
  }) => request<{ user: AuthUser }>('/auth/register', { method: 'POST', body, noRefresh: true }),
  login: (body: { email: string; password: string }) =>
    request<{ user: AuthUser }>('/auth/login', { method: 'POST', body, noRefresh: true }),
  logout: () => request<{ success: true }>('/auth/logout', { method: 'POST' }),
  logoutAll: () => request<{ success: true }>('/auth/logout-all', { method: 'POST' }),
  me: () => request<{ user: AuthUser }>('/auth/me'),

  // ── Univers ──
  universes: () => request<ListUniversesView>('/universes'),
  resolveUniverse: (id: string) => request<{ internalApiUrl: string }>(`/universes/${id}/resolve`),

  // ── Profil ──
  updateProfile: (body: UpdateProfileDto) =>
    request<{ user: AuthUser }>('/users/me', { method: 'PATCH', body }),
  publicProfile: (id: string) => request<PublicProfile>(`/users/${id}/profile`),

  // ── Planètes ──
  planets: () => request<PlanetSummary[]>('/planets'),
  planet: (id: string) => request<PlanetDetail>(`/planets/${id}`),
  renamePlanet: (id: string, body: RenamePlanetDto) =>
    request<PlanetSummary>(`/planets/${id}/name`, { method: 'PATCH', body }),
  setSpecialization: (id: string, body: SetSpecializationDto) =>
    request<PlanetSummary>(`/planets/${id}/specialization`, { method: 'PATCH', body }),

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

  // ── PvP ──
  spyPlanet: (body: SpyPlanetDto) => request<PvpMissionView>('/pvp/spy', { method: 'POST', body }),
  attackPlanet: (body: AttackPlanetDto) =>
    request<PvpMissionView>('/pvp/attack', { method: 'POST', body }),
  pvpMissions: () => request<PvpMissionView[]>('/pvp/missions'),

  // ── Classement / événements / succès ──
  leaderboard: () => request<LeaderboardEntry[]>('/leaderboard'),
  activeEvent: () => request<ActiveEventView | null>('/events/active'),
  achievements: () => request<AchievementView[]>('/achievements'),
};
