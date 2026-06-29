'use client';

import { useMemo } from 'react';
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

/** Précharge un GLB (avec le décodeur Draco local) pour éviter le pop-in. */
export function preloadModel(url: string): void {
  useGLTF.preload(url, DRACO_DECODER_PATH);
}
