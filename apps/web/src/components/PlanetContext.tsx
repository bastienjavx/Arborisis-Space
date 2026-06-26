'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { PlanetSummary } from '@arborisis/shared';
import { usePlanets } from '@/lib/queries';
import { emitSubscribePlanet, emitUnsubscribePlanet } from '@/lib/socket';

interface PlanetState {
  planets: PlanetSummary[];
  selectedId: string | undefined;
  isLoading: boolean;
}

interface PlanetContextValue extends PlanetState {
  select: (id: string) => void;
}

const PlanetStateCtx = createContext<PlanetState | null>(null);
const PlanetDispatchCtx = createContext<((id: string) => void) | null>(null);

export function PlanetProvider({ children }: { children: ReactNode }) {
  const { data: planets, isLoading } = usePlanets();
  const [selectedId, setSelectedId] = useState<string>();

  useEffect(() => {
    if (!selectedId && planets && planets.length > 0) {
      setSelectedId(planets.find((p) => p.isHomeworld)?.id ?? planets[0].id);
    }
  }, [planets, selectedId]);

  useEffect(() => {
    if (!selectedId) return;
    emitSubscribePlanet(selectedId);
    return () => {
      emitUnsubscribePlanet(selectedId);
    };
  }, [selectedId]);

  const select = useCallback((id: string) => setSelectedId(id), []);

  const state = useMemo<PlanetState>(
    () => ({ planets: planets ?? [], selectedId, isLoading }),
    [planets, selectedId, isLoading],
  );

  return (
    <PlanetDispatchCtx.Provider value={select}>
      <PlanetStateCtx.Provider value={state}>{children}</PlanetStateCtx.Provider>
    </PlanetDispatchCtx.Provider>
  );
}

export function usePlanetSelection(): PlanetContextValue {
  const state = useContext(PlanetStateCtx);
  const select = useContext(PlanetDispatchCtx);
  if (!state || !select) {
    throw new Error('usePlanetSelection doit être utilisé dans PlanetProvider');
  }
  return { ...state, select };
}
