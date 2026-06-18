'use client';

import { useRef, useMemo, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import * as THREE from 'three';
import type { GalaxySlot } from '@arborisis/shared';

function Sun() {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (meshRef.current) {
      meshRef.current.rotation.y = t * 0.05;
      meshRef.current.scale.setScalar(1 + Math.sin(t * 0.8) * 0.02);
    }
    if (glowRef.current) {
      glowRef.current.scale.setScalar(1.6 + Math.sin(t * 0.5) * 0.05);
    }
  });

  return (
    <group>
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.7, 64, 64]} />
        <meshBasicMaterial color="#f5c96b" />
      </mesh>
      <mesh ref={glowRef}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial
          color="#e0a93f"
          transparent
          opacity={0.15}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      <pointLight position={[0, 0, 0]} intensity={2} color="#f5c96b" distance={30} />
    </group>
  );
}

function OrbitRing({ radius }: { radius: number }) {
  return (
    <mesh rotation={[Math.PI / 2, 0, 0]}>
      <ringGeometry args={[radius, radius + 0.02, 128]} />
      <meshBasicMaterial color="#16bf6c" transparent opacity={0.08} side={THREE.DoubleSide} />
    </mesh>
  );
}

interface PlanetDotProps {
  slot: GalaxySlot;
  index: number;
  selected?: boolean;
  onSelect?: (slot: GalaxySlot) => void;
}

function PlanetDot({ slot, index, selected, onSelect }: PlanetDotProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  const orbit = useMemo(() => {
    const ringIndex = Math.floor(index / 5);
    const positionInRing = index % 5;
    const radius = 2.2 + ringIndex * 1.6;
    const angle = (positionInRing / 5) * Math.PI * 2 + ringIndex * 0.6;
    const speed = 0.08 / (ringIndex + 1);
    return { radius, angle, speed };
  }, [index]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const angle = orbit.angle + t * orbit.speed;
    const x = Math.cos(angle) * orbit.radius;
    const z = Math.sin(angle) * orbit.radius;
    if (meshRef.current) meshRef.current.position.set(x, 0, z);
    if (glowRef.current) glowRef.current.position.set(x, 0, z);
  });

  const color = slot.isOwn ? '#16bf6c' : slot.occupied ? '#7b66f0' : '#16bf6c';
  const size = slot.isOwn ? 0.16 : slot.occupied ? 0.13 : 0.08;
  const opacity = slot.occupied ? 0.9 : 0.35;

  return (
    <group>
      <mesh ref={meshRef} scale={size} onClick={() => onSelect?.(slot)}>
        <sphereGeometry args={[1, 24, 24]} />
        <meshBasicMaterial color={color} transparent opacity={opacity} />
      </mesh>
      <mesh ref={glowRef} scale={selected ? 0.35 : size * 2}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={selected ? 0.35 : 0.15}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

function Scene({ slots, selectedSlot, onSelect }: GalaxyViewProps) {
  const rings = useMemo(() => [2.2, 3.8, 5.4], []);

  return (
    <>
      <ambientLight intensity={0.15} />
      <Stars radius={60} depth={40} count={600} factor={3} saturation={0.4} fade speed={0.4} />
      <Sun />
      {rings.map((r) => (
        <OrbitRing key={r} radius={r} />
      ))}
      {slots.map((slot, i) => (
        <PlanetDot
          key={`${slot.coordinates.galaxy}-${slot.coordinates.system}-${slot.coordinates.position}`}
          slot={slot}
          index={i}
          selected={selectedSlot?.coordinates.position === slot.coordinates.position}
          onSelect={onSelect}
        />
      ))}
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
        camera={{ position: [0, 9, 9], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 1.5]}
      >
        <Suspense fallback={null}>
          <Scene slots={slots} selectedSlot={selectedSlot} onSelect={onSelect} />
        </Suspense>
      </Canvas>
    </div>
  );
}

export default GalaxyView;
