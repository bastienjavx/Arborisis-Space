'use client';

import { useRef, useMemo, Suspense } from 'react';
import { useFrame } from '@react-three/fiber';
import { MeshDistortMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { AdaptiveCanvas } from '@/components/three/AdaptiveCanvas';
import { tier, useIsMobile } from '@/lib/device';
import { ORGANIC_COLORS, seededBoxPoints, seededSphericalPoints } from '@/components/three/visuals';

function NoyauMonde({ segments }: { segments: number }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = state.clock.elapsedTime * 0.05;
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.08;
    }
  });

  return (
    <mesh ref={meshRef} scale={1.8}>
      <sphereGeometry args={[1, segments, segments]} />
      <MeshDistortMaterial
        color="#0a7a47"
        emissive="#0a9a56"
        emissiveIntensity={0.4}
        distort={0.3}
        speed={1.5}
        roughness={0.4}
        metalness={0.6}
      />
    </mesh>
  );
}

function SporeField({ count = 300, radius = 8, color = '#16bf6c', seed = 1 }) {
  const pointsRef = useRef<THREE.Points>(null);

  const [positions, sizes] = useMemo(() => {
    const cloud = seededSphericalPoints(seed, count, radius * 0.2, radius);
    return [cloud.positions, cloud.sizes];
  }, [count, radius, seed]);

  useFrame((state) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y = state.clock.elapsedTime * 0.02;
      pointsRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.03) * 0.1;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-size" args={[sizes, 1]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.05}
        color={color}
        transparent
        opacity={0.6}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

function FloatingOrbs({ count }: { count: number }) {
  const groupRef = useRef<THREE.Group>(null);

  const orbs = useMemo(() => {
    const positions = seededBoxPoints(9901, count, 10, 6, 8);
    return Array.from({ length: count }).map((_, i) => ({
      id: i,
      position: [positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]] as [
        number,
        number,
        number,
      ],
      scale: 0.025 + ((i * 17) % 7) * 0.007,
      speed: 0.32 + ((i * 11) % 9) * 0.045,
      offset: ((i * 37) % 360) * (Math.PI / 180),
      color:
        i % 3 === 0
          ? ORGANIC_COLORS.spore
          : i % 3 === 1
            ? ORGANIC_COLORS.sap
            : ORGANIC_COLORS.canopy,
    }));
  }, [count]);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.children.forEach((child, i) => {
        const t = state.clock.elapsedTime * orbs[i].speed + orbs[i].offset;
        child.position.y += Math.sin(t) * 0.002;
        child.position.x += Math.cos(t * 0.7) * 0.001;
      });
    }
  });

  return (
    <group ref={groupRef}>
      {orbs.map((orb) => (
        <mesh key={orb.id} position={orb.position} scale={orb.scale}>
          <sphereGeometry args={[1, 16, 16]} />
          <meshBasicMaterial color={orb.color} transparent opacity={0.5} />
        </mesh>
      ))}
    </group>
  );
}

function Scene({ mobile }: { mobile: boolean }) {
  return (
    <>
      <ambientLight intensity={0.3} color="#7eecae" />
      <pointLight position={[5, 5, 5]} intensity={0.8} color="#7b66f0" />
      <pointLight position={[-5, -3, 4]} intensity={0.5} color="#16bf6c" />
      <NoyauMonde segments={tier(mobile, 24, 64)} />
      <SporeField count={tier(mobile, 140, 400)} radius={7} color="#16bf6c" seed={1201} />
      <SporeField count={tier(mobile, 70, 200)} radius={5} color="#7b66f0" seed={1202} />
      <SporeField count={tier(mobile, 50, 150)} radius={9} color="#e0a93f" seed={1203} />
      <FloatingOrbs count={tier(mobile, 6, 12)} />
    </>
  );
}

export function OrganicBackgroundInner() {
  const mobile = useIsMobile();

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
      }}
    >
      <AdaptiveCanvas camera={{ position: [0, 0, 6], fov: 60 }} gl={{ alpha: true }} maxDpr={1.5}>
        <Suspense fallback={null}>
          <Scene mobile={mobile} />
        </Suspense>
      </AdaptiveCanvas>
    </div>
  );
}
