'use client';

import { memo, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { formatDuration, secondsUntil } from '@/lib/format';
import { useTicker } from './TickerContext';

interface AnimatedCountdownProps {
  finishesAt: string;
  onDone?: () => void;
  className?: string;
  showRing?: boolean;
  totalSeconds?: number;
}

function AnimatedCountdownInner({
  finishesAt,
  onDone,
  className = '',
  showRing = false,
  totalSeconds,
}: AnimatedCountdownProps) {
  useTicker();
  const remaining = Math.max(0, secondsUntil(finishesAt));
  const calledRef = useRef(false);

  useEffect(() => {
    if (remaining <= 0 && !calledRef.current) {
      calledRef.current = true;
      onDone?.();
    }
  }, [remaining, onDone]);

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
              cx={24}
              cy={24}
              r={radius}
              fill="none"
              stroke="rgba(22, 191, 108, 0.1)"
              strokeWidth="4"
            />
            <motion.circle
              cx={24}
              cy={24}
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
      key={Math.floor(remaining)}
      initial={{ opacity: 0.5, y: -2 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {formatDuration(remaining)}
    </motion.span>
  );
}

export const AnimatedCountdown = memo(AnimatedCountdownInner);
