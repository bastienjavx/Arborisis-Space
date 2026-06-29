'use client';

import { Component, Suspense, useMemo, type ReactNode } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

/** Décodeur Draco hébergé localement (public/draco/) — aucune dépendance CDN. */
export const DRACO_DECODER_PATH = '/draco/';

/**
 * Charge un GLB compressé Draco, le clone (pour autoriser plusieurs instances du
 * même asset), puis le normalise : recentré sur l'origine et redimensionné pour
 * que sa plus grande dimension vaille `targetSize`. Réutilisable pour vaisseaux,
 * bâtiments et bases de planète.
 */
export function useModelAsset(url: string, targetSize = 1): THREE.Object3D {
  const { scene } = useGLTF(url, DRACO_DECODER_PATH);
  return useMemo(() => {
    const cloned = scene.clone(true) as unknown as THREE.Object3D;
    const box = new THREE.Box3().setFromObject(cloned);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const s = targetSize / maxDim;
    cloned.scale.setScalar(s);
    cloned.position.set(-center.x * s, -center.y * s, -center.z * s);
    return cloned;
  }, [scene, targetSize]);
}

/** Rend un GLB normalisé, prêt à être placé dans un groupe animé. */
export function ModelAsset({ url, targetSize = 1 }: { url: string; targetSize?: number }) {
  const model = useModelAsset(url, targetSize);
  return <primitive object={model} />;
}

/** Ne loguer qu'une fois par URL pour ne pas inonder la console. */
const warnedUrls = new Set<string>();

/**
 * Frontière d'erreur 3D : isole l'échec de chargement d'un GLB (réseau, GLB
 * absent, ou — cas réel observé en prod — un pointeur Git LFS servi tel quel à
 * la place du binaire) pour qu'il rende un repli au lieu de remonter en erreur
 * non gérée jusqu'au canvas (`THREE.WebGLRenderer: Context Lost`).
 */
class ModelErrorBoundary extends Component<
  { url: string; fallback: ReactNode; children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch(error: unknown): void {
    if (!warnedUrls.has(this.props.url)) {
      warnedUrls.add(this.props.url);
      // eslint-disable-next-line no-console
      console.warn(
        `[3D] Modèle indisponible (${this.props.url}) — repli procédural utilisé.`,
        error,
      );
    }
  }

  render(): ReactNode {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}

/**
 * `ModelAsset` tolérant aux pannes : enveloppe le chargement dans un `Suspense`
 * (pop-in) et une frontière d'erreur (repli). En cas d'échec, `fallback` est
 * rendu — la scène continue de tourner au lieu de perdre le contexte WebGL.
 */
export function SafeModelAsset({
  url,
  targetSize = 1,
  fallback = null,
}: {
  url: string;
  targetSize?: number;
  fallback?: ReactNode;
}) {
  return (
    <ModelErrorBoundary url={url} fallback={fallback}>
      <Suspense fallback={null}>
        <ModelAsset url={url} targetSize={targetSize} />
      </Suspense>
    </ModelErrorBoundary>
  );
}

/** Précharge un GLB (avec le décodeur Draco local) pour éviter le pop-in. */
export function preloadModel(url: string): void {
  useGLTF.preload(url, DRACO_DECODER_PATH);
}
