'use client';

import { useRef, useMemo, Suspense } from 'react';
import { useFrame } from '@react-three/fiber';
import { Stars, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { PlanetType } from '@arborisis/shared';
import { planetProfile, seedFromCoords, type PlanetProfile } from '@/lib/procgen';
import { AdaptiveCanvas } from '@/components/three/AdaptiveCanvas';
import { tier, useIsMobile } from '@/lib/device';
import { makeGlowMaterial, specializationColor } from '@/components/three/visuals';

const prefersReducedMotion =
  typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;

/* ------------------------------------------------------------------ *
 * Bruit simplex 3D (Ashima / Stefan Gustavson) + FBM — partagé par les
 * shaders de surface et de nuages. Génère continents, reliefs et bandes.
 * ------------------------------------------------------------------ */
const NOISE_GLSL = /* glsl */ `
vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x,289.0);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0);
  const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy));
  vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);
  vec3 l=1.0-g;
  vec3 i1=min(g.xyz,l.zxy);
  vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+1.0*C.xxx;
  vec3 x2=x0-i2+2.0*C.xxx;
  vec3 x3=x0-1.0+3.0*C.xxx;
  i=mod(i,289.0);
  vec4 p=permute(permute(permute(
    i.z+vec4(0.0,i1.z,i2.z,1.0))
    +i.y+vec4(0.0,i1.y,i2.y,1.0))
    +i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=1.0/7.0;
  vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z);
  vec4 x_=floor(j*ns.z);
  vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy;
  vec4 y=y_*ns.x+ns.yyyy;
  vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);
  vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0;
  vec4 s1=floor(b1)*2.0+1.0;
  vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;
  vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);
  vec3 p1=vec3(a0.zw,h.y);
  vec3 p2=vec3(a1.xy,h.z);
  vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);
  m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}
float fbm(vec3 p){
  float f=0.0,amp=0.5;
  for(int i=0;i<FBM_OCTAVES;i++){f+=amp*snoise(p);p*=2.03;amp*=0.5;}
  return f;
}
`;

/** Préfixe le bruit du nombre d'octaves FBM (5 desktop, 3 mobile). */
function noiseGlsl(octaves: number): string {
  return `#define FBM_OCTAVES ${octaves}\n${NOISE_GLSL}`;
}

export interface PlanetActivity {
  construction?: boolean;
  specialization?: string | null;
  stability?: number;
}

function makeCloudMaterial(
  color: THREE.Color,
  coverage: number,
  octaves: number,
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uCoverage: { value: coverage },
      uColor: { value: color },
      uLight: { value: new THREE.Vector3(1, 0.4, 0.7).normalize() },
    },
    vertexShader: /* glsl */ `
      varying vec3 vPos;
      varying vec3 vNormalW;
      void main(){
        vPos = normalize(position);
        vNormalW = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      ${noiseGlsl(octaves)}
      uniform float uTime;
      uniform float uCoverage;
      uniform vec3 uColor;
      uniform vec3 uLight;
      varying vec3 vPos;
      varying vec3 vNormalW;
      void main(){
        vec3 q = vPos * 2.2 + vec3(uTime * 0.02, 0.0, 0.0);
        float n = fbm(q) * 0.5 + 0.5;
        float a = smoothstep(1.0 - uCoverage, 1.0, n);
        if(a < 0.01) discard;
        float diff = clamp(dot(normalize(vNormalW), uLight), 0.0, 1.0);
        gl_FragColor = vec4(uColor * (0.4 + diff * 0.7), a * 0.55);
      }
    `,
  });
}

/**
 * Surface planétaire entièrement procédurale (remplace l'ancien GLB de base).
 * Un FBM 3D déplace les sommets (continents, reliefs) ; le fragment compose une
 * rampe d'altitude océan → plaines → reliefs → sommets à partir des couleurs du
 * biome, un relief calculé par dérivées d'écran (`dFdx/dFdy`) et un terminateur
 * jour/nuit avec lueur bioluminescente côté nuit. Coût ajustable via `octaves`.
 */
