'use client';

import { useRef, useMemo, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { MeshDistortMaterial, Stars } from '@react-three/drei';
import * as THREE from 'three';

interface PlanetBodyProps {
  color?: string;
  emissive?: string;
}

function PlanetBody({ color = '#0a7a47', emissive = '#0a9a56' }: PlanetBodyProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const atmosphereRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (meshRef.current) {
      meshRef.current.rotation.y = t * 0.04;
      meshRef.current.rotation.x = Math.sin(t * 0.02) * 0.05;
    }
    if (ringRef.current) {
      ringRef.current.rotation.z = t * 0.015;
      ringRef.current.rotation.x = Math.sin(t * 0.01) * 0.02;
    }
    if (atmosphereRef.current) {
      atmosphereRef.current.rotation.y = t * 0.03;
    }
  });

  return (
    <group>
      {/* Core planet */}
      <mesh ref={meshRef} scale={1.6}>
        <sphereGeometry args={[1, 128, 128]} />
        <MeshDistortMaterial
          color={color}
          emissive={emissive}
          emissiveIntensity={0.25}
          distort={0.35}
          speed={1.2}
          roughness={0.45}
          metalness={0.55}
        />
      </mesh>

      {/* Atmosphere glow */}
      <mesh ref={atmosphereRef} scale={1.85}>
        <sphereGeometry args={[1, 64, 64]} />
        <meshBasicMaterial
          color={emissive}
          transparent
          opacity={0.08}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Organic rings */}
      <mesh ref={ringRef} rotation={[Math.PI / 2.5, 0, 0]}>
        <torusGeometry args={[2.8, 0.03, 16, 128]} />
        <meshBasicMaterial
          color="#16bf6c"
          transparent
          opacity={0.35}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <mesh rotation={[Math.PI / 2.5, 0, 0]}>
        <torusGeometry args={[3.2, 0.015, 16, 128]} />
        <meshBasicMaterial
          color="#7b66f0"
          transparent
          opacity={0.2}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Surface detail dots */}
      {useMemo(
        () =>
          Array.from({ length: 24 }).map((_, i) => {
            const phi = Math.acos(2 * Math.random() - 1);
            const theta = Math.random() * Math.PI * 2;
            const r = 1.62;
            return (
              <mesh
                key={i}
                position={[
                  r * Math.sin(phi) * Math.cos(theta),
                  r * Math.sin(phi) * Math.sin(theta),
                  r * Math.cos(phi),
                ]}
              >
                <sphereGeometry args={[0.02 + Math.random() * 0.03, 8, 8]} />
                <meshBasicMaterial color="#7eecae" transparent opacity={0.4} />
              </mesh>
            );
          }),
        [],
      )}
    </group>
  );
}

function OrbitingSpores({ count = 80, radius = 4, speed = 0.3, color = '#16bf6c' }) {
  const pointsRef = useRef<THREE.Points>(null);

  const [positions, sizes] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const sz = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = radius * (0.8 + Math.random() * 0.4);
      const y = (Math.random() - 0.5) * 0.6;
      pos[i * 3] = r * Math.cos(angle);
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = r * Math.sin(angle);
      sz[i] = Math.random() * 1.5 + 0.5;
    }
    return [pos, sz];
  }, [count, radius]);

  useFrame((state) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y = state.clock.elapsedTime * speed;
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

function Moons() {
  const groupRef = useRef<THREE.Group>(null);
  const moons = useMemo(
    () => [
      { distance: 3.8, speed: 0.4, size: 0.12, color: '#7b66f0' },
      { distance: 5.2, speed: 0.25, size: 0.08, color: '#e0a93f' },
    ],
    [],
  );

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.children.forEach((child, i) => {
        const t = state.clock.elapsedTime * moons[i].speed;
        child.position.x = Math.cos(t) * moons[i].distance;
        child.position.z = Math.sin(t) * moons[i].distance;
      });
    }
  });

  return (
    <group ref={groupRef}>
      {moons.map((moon, i) => (
        <mesh key={i} scale={moon.size}>
          <sphereGeometry args={[1, 24, 24]} />
          <meshBasicMaterial color={moon.color} />
        </mesh>
      ))}
    </group>
  );
}

function Scene() {
  return (
    <>
      <ambientLight intensity={0.2} color="#7eecae" />
      <pointLight position={[6, 4, 6]} intensity={1.2} color="#7b66f0" />
      <pointLight position={[-5, -3, 4]} intensity={0.7} color="#16bf6c" />
      <pointLight position={[0, 0, -6]} intensity={0.4} color="#e0a93f" />
      <Stars radius={80} depth={50} count={800} factor={3} saturation={0.5} fade speed={0.5} />
      <PlanetBody />
      <OrbitingSpores count={120} radius={4.2} speed={0.12} color="#16bf6c" />
      <OrbitingSpores count={60} radius={5.5} speed={-0.08} color="#7b66f0" />
      <Moons />
    </>
  );
}

interface PlanetViewProps {
  className?: string;
}

export function PlanetView({ className = '' }: PlanetViewProps) {
  return (
    <div className={`${className}`}>
      <Canvas
        camera={{ position: [0, 0, 8], fov: 50 }}
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 1.5]}
      >
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </Canvas>
    </div>
  );
}

export default PlanetView;
