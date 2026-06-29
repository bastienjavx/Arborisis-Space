'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { AdaptiveCanvas } from '@/components/three/AdaptiveCanvas';
import { tier, useLowPowerMode } from '@/lib/device';

const DESKTOP_COUNT = 480;

const PALETTE = [
  [0.086, 0.749, 0.424], // #16bf6c canopy
  [0.31, 0.784, 0.447], // #4fc872
  [0.961, 0.788, 0.42], // #f5c96b sap
  [0.494, 0.784, 0.643], // #7ec8a4
  [0.831, 0.945, 0.91], // #d4f1e8 pale
];

function SporeParticles({ count }: { count: number }) {
  const ref = useRef<THREE.Points>(null);

  const { positions, colors, velocities } = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const vels: { vx: number; vy: number; phase: number }[] = [];

    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 26;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 16;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 6 - 1;

      const c = PALETTE[Math.floor(Math.random() * PALETTE.length)];
      const b = 0.25 + Math.random() * 0.75;
      col[i * 3] = c[0] * b;
      col[i * 3 + 1] = c[1] * b;
      col[i * 3 + 2] = c[2] * b;

      vels.push({
        vx: (Math.random() - 0.5) * 0.004,
        vy: Math.random() * 0.005 + 0.0008,
        phase: Math.random() * Math.PI * 2,
      });
    }

    return { positions: pos, colors: col, velocities: vels };
  }, [count]);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const attr = ref.current.geometry.attributes['position'] as THREE.BufferAttribute;
    const t = clock.getElapsedTime();

    for (let i = 0; i < count; i++) {
      let x = attr.getX(i) + velocities[i].vx + Math.sin(t * 0.18 + velocities[i].phase) * 0.003;
      let y = attr.getY(i) + velocities[i].vy;
      const z = attr.getZ(i);

      if (y > 8.5) y = -8.5;
      if (x > 13) x = -13;
      if (x < -13) x = 13;
      attr.setXYZ(i, x, y, z);
    }

    attr.needsUpdate = true;
    ref.current.rotation.z = Math.sin(t * 0.035) * 0.01;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.065}
        vertexColors
        transparent
        opacity={0.5}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

export function HeroScene3D() {
  const lowPower = useLowPowerMode();
  const count = tier(lowPower, 96, DESKTOP_COUNT);

  return (
    <AdaptiveCanvas
      camera={{ position: [0, 0, 5], fov: 58 }}
      gl={{ alpha: true }}
      dpr={lowPower ? 1 : [1, 1.5]}
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
    >
      <SporeParticles count={count} />
    </AdaptiveCanvas>
  );
}