function makeSurfaceMaterial(profile: PlanetProfile, octaves: number): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    // `dFdx/dFdy` du fragment exigent l'extension dérivées (WebGL1/GLSL1).
    extensions: { derivatives: true } as THREE.ShaderMaterialParameters['extensions'],
    uniforms: {
      uTime: { value: 0 },
      uOcean: { value: new THREE.Color(profile.colorOcean) },
      uLow: { value: new THREE.Color(profile.colorLow) },
      uMid: { value: new THREE.Color(profile.colorMid) },
      uHigh: { value: new THREE.Color(profile.colorHigh) },
      uGlow: { value: new THREE.Color(profile.colorAtmosphere) },
      uLight: { value: new THREE.Vector3(6, 2.5, 5).normalize() },
    },
    vertexShader: /* glsl */ `
      ${noiseGlsl(octaves)}
      uniform float uTime;
      varying float vElev;
      varying vec3 vWorldPos;
      varying vec3 vSphereN;
      void main(){
        vec3 dir = normalize(position);
        // Élévation -1..1 ; on aplatit les océans pour un littoral net.
        float e = fbm(dir * 1.9);
        float land = smoothstep(-0.04, 0.10, e);
        float relief = mix(-0.012, e * 0.085, land);
        vElev = e;
        vSphereN = dir;
        vec3 displaced = position + dir * relief;
        vec4 world = modelMatrix * vec4(displaced, 1.0);
        vWorldPos = world.xyz;
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uOcean;
      uniform vec3 uLow;
      uniform vec3 uMid;
      uniform vec3 uHigh;
      uniform vec3 uGlow;
      uniform vec3 uLight;
      varying float vElev;
      varying vec3 vWorldPos;
      varying vec3 vSphereN;
      void main(){
        // Normale de relief reconstruite à partir des dérivées d'écran.
        vec3 n = normalize(cross(dFdx(vWorldPos), dFdy(vWorldPos)));
        if(dot(n, vSphereN) < 0.0) n = -n;
        float e = vElev;
        // Rampe d'altitude.
        vec3 col = uOcean;
        col = mix(col, uLow,  smoothstep(-0.02, 0.10, e));
        col = mix(col, uMid,  smoothstep(0.10, 0.34, e));
        col = mix(col, uHigh, smoothstep(0.34, 0.62, e));
        float diff = clamp(dot(n, normalize(uLight)), 0.0, 1.0);
        float night = clamp(dot(vSphereN, normalize(uLight)) * -1.0, 0.0, 1.0);
        vec3 lit = col * (0.18 + diff * 1.05);
        // Lueur bioluminescente côté nuit sur les terres.
        lit += uGlow * night * smoothstep(0.05, 0.3, e) * 0.22;
        gl_FragColor = vec4(lit, 1.0);
      }
    `,
  });
}

