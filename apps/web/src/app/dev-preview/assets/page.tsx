'use client';

/**
 * Galerie d'assets 3D (dev-only, hors groupe `(game)` → pas d'auth/DB).
 * Affiche tous les GLB générés (vaisseaux, bâtiments, bases de planète) sur des
 * tourne-disques, dans un seul canvas. Sert à revoir le lot complet et donne un
 * foyer 3D aux bâtiments (rendus en 2D dans l'UI de gestion).
 *
 * À SUPPRIMER une fois la revue terminée.
 */

import { useMemo, useRef, useState, Suspense } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { SHIP_TYPES, BUILDING_TYPES, PLANET_TYPES } from '@arborisis/shared';
import { AdaptiveCanvas } from '@/components/three/AdaptiveCanvas';
import { SafeModelAsset } from '@/components/three/ModelAsset';

type Category = 'vaisseaux' | 'bâtiments' | 'planètes';

const prettify = (s: string) =>
  s
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

function itemsFor(cat: Category): { url: string; label: string }[] {
  if (cat === 'vaisseaux')
    return SHIP_TYPES.map((t) => ({
      url: `/models/ship_${t.toLowerCase()}.glb`,
      label: prettify(t),
    }));
  if (cat === 'bâtiments')
    return BUILDING_TYPES.map((t) => ({
      url: `/models/building_${t.toLowerCase()}.glb`,
      label: prettify(t),
    }));
  return PLANET_TYPES.map((t) => ({
    url: `/models/planet_base_${t.toLowerCase()}.glb`,
    label: prettify(t),
  }));
}

function Turntable({
  url,
  label,
  position,
}: {
  url: string;
  label: string;
  position: [number, number, number];
}) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.4;
  });
  return (
    <group position={position}>
      <group ref={ref}>
        <SafeModelAsset
          url={url}
          targetSize={1.7}
          fallback={
            <mesh>
              <icosahedronGeometry args={[0.85, 0]} />
              <meshStandardMaterial color="#16bf6c" wireframe />
            </mesh>
          }
        />
      </group>
      <Html position={[0, -1.3, 0]} center style={{ pointerEvents: 'none' }}>
        <span
          style={{
            whiteSpace: 'nowrap',
            fontFamily: 'monospace',
            fontSize: 11,
            color: '#7eecae',
            background: 'rgba(6,18,13,0.7)',
            padding: '2px 6px',
            borderRadius: 4,
          }}
        >
          {label}
        </span>
      </Html>
    </group>
  );
}

function Grid({ cat }: { cat: Category }) {
  const list = useMemo(() => itemsFor(cat), [cat]);
  const cols = Math.ceil(Math.sqrt(list.length));
  const rows = Math.ceil(list.length / cols);
  const spacing = 3;
  return (
    <>
      {list.map((it, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = (col - (cols - 1) / 2) * spacing;
        const z = (row - (rows - 1) / 2) * spacing;
        return <Turntable key={it.url} url={it.url} label={it.label} position={[x, 0, z]} />;
      })}
    </>
  );
}

export default function AssetGalleryPage() {
  const [cat, setCat] = useState<Category>('vaisseaux');
  const categories: Category[] = ['vaisseaux', 'bâtiments', 'planètes'];

  return (
    <main style={{ width: '100vw', height: '100vh', background: '#06120d', position: 'relative' }}>
      <div style={{ position: 'absolute', zIndex: 10, top: 16, left: 16, display: 'flex', gap: 8 }}>
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            style={{
              padding: '8px 14px',
              borderRadius: 8,
              border: '1px solid #16bf6c',
              background: cat === c ? '#16bf6c' : 'transparent',
              color: cat === c ? '#06120d' : '#7eecae',
              cursor: 'pointer',
              fontFamily: 'monospace',
              textTransform: 'capitalize',
            }}
          >
            {c}
          </button>
        ))}
      </div>
      <AdaptiveCanvas camera={{ position: [0, 6, 15], fov: 50 }} gl={{ alpha: true }} maxDpr={1.5}>
        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 8, 4]} intensity={1} color="#cfe8ff" />
        <directionalLight position={[-5, -3, -4]} intensity={0.35} color="#7b66f0" />
        <Stars radius={60} depth={40} count={300} factor={3} saturation={0.4} fade speed={0.3} />
        <Suspense fallback={null}>
          <Grid cat={cat} />
        </Suspense>
        <OrbitControls enablePan minDistance={4} maxDistance={45} />
      </AdaptiveCanvas>
    </main>
  );
}
