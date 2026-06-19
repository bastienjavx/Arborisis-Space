'use client';

import { usePlanetSelection } from './PlanetContext';
import { ResourceBar } from './ResourceBar';
import { usePlanetDetail } from '@/lib/queries';

export function GameTopBar() {
  const { selectedId } = usePlanetSelection();
  const { data: planet } = usePlanetDetail(selectedId);

  if (!planet) return null;

  return (
    <div className="fixed left-[15rem] right-0 top-0 z-30 hidden border-b border-canopy-700/20 bg-bark-950/95 px-6 py-2 shadow-[0_16px_50px_-38px_rgba(0,0,0,0.95)] backdrop-blur-2xl lg:block xl:px-9">
      <div className="mx-auto max-w-[96rem]">
        <ResourceBar resources={planet.resources} compact />
      </div>
    </div>
  );
}
