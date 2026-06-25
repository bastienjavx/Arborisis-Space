import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { EngagementOverview } from '@arborisis/shared';
import { GameIcon } from './GameIcon';
import { AnimatedCard } from './AnimatedCard';

export function EngagementPanel() {
  const { data, isLoading } = useQuery({
    queryKey: ['engagement'],
    queryFn: api.engagement,
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
        <h2 className="text-lg font-bold text-glow-gold">Bonus d'Engagement</h2>
        <div className="text-sm text-canopy-400">
          Multiplicateur total:{' '}
          <span className="font-bold text-amber-400">×{data.totalMultiplier}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StreakCard data={data.loginStreak} />
        <SessionCard data={data.sessionBonus} />
      </div>
    </div>
  );
}

function StreakCard({ data }: { data: EngagementOverview['loginStreak'] }) {
  return (
    <AnimatedCard className="border-orange-500/30 bg-orange-900/20 p-3">
      <div className="flex items-center gap-2">
        <GameIcon name="trophy" className="h-5 w-5 text-orange-400" />
        <div>
          <p className="text-sm font-bold text-orange-300">Série de connexion</p>
          <p className="text-2xl font-bold text-orange-400">{data.streakDays} jours</p>
          <p className="text-xs text-orange-400/70">×{data.multiplier} bonus</p>
        </div>
      </div>
    </AnimatedCard>
  );
}

function SessionCard({ data }: { data: EngagementOverview['sessionBonus'] }) {
  const minutes = data.sessionMinutes;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  const timeText = hours > 0 ? `${hours}h ${remainingMinutes}min` : `${minutes}min`;

  return (
    <AnimatedCard className="border-canopy-500/30 bg-canopy-900/20 p-3">
      <div className="flex items-center gap-2">
        <GameIcon name="zap" className="h-5 w-5 text-canopy-400" />
        <div>
          <p className="text-sm font-bold text-canopy-300">Session active</p>
          <p className="text-2xl font-bold text-canopy-400">{timeText}</p>
          <p className="text-xs text-canopy-400/70">×{data.multiplier} bonus</p>
        </div>
      </div>
    </AnimatedCard>
  );
}
