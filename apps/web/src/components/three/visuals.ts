'use client';

import * as THREE from 'three';
import { makeRng } from '@/lib/procgen';

export const ORGANIC_COLORS = {
  canopy: '#16bf6c',
  canopySoft: '#7eecae',
  spore: '#7b66f0',
  sap: '#f5c96b',
  cyan: '#22d3ee',
  bark: '#06120d',
};

export function seedFromString(value: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function seededSphericalPoints(
  seed: number,
  count: number,
  minRadius: number,
  maxRadius: number,
): { positions: Float32Array; sizes: Float32Array; phases: Float32Array } {
  const rng = makeRng(seed);
  const positions = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const phases = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    const r = minRadius + rng() * (maxRadius - minRadius);
    const theta = rng() * Math.PI * 2;
    const phi = Math.acos(2 * rng() - 1);
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);
    sizes[i] = 0.45 + rng() * 1.8;
    phases[i] = rng() * Math.PI * 2;
  }

  return { positions, sizes, phases };
}

export function seededBoxPoints(
  seed: number,
  count: number,
  width: number,
  height: number,
  depth: number,
): Float32Array {
  const rng = makeRng(seed);
  const positions = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    positions[i * 3] = (rng() - 0.5) * width;
    positions[i * 3 + 1] = (rng() - 0.5) * height;
    positions[i * 3 + 2] = (rng() - 0.5) * depth;
  }

  return positions;
}

export function makeGlowMaterial(color: string, opacity: number): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
}

export function specializationColor(specialization?: string | null): string {
  switch (specialization) {
    case 'FORTRESS':
      return '#7dd3fc';
    case 'MILITARY':
      return '#f97316';
    case 'RESEARCH':
      return ORGANIC_COLORS.spore;
    case 'PRODUCTION':
      return ORGANIC_COLORS.sap;
    default:
      return ORGANIC_COLORS.canopy;
  }
}
