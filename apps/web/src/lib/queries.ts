'use client';

import { useMutation, useQuery, useQueryClient, type UseQueryOptions } from '@tanstack/react-query';
import type {
  AllianceDetailView,
  AllianceView,
  ApplyAllianceDto,
  AttackEncounterDto,
  AttackPlanetDto,
  BuildBuildingDto,
  ColonizeDto,
  CreateAllianceDto,
  DecideApplicationDto,
  IncomingAttackView,
  PlanetDetail,
  ProduceShipsDto,
  PveReportView,
  PvpReportView,
  RenamePlanetDto,
  ResourceTransferMissionView,
  SetSpecializationDto,
  SetProductionIntensitiesDto,
  SpyPlanetDto,
  StartExpeditionDto,
  StartResearchDto,
  TransferResourcesDto,
  UpdateProfileDto,
  ChangeUserRoleDto,
  ModerateUserDto,
  SendChatMessageDto,
  ClaimQuestDto,
  CreateProductionLineDto,
  UpdateProductionLineDto,
} from '@arborisis/shared';
import { ChatScope } from '@arborisis/shared';
import { api } from './api';

export const keys = {
  me: ['me'] as const,
  publicProfile: (id: string) => ['public-profile', id] as const,
  planets: ['planets'] as const,
  planet: (id: string) => ['planet', id] as const,
  research: (planetId: string) => ['research', planetId] as const,
  galaxy: (g: number, s: number) => ['galaxy', g, s] as const,
  colonizations: ['colonizations'] as const,
  fleet: (planetId: string) => ['fleet', planetId] as const,
  expeditions: ['expeditions'] as const,
  expeditionReports: ['expedition-reports'] as const,
  encounters: ['encounters'] as const,
  pveMissions: ['pve-missions'] as const,
  pveReports: ['pve-reports'] as const,
  pvpMissions: ['pvp-missions'] as const,
  pvpReports: ['pvp-reports'] as const,
  incomingAttacks: ['pvp-incoming'] as const,
  transfers: ['transfers'] as const,
  leaderboard: ['leaderboard'] as const,
  allianceLeaderboard: ['leaderboard', 'alliances'] as const,
  seasons: ['seasons'] as const,
  activeEvent: ['active-event'] as const,
  achievements: ['achievements'] as const,
  quests: ['quests'] as const,
  dailyReward: ['daily-reward'] as const,
  absenceSummary: ['absence-summary'] as const,
  alliances: (search: string) => ['alliances', search] as const,
  alliance: (id: string | undefined) => ['alliance', id ?? 'none'] as const,
  myAlliance: ['my-alliance'] as const,
  allianceApplications: ['alliance-applications'] as const,
  chatMessages: (scope: ChatScope, peerId?: string) =>
    ['chat-messages', scope, peerId ?? 'none'] as const,
  chatContacts: (search: string) => ['chat-contacts', search] as const,
  adminUsers: (search: string) => ['admin-users', search] as const,
  moderationActions: ['moderation-actions'] as const,
  productionLines: ['production-lines'] as const,
};

export function useMe() {
  return useQuery({
    queryKey: keys.me,
    queryFn: () => api.me().then((r) => r.user),
    retry: false,
    staleTime: 60_000,
  });
}

export function useChatMessages(scope: ChatScope, peerId?: string) {
  return useQuery({
    queryKey: keys.chatMessages(scope, peerId),
    queryFn: () => api.chatMessages(scope, peerId),
    enabled: scope !== ChatScope.PRIVATE || !!peerId,
    refetchInterval: 3_000,
  });
}

export function useChatContacts(search = '') {
  return useQuery({
    queryKey: keys.chatContacts(search),
    queryFn: () => api.chatContacts(search),
    staleTime: 10_000,
  });
}

export function useSendChatMessage(scope: ChatScope, peerId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: SendChatMessageDto) => api.sendChatMessage(body),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.chatMessages(scope, peerId) }),
  });
}

export function useDeleteChatMessage(scope: ChatScope, peerId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      api.deleteChatMessage(id, reason),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.chatMessages(scope, peerId) });
      void qc.invalidateQueries({ queryKey: keys.moderationActions });
    },
  });
}

