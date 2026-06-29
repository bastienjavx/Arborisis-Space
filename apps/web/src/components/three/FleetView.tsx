'use client';

import { useRef, useMemo, Suspense } from 'react';
import { useFrame } from '@react-three/fiber';
import { Stars } from '@react-three/drei';
import * as THREE from 'three';
import { SHIP_TYPES, ShipType, type ShipCounts } from '@arborisis/shared';
import { AdaptiveCanvas } from '@/components/three/AdaptiveCanvas';
import { ModelAsset, preloadModel } from '@/components/three/ModelAsset';
import { shouldPreload3dAssets, tier, useIsMobile } from '@/lib/device';
import { seedFromString, seededBoxPoints } from '@/components/three/visuals';

/** GLB par type de vaisseau — le slug correspond à l'enum (`ship_<type>.glb`). */
function shipModelUrl(type: ShipType): string {
  return `/models/ship_${type.toLowerCase()}.glb`;
}

/**
 * Empreinte (plus grande dimension, en unités de scène) par catégorie de
 * vaisseau : éclaireurs/drones petits, vaisseaux capitaux plus imposants.
 */
const SHIP_SIZE: Partial<Record<ShipType, number>> = {
  [ShipType.SPORAL_SCOUT]: 0.5,
  [ShipType.SPORAL_DRONE]: 0.5,
  [ShipType.SEED_POD]: 0.55,
  [ShipType.SHADOW_SPORE]: 0.6,
  [ShipType.MYCELIAL_TENDRIL]: 0.65,
  [ShipType.SPOROGENESIS_TITAN]: 1.15,
  [ShipType.BIOMASS_DREADNOUGHT]: 1.1,
  [ShipType.CHITIN_BULWARK]: 1.0,
  [ShipType.LUMINOUS_WARDEN]: 0.95,
};
const SHIP_SIZE_DEFAULT = 0.72;

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
      spin: 0.2 + ((seed >>> 12) % 30) / 100,
    };
  }, [activeMission, index, total, type]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (groupRef.current) {
      const angle = offset.angle + t * offset.speed;
      groupRef.current.position.x = Math.cos(angle) * offset.radius;
      groupRef.current.position.z = Math.sin(angle) * offset.radius;
      groupRef.current.position.y = offset.yOffset + Math.sin(t * 0.8 + index) * 0.15;
      groupRef.current.rotation.y = -angle + Math.PI / 2;
      groupRef.current.rotation.z = Math.sin(t * 1.5 + index) * 0.1;
      groupRef.current.scale.setScalar(
        offset.scale * (1 + Math.sin(t * 1.2 + offset.phase) * 0.025),
      );
    }
  });

  const targetSize = SHIP_SIZE[type] ?? SHIP_SIZE_DEFAULT;

  return (
    <group ref={groupRef}>
      <ModelAsset url={shipModelUrl(type)} targetSize={targetSize} />
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
      <ambientLight intensity={0.35} />
      <directionalLight position={[3, 5, 2]} intensity={0.9} color="#cfe8ff" />
      <directionalLight position={[-4, -2, -3]} intensity={0.3} color="#7b66f0" />
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

// Précharge tous les GLB de vaisseaux pour éviter le pop-in à l'affichage.
if (shouldPreload3dAssets()) {
  SHIP_TYPES.forEach((type) => preloadModel(shipModelUrl(type)));
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
