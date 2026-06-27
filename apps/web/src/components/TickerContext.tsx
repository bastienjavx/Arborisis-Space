'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

const TickerCtx = createContext<number | null>(null);

export function TickerProvider({ children }: { children: ReactNode }) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  return <TickerCtx.Provider value={tick}>{children}</TickerCtx.Provider>;
}

export function useTicker() {
  const ctx = useContext(TickerCtx);
  if (ctx === null) {
    throw new Error('useTicker doit être utilisé dans TickerProvider');
  }
  return ctx;
}