export function useAdminUsers(search = '', enabled = true) {
  return useQuery({
    queryKey: keys.adminUsers(search),
    queryFn: () => api.adminUsers(search),
    enabled,
  });
}

export function useModerationActions(enabled = true) {
  return useQuery({
    queryKey: keys.moderationActions,
    queryFn: () => api.moderationActions(),
    refetchInterval: 15_000,
    enabled,
  });
}

export function useChangeUserRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: ChangeUserRoleDto }) =>
      api.changeUserRole(id, body),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['admin-users'] }),
  });
}

export function useModerateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: ModerateUserDto }) => api.moderateUser(id, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin-users'] });
      void qc.invalidateQueries({ queryKey: keys.moderationActions });
    },
  });
}

export function usePublicProfile(id: string | undefined) {
  return useQuery({
    queryKey: keys.publicProfile(id ?? 'none'),
    queryFn: () => api.publicProfile(id!),
    enabled: !!id,
  });
}

export function usePlanets() {
  return useQuery({ queryKey: keys.planets, queryFn: () => api.planets() });
}

export function usePlanetDetail(
  id: string | undefined,
  options?: Partial<UseQueryOptions<PlanetDetail>>,
) {
  return useQuery({
    queryKey: keys.planet(id ?? 'none'),
    queryFn: () => api.planet(id!),
    enabled: !!id,
    // Rafraîchit régulièrement pour suivre l'accumulation des ressources.
    refetchInterval: 15_000,
    ...options,
  });
}

export function useResearch(planetId: string | undefined) {
  return useQuery({
    queryKey: keys.research(planetId ?? 'none'),
    queryFn: () => api.research(planetId!),
    enabled: !!planetId,
    refetchInterval: 15_000,
  });
}

export function useGalaxy(galaxy: number, system: number) {
  return useQuery({
    queryKey: keys.galaxy(galaxy, system),
    queryFn: () => api.galaxySystem(galaxy, system),
  });
}

export function useColonizations() {
  return useQuery({ queryKey: keys.colonizations, queryFn: () => api.colonizations() });
}

export function useFleet(planetId: string | undefined) {
  return useQuery({
    queryKey: keys.fleet(planetId ?? 'none'),
    queryFn: () => api.fleet(planetId!),
    enabled: !!planetId,
    refetchInterval: 15_000,
  });
}

export function useExpeditions() {
  return useQuery({
    queryKey: keys.expeditions,
    queryFn: () => api.expeditions(),
    refetchInterval: 15_000,
  });
}

export function useExpeditionReports() {
  return useQuery({
    queryKey: keys.expeditionReports,
    queryFn: () => api.expeditionReports(),
    refetchInterval: 15_000,
  });
}

export function useEncounters() {
  return useQuery({
    queryKey: keys.encounters,
    queryFn: () => api.encounters(),
    refetchInterval: 60_000,
  });
}

export function usePveMissions() {
  return useQuery({
    queryKey: keys.pveMissions,
    queryFn: () => api.pveMissions(),
    refetchInterval: 15_000,
  });
}

export function usePveReports() {
  return useQuery<PveReportView[]>({
    queryKey: keys.pveReports,
    queryFn: () => api.pveReports(),
    refetchInterval: 60_000,
  });
}

export function usePvpMissions() {
  return useQuery({
    queryKey: keys.pvpMissions,
    queryFn: () => api.pvpMissions(),
    refetchInterval: 15_000,
  });
}

export function usePvpReports() {
  return useQuery<PvpReportView[]>({
    queryKey: keys.pvpReports,
    queryFn: () => api.pvpReports(),
    refetchInterval: 60_000,
  });
}

export function useIncomingAttacks() {
  return useQuery<IncomingAttackView[]>({
    queryKey: keys.incomingAttacks,
    queryFn: () => api.incomingAttacks(),
    refetchInterval: 30_000,
  });
}

export function useTransfers() {
  return useQuery<ResourceTransferMissionView[]>({
    queryKey: keys.transfers,
    queryFn: () => api.transfers(),
    refetchInterval: 15_000,
  });
}

