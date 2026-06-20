'use client';

import { FiTarget } from 'react-icons/fi';
import { useAchievements, useQuests } from '@/lib/queries';

export function NearMissBanner() {
  const { data: quests } = useQuests();
  const { data: achievements } = useAchievements();

  const quest = quests?.active;
  const closestAchievement = achievements
    ?.filter((achievement) => !achievement.unlockedAt && achievement.progress > 0)
    .sort((a, b) => b.progress / Math.max(1, b.target) - a.progress / Math.max(1, a.target))[0];

  const candidate =
    quest && !quest.completed
      ? { name: quest.name, remaining: quest.target - quest.progress, label: 'étape(s)' }
      : closestAchievement
        ? {
            name: closestAchievement.name,
            remaining: closestAchievement.target - closestAchievement.progress,
            label: closestAchievement.progressLabel,
          }
        : null;

  if (!candidate || candidate.remaining <= 0) return null;

  return (
    <div className="mt-2 flex items-center gap-2 rounded-lg border border-canopy-700/15 bg-canopy-500/[0.04] px-3 py-2 text-xs text-canopy-100/55">
      <FiTarget className="h-3.5 w-3.5 shrink-0 text-canopy-300" aria-hidden="true" />
      <span>
        Plus que <strong className="font-medium text-canopy-200">{candidate.remaining}</strong>{' '}
        {candidate.label} pour{' '}
        <strong className="font-medium text-canopy-100">{candidate.name}</strong>
      </span>
    </div>
  );
}
