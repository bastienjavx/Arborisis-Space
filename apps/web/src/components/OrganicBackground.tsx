'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';
import { useLowPowerMode } from '@/lib/device';

const OrganicBackgroundInner = dynamic(
  () => import('./OrganicBackgroundInner').then((m) => ({ default: m.OrganicBackgroundInner })),
  { ssr: false },
);

export default function OrganicBackground() {
  const lowPower = useLowPowerMode();

  if (lowPower) {
    return (
      <div
        className="fixed inset-0 z-0 bg-[radial-gradient(circle_at_50%_30%,rgba(22,191,108,0.10),transparent_36%),radial-gradient(circle_at_15%_70%,rgba(123,102,240,0.08),transparent_30%)]"
        aria-hidden="true"
      />
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
      }}
    >
      <Suspense fallback={null}>
        <OrganicBackgroundInner />
      </Suspense>
    </div>
  );
}
