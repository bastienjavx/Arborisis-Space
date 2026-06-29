'use client';

import { Component, type ErrorInfo, type ReactNode, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import type { GalaxyViewProps } from './GalaxyView';
import type { PlanetViewProps } from './PlanetView';
import type { FleetViewProps } from './FleetView';
import { detectWebGL } from '@/lib/device';

function Spinner() {
  return (
    <div className="grid h-full w-full place-items-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-canopy-600 border-t-transparent" />
    </div>
  );
}

function WebGLFallback() {
  return (
    <div className="grid h-full w-full place-items-center text-sm text-canopy-100/40">
      WebGL non disponible
    </div>
  );
}

function RenderErrorFallback() {
  return (
    <div className="grid h-full w-full place-items-center text-sm text-canopy-100/40">
      Erreur de rendu 3D
    </div>
  );
}

class ThreeErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: Error, _info: ErrorInfo) {
    console.error('[Three.js]', error);
  }
  render() {
    return this.state.hasError ? <RenderErrorFallback /> : this.props.children;
  }
}

function WebGLGuard({ children }: { children: ReactNode }) {
  const [checked, setChecked] = useState(false);
  const [available, setAvailable] = useState(true);

  useEffect(() => {
    setAvailable(detectWebGL());
    setChecked(true);
  }, []);

  if (!checked) return <Spinner />;
  if (!available) return <WebGLFallback />;
  return <>{children}</>;
}

const HeroSceneInner = dynamic(
  () => import('./HeroScene').then((m) => ({ default: m.HeroScene })),
  { ssr: false, loading: Spinner },
);

const PlanetViewInner = dynamic(
  () => import('./PlanetView').then((m) => ({ default: m.PlanetView })),
  { ssr: false, loading: Spinner },
);

const GalaxyViewInner = dynamic(
  () => import('./GalaxyView').then((m) => ({ default: m.GalaxyView })),
  { ssr: false, loading: Spinner },
);

const FleetViewInner = dynamic(
  () => import('./FleetView').then((m) => ({ default: m.FleetView })),
  { ssr: false, loading: Spinner },
);

export function HeroScene({ className }: { className?: string }) {
  return (
    <WebGLGuard>
      <ThreeErrorBoundary>
        <HeroSceneInner className={className} />
      </ThreeErrorBoundary>
    </WebGLGuard>
  );
}

export function PlanetView(props: PlanetViewProps) {
  return (
    <WebGLGuard>
      <ThreeErrorBoundary>
        <PlanetViewInner {...props} />
      </ThreeErrorBoundary>
    </WebGLGuard>
  );
}

export function GalaxyView(props: GalaxyViewProps) {
  return (
    <WebGLGuard>
      <ThreeErrorBoundary>
        <GalaxyViewInner {...props} />
      </ThreeErrorBoundary>
    </WebGLGuard>
  );
}

export function FleetView(props: FleetViewProps) {
  return (
    <WebGLGuard>
      <ThreeErrorBoundary>
        <FleetViewInner {...props} />
      </ThreeErrorBoundary>
    </WebGLGuard>
  );
}