export function useProductionLines() {
  return useQuery({
    queryKey: keys.productionLines,
    queryFn: () => api.productionLines(),
    refetchInterval: 15_000,
  });
}

export function useCreateProductionLine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateProductionLineDto) => api.createProductionLine(body),
    onSuccess: (line) => {
      void qc.invalidateQueries({ queryKey: keys.productionLines });
      void qc.invalidateQueries({ queryKey: keys.planet(line.planetId) });
    },
  });
}

export function useUpdateProductionLine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateProductionLineDto }) =>
      api.updateProductionLine(id, body),
    onSuccess: (line) => {
      void qc.invalidateQueries({ queryKey: keys.productionLines });
      void qc.invalidateQueries({ queryKey: keys.planet(line.planetId) });
    },
  });
}

export function useDeleteProductionLine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteProductionLine(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.productionLines }),
  });
}

// ── Mutations ──

export function useUpgradeBuilding(planetId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: BuildBuildingDto) => api.upgradeBuilding(body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.planet(planetId) });
    },
  });
}

export function useCancelConstruction(planetId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.cancelConstruction(planetId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.planet(planetId) });
    },
  });
}

export function useStartResearch(planetId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: StartResearchDto) => api.startResearch(body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.research(planetId) });
      void qc.invalidateQueries({ queryKey: keys.planet(planetId) });
    },
  });
}

export function useColonize() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ColonizeDto) => api.colonize(body),
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: keys.colonizations });
      void qc.invalidateQueries({
        queryKey: keys.galaxy(vars.target.galaxy, vars.target.system),
      });
    },
  });
}

export function useProduceShips(planetId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ProduceShipsDto) => api.produceShips(body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.fleet(planetId) });
      void qc.invalidateQueries({ queryKey: keys.planet(planetId) });
    },
  });
}

export function useStartExpedition(planetId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: StartExpeditionDto) => api.startExpedition(body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.fleet(planetId) });
      void qc.invalidateQueries({ queryKey: keys.expeditions });
    },
  });
}

export function useMarkReportRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.markReportRead(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: keys.expeditionReports }),
  });
}

export function useAttackEncounter(encounterId: string, planetId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: AttackEncounterDto) => api.attackEncounter(encounterId, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.pveMissions });
      void qc.invalidateQueries({ queryKey: keys.encounters });
      void qc.invalidateQueries({ queryKey: keys.fleet(planetId) });
    },
  });
}

export function useSpyPlanet(sourcePlanetId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: SpyPlanetDto) => api.spyPlanet(body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.pvpMissions });
      void qc.invalidateQueries({ queryKey: keys.fleet(sourcePlanetId) });
    },
  });
}

export function useAttackPlanet(sourcePlanetId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: AttackPlanetDto) => api.attackPlanet(body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.pvpMissions });
      void qc.invalidateQueries({ queryKey: keys.fleet(sourcePlanetId) });
    },
  });
}

export function useLaunchTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: TransferResourcesDto) => api.launchTransfer(body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.transfers });
      void qc.invalidateQueries({ queryKey: keys.planets });
    },
  });
}

export function useLeaderboard() {
  return useQuery({
    queryKey: keys.leaderboard,
    queryFn: () => api.leaderboard(),
    refetchInterval: 60_000,
  });
}

export function useAllianceLeaderboard() {
  return useQuery({
    queryKey: keys.allianceLeaderboard,
    queryFn: () => api.allianceLeaderboard(),
    refetchInterval: 60_000,
  });
}

export function useSeasons() {
  return useQuery({
    queryKey: keys.seasons,
    queryFn: () => api.seasons(),
    refetchInterval: 120_000,
  });
}

export function useClaimSeasonRewards() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.claimSeasonRewards(),
    onSuccess: (overview) => {
      qc.setQueryData(keys.seasons, overview);
      void qc.invalidateQueries({ queryKey: keys.planets });
      void qc.invalidateQueries({ queryKey: keys.me });
      void qc.invalidateQueries({ queryKey: keys.leaderboard });
    },
  });
}

export function useActiveEvent() {
  return useQuery({
    queryKey: keys.activeEvent,
    queryFn: () => api.activeEvent(),
    refetchInterval: 120_000,
  });
}

