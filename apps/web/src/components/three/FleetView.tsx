'use client';

import { useRef, useMemo, Suspense } from 'react';
import { useFrame } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import * as THREE from 'three';
import { SHIP_TYPES, ShipType, type ShipCounts } from '@arborisis/shared';
import { AdaptiveCanvas } from '@/components/three/AdaptiveCanvas';
import { tier, useIsMobile } from '@/lib/device';
import { seedFromString, seededBoxPoints } from '@/components/three/visuals';

const SHIP_COLORS: Record<ShipType, string> = {
  [ShipType.SPORAL_SCOUT]: '#16bf6c',
  [ShipType.SYMBIOTIC_HARVESTER]: '#7b66f0',
  [ShipType.MYCELIAL_TENDRIL]: '#22d3ee',
  [ShipType.CHITIN_FREIGHTER]: '#f59e0b',
  [ShipType.BIOLUMINESCENT_CRUISER]: '#a78bfa',
  [ShipType.SPOROGENESIS_TITAN]: '#f97316',
  [ShipType.SPORAL_DRONE]: '#4ade80',
  [ShipType.ACID_BOMBER]: '#84cc16',
  [ShipType.CHITIN_DESTROYER]: '#d946ef',
  [ShipType.BIOMASS_DREADNOUGHT]: '#7c2d12',
  [ShipType.SEED_POD]: '#fbbf24',
  [ShipType.SHADOW_SPORE]: '#475569',
  [ShipType.ORBITAL_THORN]: '#0ea5e9',
  [ShipType.SPORAL_SWARM]: '#2dd4bf',
  [ShipType.LUMINOUS_WARDEN]: '#fde047',
  [ShipType.CHITIN_BULWARK]: '#991b1b',
};

interface BioShipProps {
  type: ShipType;
  index: number;
  total: number;
  activeMission?: boolean;
}

function BioShip({ type, index, total, activeMission }: BioShipProps) {
  const groupRef = useRef<THREE.Group>(null);
  const offset = useMemo(() => {
    const seed = seedFromString(`${type}:${index}:${total}`);
    const yJitter = (((seed >>> 8) % 1000) / 1000 - 0.5) * 1.2;
    return {
      angle: (index / Math.max(1, total)) * Math.PI * 2,
      radius: 0.8 + (index % 3) * 0.5,
      speed: (activeMission ? 0.58 : 0.38) + (index % 4) * 0.12,
      yOffset: yJitter,
      phase: ((seed >>> 16) % 628) / 100,
      scale: 0.86 + ((seed >>> 20) % 26) / 100,
    };
  }, [activeMission, index, total, type]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (groupRef.current) {
      const angle = offset.angle + t * offset.speed;
      groupRef.current.position.x = Math.cos(angle) * offset.radius;
      groupRef.current.position.z = Math.sin(angle) * offset.radius;
      groupRef.current.position.y = offset.yOffset + Math.sin(t * 0.8 + index) * 0.15;
      groupRef.current.rotation.y = -angle;
      groupRef.current.rotation.z = Math.sin(t * 1.5 + index) * 0.1;
      groupRef.current.scale.setScalar(
        offset.scale * (1 + Math.sin(t * 1.2 + offset.phase) * 0.025),
      );
    }
  });

  const color = SHIP_COLORS[type];

  return (
    <group ref={groupRef}>
      <mesh scale={[0.16, 0.1, type === ShipType.SPORAL_SCOUT ? 0.28 : 0.42]}>
        <sphereGeometry args={[1, 20, 20]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.22}
          roughness={0.62}
          metalness={0.08}
        />
      </mesh>
      <mesh scale={type === ShipType.SPORAL_SCOUT ? 0.25 : 0.36}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={activeMission ? 0.34 : 0.22}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      {Array.from({ length: 4 }).map((_, i) => (
        <mesh key={i} position={[0, 0, 0.24 + i * 0.055]} rotation={[0.35, 0, (i - 1.5) * 0.36]}>
          <capsuleGeometry args={[0.012, 0.25 + i * 0.025, 4, 8]} />
          <meshBasicMaterial color={color} transparent opacity={activeMission ? 0.62 : 0.42} />
        </mesh>
      ))}
    </group>
  );
}

function TrailParticles({ count = 60, activeMission = false }) {
  const pointsRef = useRef<THREE.Points>(null);

  const positions = useMemo(() => seededBoxPoints(4407, count, 5.2, 2.4, 5.2), [count]);

  useFrame((state) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y = state.clock.elapsedTime * 0.05;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={activeMission ? 0.055 : 0.04}
        color="#16bf6c"
        transparent
        opacity={activeMission ? 0.48 : 0.32}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

export interface FleetViewProps {
  ships: ShipCounts;
  activeMission?: boolean;
  className?: string;
}

function Scene({ ships, activeMission, mobile }: FleetViewProps & { mobile: boolean }) {
  const cap = tier(mobile, 12, 24);
  const shipList = useMemo(() => {
    const list: ShipType[] = [];
    SHIP_TYPES.forEach((type) => {
      const count = ships[type] ?? 0;
      for (let i = 0; i < Math.min(count, cap); i++) {
        list.push(type);
      }
    });
    return list;
  }, [ships, cap]);

  const starCount = tier(mobile, 220, 400);

  if (shipList.length === 0) {
    return (
      <>
        <ambientLight intensity={0.2} />
        <Stars
          radius={50}
          depth={40}
          count={starCount}
          factor={3}
          saturation={0.4}
          fade
          speed={0.4}
        />
        <TrailParticles count={tier(mobile, 40, 80)} activeMission={activeMission} />
      </>
    );
  }

  return (
    <>
      <ambientLight intensity={0.2} />
      <Stars
        radius={50}
        depth={40}
        count={starCount}
        factor={3}
        saturation={0.4}
        fade
        speed={0.4}
      />
      {shipList.map((type, i) => (
        <BioShip
          key={`${type}-${i}`}
          type={type}
          index={i}
          total={shipList.length}
          activeMission={activeMission}
        />
      ))}
      <TrailParticles count={tier(mobile, 30, 60)} activeMission={activeMission} />
    </>
  );
}

export function FleetView({ ships, activeMission, className = '' }: FleetViewProps) {
  const mobile = useIsMobile();

  return (
    <div className={className}>
      <AdaptiveCanvas camera={{ position: [0, 3, 5], fov: 55 }} gl={{ alpha: true }} maxDpr={1.5}>
        <Suspense fallback={null}>
          <Scene ships={ships} activeMission={activeMission} mobile={mobile} />
        </Suspense>
      </AdaptiveCanvas>
    </div>
  );
}

export default FleetView;
