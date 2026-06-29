import { DailyQuestsPanel } from '@/components/DailyQuestsPanel';
import { EngagementPanel } from '@/components/EngagementPanel';
import { QuestTracker } from '@/components/QuestTracker';
import { AnimatedCard } from '@/components/AnimatedCard';
import { GameIcon } from '@/components/GameIcon';
import Link from 'next/link';

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-glow-gold">Tableau de bord</h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <AnimatedCard className="border-canopy-700/30 bg-bark-900/50 p-5">
          <DailyQuestsPanel />
        </AnimatedCard>

        <AnimatedCard className="border-canopy-700/30 bg-bark-900/50 p-5">
          <EngagementPanel />
        </AnimatedCard>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <AnimatedCard className="border-canopy-700/30 bg-bark-900/50 p-5">
          <QuestTracker />
        </AnimatedCard>

        <AnimatedCard className="border-canopy-700/30 bg-bark-900/50 p-5">
          <h2 className="mb-4 text-lg font-bold text-glow-gold">Raccourcis</h2>
          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/buildings"
              className="flex items-center gap-3 rounded-xl border border-canopy-700/30 bg-bark-800/50 p-3 transition-colors hover:bg-bark-700/50"
            >
              <GameIcon name="wrench" className="h-5 w-5 text-canopy-400" />
              <span className="text-sm font-medium text-canopy-100">Bâtiments</span>
            </Link>
            <Link
              href="/fleets"
              className="flex items-center gap-3 rounded-xl border border-canopy-700/30 bg-bark-800/50 p-3 transition-colors hover:bg-bark-700/50"
            >
              <GameIcon name="rocket" className="h-5 w-5 text-canopy-400" />
              <span className="text-sm font-medium text-canopy-100">Flottes</span>
            </Link>
            <Link
              href="/pve"
              className="flex items-center gap-3 rounded-xl border border-canopy-700/30 bg-bark-800/50 p-3 transition-colors hover:bg-bark-700/50"
            >
              <GameIcon name="swords" className="h-5 w-5 text-canopy-400" />
              <span className="text-sm font-medium text-canopy-100">PvE</span>
            </Link>
            <Link
              href="/leaderboard"
              className="flex items-center gap-3 rounded-xl border border-canopy-700/30 bg-bark-800/50 p-3 transition-colors hover:bg-bark-700/50"
            >
              <GameIcon name="trophy" className="h-5 w-5 text-canopy-400" />
              <span className="text-sm font-medium text-canopy-100">Classement</span>
            </Link>
          </div>
        </AnimatedCard>
      </div>
    </div>
  );
}