export function useAchievements() {
  return useQuery({
    queryKey: keys.achievements,
    queryFn: () => api.achievements(),
    refetchInterval: 60_000,
  });
}

export function useQuests() {
  return useQuery({
    queryKey: keys.quests,
    queryFn: () => api.quests(),
    refetchInterval: 60_000,
  });
}

export function useClaimQuest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ClaimQuestDto) => api.claimQuest(body),
    onSuccess: (overview) => {
      qc.setQueryData(keys.quests, overview);
      void qc.invalidateQueries({ queryKey: keys.planets });
      void qc.invalidateQueries({ queryKey: keys.quests });
    },
  });
}

export function useDailyReward() {
  return useQuery({
    queryKey: keys.dailyReward,
    queryFn: () => api.dailyReward(),
    refetchInterval: 5 * 60_000,
  });
}

export function useClaimDailyReward() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.claimDailyReward(),
    onSuccess: (view) => {
      qc.setQueryData(keys.dailyReward, view);
      void qc.invalidateQueries({ queryKey: keys.planets });
    },
  });
}

export function useAbsenceSummary() {
  return useQuery({
    queryKey: keys.absenceSummary,
    queryFn: () => api.absenceSummary(),
    // Une seule fois par session de jeu : l'appel consomme la fenêtre d'absence.
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchInterval: false,
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateProfileDto) => api.updateProfile(body),
    onSuccess: ({ user }) => {
      void qc.invalidateQueries({ queryKey: keys.me });
      void qc.invalidateQueries({ queryKey: keys.publicProfile(user.id) });
    },
  });
}

export function useRenamePlanet(planetId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: RenamePlanetDto) => api.renamePlanet(planetId, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.planet(planetId) });
      void qc.invalidateQueries({ queryKey: keys.planets });
    },
  });
}

export function useSetSpecialization(planetId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: SetSpecializationDto) => api.setSpecialization(planetId, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.planet(planetId) });
      void qc.invalidateQueries({ queryKey: keys.planets });
    },
  });
}

export function useSetProductionIntensities(planetId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: SetProductionIntensitiesDto) => api.setProductionIntensities(planetId, body),
    onSuccess: (planet) => {
      qc.setQueryData(keys.planet(planetId), planet);
    },
  });
}

// ── Alliances ──

export function useAlliances(search = '') {
  return useQuery({
    queryKey: keys.alliances(search),
    queryFn: () => api.alliances(search),
  });
}

export function useMyAlliance() {
  return useQuery({
    queryKey: keys.myAlliance,
    queryFn: () => api.myAlliance(),
  });
}

export function useAlliance(id: string | undefined) {
  return useQuery({
    queryKey: keys.alliance(id),
    queryFn: () => api.alliance(id!),
    enabled: !!id,
  });
}

export function useCreateAlliance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateAllianceDto) => api.createAlliance(body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.alliances('') });
      void qc.invalidateQueries({ queryKey: keys.me });
    },
  });
}

export function useApplyAlliance(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ApplyAllianceDto) => api.applyAlliance(id, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.alliance(id) });
    },
  });
}

export function useAllianceApplications(enabled = true) {
  return useQuery({
    queryKey: keys.allianceApplications,
    queryFn: () => api.allianceApplications(),
    enabled,
  });
}

export function useDecideApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: DecideApplicationDto }) =>
      api.decideApplication(id, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.allianceApplications });
      void qc.invalidateQueries({ queryKey: keys.alliance(undefined) });
    },
  });
}

export function useLeaveAlliance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.leaveAlliance(),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.me });
      void qc.invalidateQueries({ queryKey: keys.alliance(undefined) });
    },
  });
}

export function useKickMember(allianceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => api.kickMember(allianceId, userId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.alliance(allianceId) });
    },
  });
}

export function usePromoteMember(allianceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => api.promoteMember(allianceId, userId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.alliance(allianceId) });
    },
  });
}

export function useDemoteMember(allianceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => api.demoteMember(allianceId, userId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.alliance(allianceId) });
    },
  });
}

export function useDisbandAlliance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.disbandAlliance(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: keys.me });
      void qc.invalidateQueries({ queryKey: keys.alliances('') });
    },
  });
}
