'use client';

import dynamic from 'next/dynamic';

export const HeroScene = dynamic(
  () => import('./HeroScene').then((m) => ({ default: m.HeroScene })),
  {
    ssr: false,
    loading: () => (
      <div className="grid h-full w-full place-items-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-canopy-600 border-t-transparent" />
      </div>
    ),
  },
);

export const PlanetView = dynamic(
  () => import('./PlanetView').then((m) => ({ default: m.PlanetView })),
  {
    ssr: false,
    loading: () => (
      <div className="grid h-full w-full place-items-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-canopy-600 border-t-transparent" />
      </div>
    ),
  },
);

export const GalaxyView = dynamic(
  () => import('./GalaxyView').then((m) => ({ default: m.GalaxyView })),
  {
    ssr: false,
    loading: () => (
      <div className="grid h-full w-full place-items-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-canopy-600 border-t-transparent" />
      </div>
    ),
  },
);

export const FleetView = dynamic(
  () => import('./FleetView').then((m) => ({ default: m.FleetView })),
  {
    ssr: false,
    loading: () => (
      <div className="grid h-full w-full place-items-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-canopy-600 border-t-transparent" />
      </div>
    ),
  },
);
