'use client';

import { useEffect, useState } from 'react';
import { formatDuration, secondsUntil } from '@/lib/format';

/** Compte à rebours vers `finishesAt`. Déclenche `onDone` à l'échéance. */
export function Countdown({ finishesAt, onDone }: { finishesAt: string; onDone?: () => void }) {
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

  return <span className="tabular-nums">{formatDuration(remaining)}</span>;
}