function ProceduralSurface({
  profile,
  octaves,
  seg,
}: {
  profile: PlanetProfile;
  octaves: number;
  seg: number;
}) {
  const material = useMemo(() => makeSurfaceMaterial(profile, octaves), [profile, octaves]);
  useFrame((state) => {
    material.uniforms.uTime.value = state.clock.elapsedTime;
  });
  return (
    <mesh>
      <sphereGeometry args={[1, seg, seg]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}

interface Quality {
  /** Segments de la sphère de surface (relief déplacé par-sommet). */
  surfaceSeg: number;
  cloudSeg: number;
  atmoSeg: number;
  /** Octaves du FBM dans les shaders. */
  octaves: number;
  starCount: number;
}

function ProceduralPlanet({
  profile,
  quality,
  activity,
}: {
  profile: PlanetProfile;
  quality: Quality;
  activity?: PlanetActivity;
}) {
  const tiltRef = useRef<THREE.Group>(null);
  const surfaceRef = useRef<THREE.Group>(null);
  const cloudRef = useRef<THREE.Mesh>(null);
  const activityColor = specializationColor(activity?.specialization);
  const activityLevel = Math.max(
    activity?.construction ? 0.42 : 0,
    activity?.specialization ? 0.28 : 0,
  );

  const cloudMat = useMemo(
    () => makeCloudMaterial(new THREE.Color('#dff5ea'), profile.clouds, quality.octaves),
    [profile, quality.octaves],
  );
  const atmoUniforms = useMemo(
    () => ({
      uColor: { value: new THREE.Color(profile.colorAtmosphere) },
      uStrength: { value: profile.atmosphere * (0.85 + activityLevel * 0.35) },
    }),
    [profile, activityLevel],
  );

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    cloudMat.uniforms.uTime.value = t;
    if (surfaceRef.current) surfaceRef.current.rotation.y += delta * profile.spin;
    if (cloudRef.current) cloudRef.current.rotation.y += delta * profile.spin * 1.35;
  });

  const hasClouds = profile.clouds > 0.02;

  return (
    <group ref={tiltRef} rotation={[profile.axialTilt, 0, 0]} scale={1.7}>
      {/* Surface procédurale (FBM 3D : continents, relief, rampe d'altitude). */}
      <group ref={surfaceRef}>
        <ProceduralSurface profile={profile} octaves={quality.octaves} seg={quality.surfaceSeg} />
      </group>

      {/* Couche nuageuse */}
      {hasClouds && (
        <mesh ref={cloudRef} scale={1.015}>
          <sphereGeometry args={[1, quality.cloudSeg, quality.cloudSeg]} />
          <primitive object={cloudMat} attach="material" />
        </mesh>
      )}

      {/* Halo atmosphérique (Fresnel) */}
      <mesh scale={1.14}>
        <sphereGeometry args={[1, quality.atmoSeg, quality.atmoSeg]} />
        <shaderMaterial
          transparent
          depthWrite={false}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          uniforms={atmoUniforms}
          vertexShader={
            /* glsl */ `
            varying vec3 vN;
            void main(){
              vN = normalize(normalMatrix * normal);
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
            }
          `
          }
          fragmentShader={
            /* glsl */ `
            uniform vec3 uColor;
            uniform float uStrength;
            varying vec3 vN;
            void main(){
              float f = pow(1.0 - abs(vN.z), 2.4);
              gl_FragColor = vec4(uColor, f * uStrength * 0.6);
            }
          `
          }
        />
      </mesh>

      {/* Anneaux seedés */}
      {profile.rings && <PlanetRings rings={profile.rings} quality={quality} />}

      {(activity?.construction || activity?.specialization) && (
        <ActivityHalo color={activityColor} construction={activity.construction} />
      )}

      {/* Lunes */}
      <Moons profile={profile} />
    </group>
  );
}

