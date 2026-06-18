'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import type { GalaxyViewProps } from './GalaxyView';
import type { FleetViewProps } from './FleetView';

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

class ThreeErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(_error: Error, _info: ErrorInfo) {}
  render() {
    return this.state.hasError ? <WebGLFallback /> : this.props.children;
  }
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
    <ThreeErrorBoundary>
      <HeroSceneInner className={className} />
    </ThreeErrorBoundary>
  );
}

export function PlanetView({ className }: { className?: string }) {
  return (
    <ThreeErrorBoundary>
      <PlanetViewInner className={className} />
    </ThreeErrorBoundary>
  );
}

export function GalaxyView(props: GalaxyViewProps) {
  return (
    <ThreeErrorBoundary>
      <GalaxyViewInner {...props} />
    </ThreeErrorBoundary>
  );
}

export function FleetView(props: FleetViewProps) {
  return (
    <ThreeErrorBoundary>
      <FleetViewInner {...props} />
    </ThreeErrorBoundary>
  );
}
