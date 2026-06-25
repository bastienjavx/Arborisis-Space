'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { DailyQuestsOverview } from '@arborisis/shared';
import { GameIcon } from './GameIcon';
import { AnimatedCard } from './AnimatedCard';
import { AnimatedButton } from './AnimatedButton';

export function DailyQuestsPanel() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['dailyQuests'],
    queryFn: api.dailyQuests,
  });

  const claimMutation = useMutation({
    mutationFn: api.claimDailyQuest,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['dailyQuests'] }),
  });

  const weeklyMutation = useMutation({
    mutationFn: api.claimWeeklyBonus,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['dailyQuests'] }),
  });

  if (isLoading || !data) {
    return (
      <div className="rounded-2xl border border-canopy-700/30 bg-bark-900/50 p-4">
        <div className="h-4 w-32 animate-pulse rounded bg-bark-700" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-glow-gold">Missions Quotidiennes</h2>
        <div className="flex items-center gap-2 text-sm">
          <GameIcon name="trophy" className="h-4 w-4 text-amber-400" />
          <span className="text-amber-300">{data.engagementTokens}/7</span>
        </div>
      </div>

      {data.weeklyBonusAvailable && (
        <AnimatedCard className="border-amber-500/30 bg-amber-900/20 p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-amber-300">Bonus hebdomadaire disponible !</p>
              <p className="text-sm text-amber-400/70">Réclamez 2000 de chaque ressource</p>
            </div>
            <AnimatedButton
              onClick={() => weeklyMutation.mutate()}
              loading={weeklyMutation.isPending}
              className="bg-amber-600 hover:bg-amber-500"
            >
              Réclamer
            </AnimatedButton>
          </div>
        </AnimatedCard>
      )}

      <div className="space-y-2">
        {data.quests.map((quest) => (
          <AnimatedCard
            key={quest.id}
            className={`p-3 ${
              quest.completed
                ? quest.claimed
                  ? 'border-green-700/30 bg-green-900/10'
                  : 'border-green-500/30 bg-green-900/20'
                : 'border-canopy-700/30 bg-bark-900/50'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <QuestTypeIcon type={quest.type} />
                  <span className="font-medium text-canopy-100">{getQuestLabel(quest.type)}</span>
                  {quest.completed && !quest.claimed && (
                    <span className="rounded-full bg-green-500/20 px-2 py-0.5 text-xs text-green-400">
                      Terminé
                    </span>
                  )}
                  {quest.claimed && (
                    <span className="rounded-full bg-green-700/20 px-2 py-0.5 text-xs text-green-500">
                      Réclamé
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-canopy-400">
                  {getQuestDescription(quest.type, quest.target)}
                </p>
                <div className="mt-2">
                  <div className="h-2 overflow-hidden rounded-full bg-bark-700">
                    <div
                      className={`h-full rounded-full transition-all ${
                        quest.completed ? 'bg-green-500' : 'bg-canopy-500'
                      }`}
                      style={{
                        width: `${Math.min((quest.progress / quest.target) * 100, 100)}%`,
                      }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-canopy-500">
                    {quest.progress}/{quest.target}
                  </p>
                </div>
                <div className="mt-2 flex items-center gap-3 text-xs text-amber-400">
                  <span className="flex items-center gap-1">
                    <GameIcon name="leaf" className="h-3 w-3" />
                    {quest.reward.biomass}
                  </span>
                  <span className="flex items-center gap-1">
                    <GameIcon name="droplets" className="h-3 w-3" />
                    {quest.reward.sap}
                  </span>
                  <span className="flex items-center gap-1">
                    <GameIcon name="pickaxe" className="h-3 w-3" />
                    {quest.reward.minerals}
                  </span>
                  <span className="flex items-center gap-1">
                    <GameIcon name="sparkles" className="h-3 w-3" />
                    {quest.reward.spores}
                  </span>
                  <span className="flex items-center gap-1">
                    <GameIcon name="trophy" className="h-3 w-3" />
                    {quest.reward.engagementTokens}
                  </span>
                </div>
              </div>
              {quest.completed && !quest.claimed && (
                <AnimatedButton
                  onClick={() => claimMutation.mutate(quest.id)}
                  loading={claimMutation.isPending}
                  className="ml-3 bg-green-600 hover:bg-green-500"
                >
                  Réclamer
                </AnimatedButton>
              )}
            </div>
          </AnimatedCard>
        ))}
      </div>
    </div>
  );
}

function QuestTypeIcon({ type }: { type: string }) {
  const iconMap: Record<string, string> = {
    PRODUCE_SHIPS: 'rocket',
    LAUNCH_EXPEDITIONS: 'rocket',
    COLLECT_RESOURCES: 'pickaxe',
    BUILD_BUILDINGS: 'wrench',
    COMPLETE_RESEARCH: 'flask',
    WIN_PVE: 'swords',
  };
  return <GameIcon name={iconMap[type] ?? 'circle'} className="h-4 w-4 text-canopy-400" />;
}

function getQuestLabel(type: string): string {
  const labels: Record<string, string> = {
    PRODUCE_SHIPS: 'Produire des vaisseaux',
    LAUNCH_EXPEDITIONS: 'Lancer des expéditions',
    COLLECT_RESOURCES: 'Collecter des ressources',
    BUILD_BUILDINGS: 'Construire des bâtiments',
    COMPLETE_RESEARCH: 'Terminer des recherches',
    WIN_PVE: 'Gagner des combats PvE',
  };
  return labels[type] ?? 'Mission';
}

function getQuestDescription(type: string, target: number): string {
  const descriptions: Record<string, string> = {
    PRODUCE_SHIPS: `Produire ${target} vaisseaux`,
    LAUNCH_EXPEDITIONS: `Lancer ${target} expédition${target > 1 ? 's' : ''}`,
    COLLECT_RESOURCES: `Collecter ${target.toLocaleString()} unités de ressources`,
    BUILD_BUILDINGS: `Construire ou améliorer ${target} bâtiment${target > 1 ? 's' : ''}`,
    COMPLETE_RESEARCH: `Terminer ${target} recherche${target > 1 ? 's' : ''}`,
    WIN_PVE: `Gagner ${target} combat${target > 1 ? 's' : ''} PvE`,
  };
  return descriptions[type] ?? `Atteindre l'objectif : ${target}`;
}
