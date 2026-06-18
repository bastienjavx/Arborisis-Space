'use client';

import { useMutation, useQuery, useQueryClient, type UseQueryOptions } from '@tanstack/react-query';
import type {
  BuildBuildingDto,
  ColonizeDto,
  PlanetDetail,
  ProduceShipsDto,
  StartExpeditionDto,
  StartResearchDto,
} from '@arborisis/shared';
import { api } from './api';

export const keys = {
  me: ['me'] as const,
  planets: ['planets'] as const,
  planet: (id: string) => ['planet', id] as const,
  research: (planetId: string) => ['research', planetId] as const,
  galaxy: (g: number, s: number) => ['galaxy', g, s] as const,
  colonizations: ['colonizations'] as const,
  fleet: (planetId: string) => ['fleet', planetId] as const,
  expeditions: ['expeditions'] as const,
  expeditionReports: ['expedition-reports'] as const,
};

export function useMe() {
  return useQuery({
    queryKey: keys.me,
    queryFn: () => api.me().then((r) => r.user),
    retry: false,
    staleTime: 60_000,
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
