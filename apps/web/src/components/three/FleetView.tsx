'use client';

import { useRef, useMemo, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import * as THREE from 'three';
import { SHIP_TYPES, ShipType, type ShipCounts } from '@arborisis/shared';

const SHIP_COLORS: Record<ShipType, string> = {
  [ShipType.SPORAL_SCOUT]: '#16bf6c',
  [ShipType.SYMBIOTIC_HARVESTER]: '#7b66f0',
};

interface BioShipProps {
  type: ShipType;
  index: number;
  total: number;
}

function BioShip({ type, index, total }: BioShipProps) {
  const groupRef = useRef<THREE.Group>(null);
  const offset = useMemo(
    () => ({
      angle: (index / Math.max(1, total)) * Math.PI * 2,
      radius: 0.8 + (index % 3) * 0.5,
      speed: 0.4 + (index % 4) * 0.15,
      yOffset: (Math.random() - 0.5) * 1.2,
    }),
    [index, total],
  );

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (groupRef.current) {
      const angle = offset.angle + t * offset.speed;
      groupRef.current.position.x = Math.cos(angle) * offset.radius;
      groupRef.current.position.z = Math.sin(angle) * offset.radius;
      groupRef.current.position.y = offset.yOffset + Math.sin(t * 0.8 + index) * 0.15;
      groupRef.current.rotation.y = -angle;
      groupRef.current.rotation.z = Math.sin(t * 1.5 + index) * 0.1;
    }
  });

  const color = SHIP_COLORS[type];

  return (
    <group ref={groupRef}>
      {/* Main body */}
      <mesh scale={type === ShipType.SPORAL_SCOUT ? 0.12 : 0.18}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial color={color} />
      </mesh>
      {/* Glow */}
      <mesh scale={type === ShipType.SPORAL_SCOUT ? 0.25 : 0.32}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.25}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      {/* Tail tendrils */}
      {Array.from({ length: 3 }).map((_, i) => (
        <mesh key={i} position={[-0.15, 0, 0]} rotation={[0, 0, (i - 1) * 0.4]}>
          <capsuleGeometry args={[0.015, 0.25, 4, 8]} />
          <meshBasicMaterial color={color} transparent opacity={0.5} />
        </mesh>
      ))}
    </group>
  );
}

function TrailParticles({ count = 60 }) {
  const pointsRef = useRef<THREE.Points>(null);

  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 5;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 2;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 5;
    }
    return pos;
  }, [count]);

  useFrame((state) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y = state.clock.elapsedTime * 0.05;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.04}
        color="#16bf6c"
        transparent
        opacity={0.35}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

export interface FleetViewProps {
  ships: ShipCounts;
  className?: string;
}

function Scene({ ships }: FleetViewProps) {
  const shipList = useMemo(() => {
    const list: ShipType[] = [];
    SHIP_TYPES.forEach((type) => {
      const count = ships[type] ?? 0;
      for (let i = 0; i < Math.min(count, 24); i++) {
        list.push(type);
      }
    });
    return list;
  }, [ships]);

  if (shipList.length === 0) {
    return (
      <>
        <ambientLight intensity={0.2} />
        <Stars radius={50} depth={40} count={400} factor={3} saturation={0.4} fade speed={0.4} />
        <TrailParticles count={80} />
      </>
    );
  }

  return (
    <>
      <ambientLight intensity={0.2} />
      <Stars radius={50} depth={40} count={400} factor={3} saturation={0.4} fade speed={0.4} />
      {shipList.map((type, i) => (
        <BioShip key={i} type={type} index={i} total={shipList.length} />
      ))}
      <TrailParticles count={60} />
    </>
  );
}

export function FleetView({ ships, className = '' }: FleetViewProps) {
  return (
    <div className={className}>
      <Canvas
        camera={{ position: [0, 3, 5], fov: 55 }}
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 1.5]}
      >
        <Suspense fallback={null}>
          <Scene ships={ships} />
        </Suspense>
      </Canvas>
    </div>
  );
}

export default FleetView;
