'use client';

import { useActiveEvent } from '@/lib/queries';
import { AnimatedCountdown } from './AnimatedCountdown';
import { motion, AnimatePresence } from 'framer-motion';
import { FiRadio } from 'react-icons/fi';

export function EventBanner() {
  const { data: event } = useActiveEvent();

  return (
    <AnimatePresence>
      {event && (
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          className="relative overflow-hidden rounded-xl border border-spore-500/25 bg-spore-500/[0.07] px-4 py-3 text-sm backdrop-blur-xl"
        >
          <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-transparent via-spore-500/5 to-transparent" />
          <div className="relative flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <FiRadio className="h-4 w-4 animate-pulse text-spore-400" aria-hidden="true" />
              <span className="font-medium text-spore-400">{event.name}</span>
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
