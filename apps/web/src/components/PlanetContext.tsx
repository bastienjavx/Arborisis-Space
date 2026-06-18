'use client';

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { PlanetSummary } from '@arborisis/shared';
import { usePlanets } from '@/lib/queries';

interface PlanetContextValue {
  planets: PlanetSummary[];
  selectedId: string | undefined;
  select: (id: string) => void;
  isLoading: boolean;
}

const PlanetCtx = createContext<PlanetContextValue | null>(null);

export function PlanetProvider({ children }: { children: ReactNode }) {
  const { data: planets, isLoading } = usePlanets();
  const [selectedId, setSelectedId] = useState<string>();

  useEffect(() => {
    if (!selectedId && planets && planets.length > 0) {
      setSelectedId(planets.find((p) => p.isHomeworld)?.id ?? planets[0].id);
    }
  }, [planets, selectedId]);

  const value = useMemo<PlanetContextValue>(
    () => ({ planets: planets ?? [], selectedId, select: setSelectedId, isLoading }),
    [planets, selectedId, isLoading],
  );

  return <PlanetCtx.Provider value={value}>{children}</PlanetCtx.Provider>;
}

export function usePlanetSelection(): PlanetContextValue {
  const ctx = useContext(PlanetCtx);
  if (!ctx) throw new Error('usePlanetSelection doit être utilisé dans PlanetProvider');
  return ctx;
}
