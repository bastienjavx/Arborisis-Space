'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';

const OrganicBackgroundInner = dynamic(
  () => import('./OrganicBackgroundInner').then((m) => ({ default: m.OrganicBackgroundInner })),
  { ssr: false },
);

export default function OrganicBackground() {
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