function PlanetRings({
  rings,
  quality,
}: {
  rings: NonNullable<PlanetProfile['rings']>;
  quality: Quality;
}) {
  const ringRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (ringRef.current) ringRef.current.rotation.z = state.clock.elapsedTime * 0.018;
  });

  return (
    <group ref={ringRef} rotation={[Math.PI / 2 + rings.tilt, 0, 0]}>
      {[0, 1, 2].map((band) => (
        <mesh key={band}>
          <ringGeometry
            args={[
              rings.inner + band * 0.12,
              Math.min(rings.outer, rings.inner + band * 0.12 + 0.08),
              quality.atmoSeg * 2,
            ]}
          />
          <meshBasicMaterial
            color={band === 1 ? '#d9f99d' : rings.color}
            transparent
            opacity={rings.opacity * (band === 1 ? 0.42 : 0.72)}
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}

function ActivityHalo({ color, construction }: { color: string; construction?: boolean }) {
  const groupRef = useRef<THREE.Group>(null);
  const material = useMemo(
    () => makeGlowMaterial(color, construction ? 0.3 : 0.2),
    [color, construction],
  );

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    groupRef.current.rotation.y = t * 0.16;
    groupRef.current.rotation.z = Math.sin(t * 0.5) * 0.08;
  });

  return (
    <group ref={groupRef}>
      <mesh rotation={[Math.PI / 2.35, 0, 0]} scale={1.12}>
        <torusGeometry args={[1.38, construction ? 0.012 : 0.008, 8, 144]} />
        <primitive object={material} attach="material" />
      </mesh>
      <mesh rotation={[Math.PI / 2.65, 0.35, 0]} scale={1.08}>
        <torusGeometry args={[1.55, 0.006, 8, 144]} />
        <meshBasicMaterial
          color="#d9f99d"
          transparent
          opacity={construction ? 0.16 : 0.1}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

function Moons({ profile }: { profile: PlanetProfile }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!groupRef.current) return;
    groupRef.current.children.forEach((child, i) => {
      const m = profile.moons[i];
      const t = state.clock.elapsedTime * m.speed + m.phase;
      child.position.set(Math.cos(t) * m.distance, Math.sin(t) * 0.3, Math.sin(t) * m.distance);
    });
  });

  return (
    <group ref={groupRef}>
      {profile.moons.map((m, i) => (
        <mesh key={i} scale={m.size}>
          <sphereGeometry args={[1, 20, 20]} />
          <meshStandardMaterial
            color={m.color}
            emissive={m.color}
            emissiveIntensity={0.08}
            roughness={0.9}
            metalness={0.1}
          />
        </mesh>
      ))}
    </group>
  );
}

function Scene({
  profile,
  quality,
  activity,
}: {
  profile: PlanetProfile;
  quality: Quality;
  activity?: PlanetActivity;
}) {
  const stability = typeof activity?.stability === 'number' ? activity.stability : 100;
  const stabilityGlow = THREE.MathUtils.clamp(stability / 100, 0.35, 1);

  return (
    <>
      <ambientLight intensity={0.18 + stabilityGlow * 0.08} color="#9fe7c4" />
      <directionalLight position={[6, 2.5, 5]} intensity={1.5} color="#fff4e0" />
      <pointLight position={[-6, -2, 3]} intensity={0.4} color={profile.colorAtmosphere} />
      <Stars
        radius={90}
        depth={50}
        count={quality.starCount}
        factor={3.2}
        saturation={0.4}
        fade
        speed={0.4}
      />
      <ProceduralPlanet profile={profile} quality={quality} activity={activity} />
      <OrbitControls
        enablePan={false}
        enableZoom
        minDistance={3.4}
        maxDistance={9}
        autoRotate={!prefersReducedMotion}
        autoRotateSpeed={0.35}
        rotateSpeed={0.5}
      />
    </>
  );
}

export interface PlanetViewProps {
  className?: string;
  /** Coordonnées de la planète — graine de génération procédurale. */
  galaxy?: number;
  system?: number;
  position?: number;
  planetType?: PlanetType;
  activity?: PlanetActivity;
}

export function PlanetView({
  className = '',
  galaxy = 1,
  system = 1,
  position = 1,
  planetType = PlanetType.VERDANT,
  activity,
}: PlanetViewProps) {
  const mobile = useIsMobile();
  const profile = useMemo(
    () => planetProfile(seedFromCoords(galaxy, system, position), planetType),
    [galaxy, system, position, planetType],
  );
  const quality = useMemo<Quality>(
    () => ({
      surfaceSeg: tier(mobile, 64, 128),
      cloudSeg: tier(mobile, 40, 96),
      atmoSeg: tier(mobile, 32, 64),
      octaves: tier(mobile, 3, 5),
      starCount: tier(mobile, 500, 1200),
    }),
    [mobile],
  );

  return (
    <div className={className}>
      <AdaptiveCanvas camera={{ position: [0, 0.6, 6], fov: 48 }} gl={{ alpha: true }} maxDpr={1.8}>
        <Suspense fallback={null}>
          <Scene profile={profile} quality={quality} activity={activity} />
        </Suspense>
      </AdaptiveCanvas>
    </div>
  );
}

export default PlanetView;
