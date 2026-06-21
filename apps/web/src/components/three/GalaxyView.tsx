'use client';

import { useRef, useMemo, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Stars, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { GalaxySlot } from '@arborisis/shared';
import { orbitProfile, starProfile, type OrbitProfile, type StarProfile } from '@/lib/procgen';

const prefersReducedMotion =
  typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;

/** Position sur une orbite inclinée et légèrement excentrique. */
function orbitPoint(o: OrbitProfile, angle: number, out: THREE.Vector3): THREE.Vector3 {
  const x = Math.cos(angle) * o.radius;
  const z = Math.sin(angle) * o.radius * (1 - o.eccentricity);
  // Inclinaison du plan orbital autour de l'axe X.
  const y = -z * Math.sin(o.inclination);
  const zz = z * Math.cos(o.inclination);
  return out.set(x, y, zz);
}

function Star({ star }: { star: StarProfile }) {
  const coreRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (coreRef.current) coreRef.current.rotation.y = t * 0.05;
    if (glowRef.current) glowRef.current.scale.setScalar(1.5 + Math.sin(t * 0.6) * 0.06);
  });

  return (
    <group>
      <mesh ref={coreRef}>
        <sphereGeometry args={[star.size, 48, 48]} />
        <meshBasicMaterial color={star.color} />
      </mesh>
      <mesh ref={glowRef}>
        <sphereGeometry args={[star.size, 32, 32]} />
        <meshBasicMaterial
          color={star.corona}
          transparent
          opacity={0.16}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      <pointLight position={[0, 0, 0]} intensity={2.4} color={star.light} distance={40} decay={1.5} />
    </group>
  );
}

interface OrbitBodyProps {
  slot: GalaxySlot;
  orbit: OrbitProfile;
  selected: boolean;
  onSelect?: (slot: GalaxySlot) => void;
}

function OrbitBody({ slot, orbit, selected, onSelect }: OrbitBodyProps) {
  const bodyRef = useRef<THREE.Group>(null);
  const tmp = useMemo(() => new THREE.Vector3(), []);

  // Trace de l'orbite (ligne fermée) précalculée.
  const trail = useMemo(() => {
    const pts: number[] = [];
    const v = new THREE.Vector3();
    for (let i = 0; i <= 96; i++) {
      orbitPoint(orbit, (i / 96) * Math.PI * 2, v);
      pts.push(v.x, v.y, v.z);
    }
    return new Float32Array(pts);
  }, [orbit]);

  useFrame((state) => {
    if (!bodyRef.current) return;
    const angle = orbit.phase + state.clock.elapsedTime * orbit.speed;
    orbitPoint(orbit, angle, tmp);
    bodyRef.current.position.copy(tmp);
  });

  // Couleur : monde propre en canopée vive, voisin occupé en couleur de biome,
  // orbite vide en teinte ténue.
  const isOwn = slot.isOwn;
  const occupied = slot.occupied;
  const bodyColor = isOwn ? '#3fd989' : orbit.color;
  const emissive = isOwn ? '#16bf6c' : occupied ? orbit.glow : orbit.color;
  const size = (isOwn ? 1.35 : occupied ? 1.1 : 0.62) * orbit.size;
  const trailOpacity = occupied ? 0.16 : 0.07;

  return (
    <group>
      {/* Trace orbitale */}
      <line>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[trail, 3]} />
        </bufferGeometry>
        <lineBasicMaterial
          color={occupied ? orbit.glow : '#16bf6c'}
          transparent
          opacity={trailOpacity}
        />
      </line>

      {/* Corps en orbite */}
      <group ref={bodyRef}>
        <mesh scale={size} onClick={() => onSelect?.(slot)}>
          <sphereGeometry args={[1, 28, 28]} />
          <meshStandardMaterial
            color={bodyColor}
            emissive={emissive}
            emissiveIntensity={occupied ? 0.45 : 0.2}
            roughness={0.8}
            metalness={0.15}
            transparent
            opacity={occupied ? 1 : 0.5}
          />
        </mesh>
        {/* Halo */}
        <mesh scale={selected ? size * 3.4 : size * 1.9}>
          <sphereGeometry args={[1, 16, 16]} />
          <meshBasicMaterial
            color={emissive}
            transparent
            opacity={selected ? 0.32 : occupied ? 0.16 : 0.08}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
        {/* Anneau de sélection */}
        {selected && (
          <mesh rotation={[Math.PI / 2, 0, 0]} scale={size}>
            <ringGeometry args={[2.4, 2.7, 48]} />
            <meshBasicMaterial
              color="#7eecae"
              transparent
              opacity={0.7}
              side={THREE.DoubleSide}
            />
          </mesh>
        )}
      </group>
    </group>
  );
}

function Scene({ slots, selectedSlot, onSelect }: GalaxyViewProps) {
  const star = useMemo(() => {
    const first = slots[0]?.coordinates;
    return starProfile(first?.galaxy ?? 1, first?.system ?? 1);
  }, [slots]);

  const orbits = useMemo(
    () =>
      slots.map((slot) =>
        orbitProfile(slot.coordinates.galaxy, slot.coordinates.system, slot.coordinates.position),
      ),
    [slots],
  );

  return (
    <>
      <ambientLight intensity={0.18} />
      <Stars radius={70} depth={45} count={900} factor={3} saturation={0.4} fade speed={0.3} />
      <Star star={star} />
      {slots.map((slot, i) => (
        <OrbitBody
          key={`${slot.coordinates.galaxy}-${slot.coordinates.system}-${slot.coordinates.position}`}
          slot={slot}
          orbit={orbits[i]}
          selected={selectedSlot?.coordinates.position === slot.coordinates.position}
          onSelect={onSelect}
        />
      ))}
      <OrbitControls
        enablePan={false}
        enableZoom
        minDistance={6}
        maxDistance={20}
        autoRotate={!prefersReducedMotion}
        autoRotateSpeed={0.18}
        rotateSpeed={0.5}
        minPolarAngle={0.3}
        maxPolarAngle={Math.PI / 2.1}
      />
    </>
  );
}

export interface GalaxyViewProps {
  slots: GalaxySlot[];
  selectedSlot?: GalaxySlot | null;
  onSelect?: (slot: GalaxySlot) => void;
  className?: string;
}

export function GalaxyView({ slots, selectedSlot, onSelect, className = '' }: GalaxyViewProps) {
  return (
    <div className={className}>
      <Canvas
        camera={{ position: [0, 8, 11], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 1.7]}
      >
        <Suspense fallback={null}>
          <Scene slots={slots} selectedSlot={selectedSlot} onSelect={onSelect} />
        </Suspense>
      </Canvas>
    </div>
  );
}

export default GalaxyView;
