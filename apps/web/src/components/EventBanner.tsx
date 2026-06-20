'use client';

import { useActiveEvent } from '@/lib/queries';
import { AnimatedCountdown } from './AnimatedCountdown';
import { motion, AnimatePresence } from 'framer-motion';
import { FiRadio } from 'react-icons/fi';
import { useEffect, useState } from 'react';

function useEventEndingSoon(endsAt?: string): boolean {
  const [endingSoon, setEndingSoon] = useState(false);

  useEffect(() => {
    if (!endsAt) {
      setEndingSoon(false);
      return;
    }
    const update = () => {
      const remaining = new Date(endsAt).getTime() - Date.now();
      setEndingSoon(remaining > 0 && remaining <= 10 * 60_000);
    };
    update();
    const timer = window.setInterval(update, 15_000);
    return () => window.clearInterval(timer);
  }, [endsAt]);

  return endingSoon;
}

export function EventBanner() {
  const { data: event } = useActiveEvent();
  const endingSoon = useEventEndingSoon(event?.endsAt);

  return (
    <AnimatePresence>
      {event && (
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          className={`relative overflow-hidden rounded-xl border bg-spore-500/[0.07] px-4 py-3 text-sm backdrop-blur-xl ${
            endingSoon
              ? 'animate-pulse border-amber-400/50 shadow-lg shadow-amber-500/10'
              : 'border-spore-500/25'
          }`}
        >
          <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-transparent via-spore-500/5 to-transparent" />
          <div className="relative flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <FiRadio className="h-4 w-4 animate-pulse text-spore-400" aria-hidden="true" />
              <span className="font-medium text-spore-400">{event.name}</span>
              <span className="text-canopy-100/50">{event.effectDescription}</span>
            </div>
            <span
              className={`font-mono text-xs ${endingSoon ? 'font-semibold text-amber-300' : 'text-spore-400/70'}`}
            >
              Fin dans <AnimatedCountdown finishesAt={event.endsAt} />
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
