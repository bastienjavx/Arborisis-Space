'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { EngagementOverview } from '@arborisis/shared';
import { GameIcon } from './GameIcon';

export function EngagementPanel() {
  const { data, isLoading } = useQuery({
    queryKey: ['engagement'],
    queryFn: api.engagement,
  });

  if (isLoading || !data) {
    return (
      <div className="rounded-2xl border border-canopy-700/30 bg-bark-900/50 p-4">
        <div className="h-4 w-32 animate-pulse rounded bg-canopy-700/25" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="section-title">Bonus d'engagement</h3>
        <div className="text-sm text-canopy-400">
          Multiplicateur total:{' '}
          <span className="font-bold text-amber-400">×{data.totalMultiplier}</span>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
        <StreakCard data={data.loginStreak} />
        <SessionCard data={data.sessionBonus} />
      </div>
    </div>
  );
}

function StreakCard({ data }: { data: EngagementOverview['loginStreak'] }) {
  return (
    <div className="rounded-xl border border-sap-400/25 bg-sap-400/10 p-4">
      <div className="flex items-center gap-2">
        <GameIcon name="trophy" className="h-5 w-5 text-orange-400" />
        <div>
          <p className="text-sm font-bold text-orange-300">Série de connexion</p>
          <p className="text-2xl font-bold text-orange-400">{data.streakDays} jours</p>
          <p className="text-xs text-orange-400/70">×{data.multiplier} bonus</p>
        </div>
      </div>
    </div>
  );
}

function SessionCard({ data }: { data: EngagementOverview['sessionBonus'] }) {
  const minutes = data.sessionMinutes;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  const timeText = hours > 0 ? `${hours}h ${remainingMinutes}min` : `${minutes}min`;

  return (
    <div className="rounded-xl border border-canopy-500/25 bg-canopy-500/10 p-4">
      <div className="flex items-center gap-2">
        <GameIcon name="zap" className="h-5 w-5 text-canopy-400" />
        <div>
          <p className="text-sm font-bold text-canopy-300">Session active</p>
          <p className="text-2xl font-bold text-canopy-400">{timeText}</p>
          <p className="text-xs text-canopy-400/70">×{data.multiplier} bonus</p>
        </div>
      </div>
    </div>
  );
}
