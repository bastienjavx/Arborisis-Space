'use client';

import { motion } from 'framer-motion';
import { usePlanetSelection } from './PlanetContext';
import { NotificationBell } from './NotificationBell';
import { ResourceBar } from './ResourceBar';
import { useDailyReward, usePlanetDetail } from '@/lib/queries';
import { organicEase } from '@/lib/motion';
import { FiGift } from 'react-icons/fi';

export function GameTopBar() {
  const { selectedId } = usePlanetSelection();
  const { data: planet } = usePlanetDetail(selectedId);
  const { data: dailyReward } = useDailyReward();

  if (!planet) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.42, ease: organicEase }}
      className="fixed left-[15rem] right-0 top-0 z-30 hidden border-b border-canopy-700/20 bg-bark-950/95 px-6 py-2 shadow-[0_16px_50px_-38px_rgba(0,0,0,0.95)] backdrop-blur-2xl lg:block xl:px-9"
    >
      <div className="mx-auto flex max-w-[96rem] items-center justify-between gap-4">
        <ResourceBar resources={planet.resources} compact />
        <div className="flex items-center gap-3">
          {dailyReward?.canClaim ? (
            <motion.button
              type="button"
              onClick={() => window.dispatchEvent(new Event('arborisis:open-daily-reward'))}
              whileHover={{ y: -1, scale: 1.015 }}
              whileTap={{ scale: 0.98 }}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-canopy-400/35 bg-canopy-500/10 px-3 py-1.5 text-xs font-medium text-canopy-200 transition hover:bg-canopy-500/20"
            >
              <FiGift className="h-3.5 w-3.5" aria-hidden="true" />
              Récolte prête
            </motion.button>
          ) : null}
          <NotificationBell />
        </div>
      </div>
    </motion.div>
  );
}
