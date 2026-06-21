'use client';

import { useRef, useMemo, Suspense } from 'react';
import { useFrame } from '@react-three/fiber';
import { MeshDistortMaterial, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { AdaptiveCanvas } from '@/components/three/AdaptiveCanvas';
import { tier, useIsMobile } from '@/lib/device';

function HeroPlanet({ segments }: { segments: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const ring1Ref = useRef<THREE.Mesh>(null);
  const ring2Ref = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (meshRef.current) {
      meshRef.current.rotation.y = t * 0.03;
      meshRef.current.rotation.x = Math.sin(t * 0.015) * 0.05;
    }
    if (ring1Ref.current) ring1Ref.current.rotation.z = t * 0.02;
    if (ring2Ref.current) ring2Ref.current.rotation.z = -t * 0.015;
  });

  return (
    <group>
      <mesh ref={meshRef} scale={2.2}>
        <sphereGeometry args={[1, segments, segments]} />
        <MeshDistortMaterial
          color="#0a7a47"
          emissive="#0a9a56"
          emissiveIntensity={0.3}
          distort={0.4}
          speed={1.5}
          roughness={0.4}
          metalness={0.6}
        />
      </mesh>
      <mesh ref={ring1Ref} rotation={[Math.PI / 2.2, 0, 0]}>
        <torusGeometry args={[3.2, 0.04, 16, 128]} />
        <meshBasicMaterial
          color="#16bf6c"
          transparent
          opacity={0.25}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <mesh ref={ring2Ref} rotation={[Math.PI / 2.2, 0.4, 0]}>
        <torusGeometry args={[3.9, 0.02, 16, 128]} />
        <meshBasicMaterial
          color="#7b66f0"
          transparent
          opacity={0.15}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <mesh scale={2.6}>
        <sphereGeometry args={[1, 64, 64]} />
        <meshBasicMaterial
          color="#16bf6c"
          transparent
          opacity={0.06}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

function FloatingSpores({ count = 100 }) {
  const pointsRef = useRef<THREE.Points>(null);

  const [positions, sizes] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const sz = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const r = 5 + Math.random() * 8;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);
      sz[i] = Math.random() * 2 + 0.5;
    }
    return [pos, sz];
  }, [count]);

  useFrame((state) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y = state.clock.elapsedTime * 0.015;
      pointsRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.01) * 0.05;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-size" args={[sizes, 1]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.06}
        color="#16bf6c"
        transparent
        opacity={0.5}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

function Scene({ mobile }: { mobile: boolean }) {
  return (
    <>
      <ambientLight intensity={0.25} color="#7eecae" />
      <pointLight position={[6, 4, 6]} intensity={1} color="#7b66f0" />
      <pointLight position={[-5, -3, 4]} intensity={0.6} color="#16bf6c" />
      <Stars
        radius={90}
        depth={60}
        count={tier(mobile, 400, 1000)}
        factor={4}
        saturation={0.5}
        fade
        speed={0.5}
      />
      <HeroPlanet segments={tier(mobile, 48, 128)} />
      <FloatingSpores count={tier(mobile, 60, 150)} />
    </>
  );
}

export function HeroScene({ className = '' }: { className?: string }) {
  const mobile = useIsMobile();

  return (
    <div className={className}>
      <AdaptiveCanvas camera={{ position: [0, 0, 10], fov: 50 }} gl={{ alpha: true }} maxDpr={1.5}>
        <Suspense fallback={null}>
          <Scene mobile={mobile} />
        </Suspense>
      </AdaptiveCanvas>
    </div>
  );
}

export default HeroScene;
