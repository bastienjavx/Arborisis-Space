'use client';

import { useActiveEvent } from '@/lib/queries';
import { AnimatedCountdown } from './AnimatedCountdown';
import { motion, AnimatePresence } from 'framer-motion';

export function EventBanner() {
  const { data: event } = useActiveEvent();

  return (
    <AnimatePresence>
      {event && (
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          className="relative overflow-hidden rounded-lg border border-spore-500/30 bg-spore-900/30 px-4 py-2.5 text-sm backdrop-blur"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-spore-900/0 via-spore-500/5 to-spore-900/0 animate-pulse" />
          <div className="relative flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-spore-400 animate-pulse" />
              <span className="font-medium text-spore-300">{event.name}</span>
              <span className="text-canopy-100/50">{event.effectDescription}</span>
            </div>
            <span className="font-mono text-xs text-spore-400/70">
              Fin dans <AnimatedCountdown finishesAt={event.endsAt} />
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
