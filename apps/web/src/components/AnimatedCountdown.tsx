'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { formatDuration, secondsUntil } from '@/lib/format';

interface AnimatedCountdownProps {
  finishesAt: string;
  onDone?: () => void;
  className?: string;
  showRing?: boolean;
  totalSeconds?: number;
}

export function AnimatedCountdown({
  finishesAt,
  onDone,
  className = '',
  showRing = false,
  totalSeconds,
}: AnimatedCountdownProps) {
  const [remaining, setRemaining] = useState(() => secondsUntil(finishesAt));

  useEffect(() => {
    setRemaining(secondsUntil(finishesAt));
    const id = setInterval(() => {
      const next = secondsUntil(finishesAt);
      setRemaining(next);
      if (next <= 0) {
        clearInterval(id);
        onDone?.();
      }
    }, 1000);
    return () => clearInterval(id);
  }, [finishesAt, onDone]);

  const progress =
    totalSeconds && totalSeconds > 0 ? Math.max(0, Math.min(1, remaining / totalSeconds)) : 0;

  if (showRing && totalSeconds) {
    const radius = 20;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference * (1 - progress);

    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <div className="relative h-12 w-12">
          <svg className="h-full w-full -rotate-90" viewBox="0 0 48 48">
            <circle
              cx="24"
              cy="24"
              r={radius}
              fill="none"
              stroke="rgba(22, 191, 108, 0.1)"
              strokeWidth="4"
            />
            <motion.circle
              cx="24"
              cy="24"
              r={radius}
              fill="none"
              stroke="#16bf6c"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={circumference}
              animate={{ strokeDashoffset: offset }}
              transition={{ duration: 0.5, ease: 'linear' }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[10px] font-bold text-canopy-300">
              {Math.round(progress * 100)}%
            </span>
          </div>
        </div>
        <span className="font-mono tabular-nums text-canopy-300">{formatDuration(remaining)}</span>
      </div>
    );
  }

  return (
    <motion.span
      className={`tabular-nums ${className}`}
      key={remaining}
      initial={{ opacity: 0.5, y: -2 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {formatDuration(remaining)}
    </motion.span>
  );
}
