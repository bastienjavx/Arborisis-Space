'use client';

import { Canvas, type CanvasProps } from '@react-three/fiber';
import { useEffect, useState } from 'react';
import { detectWebGL, isMobileDevice } from '@/lib/device';

export interface AdaptiveCanvasProps extends CanvasProps {
  /** Plafond du DPR sur desktop (réduit automatiquement sur mobile). */
  maxDpr?: number;
}

/**
 * Remplaçant direct de `<Canvas>` qui adapte le coût de rendu au terminal :
 *
 * - **DPR** plafonné plus bas sur mobile (1.25 vs `maxDpr`), pour ne pas
 *   multiplier le travail des fragments sur les écrans Retina.
 * - **Anti-aliasing** désactivé sur mobile (coûteux, peu visible à fort DPR).
 * - **Boucle de rendu mise en pause** quand le canvas sort du viewport
 *   (IntersectionObserver) ou que l'onglet passe en arrière-plan
 *   (`visibilitychange`). Évite que plusieurs contextes WebGL tournent à 60 fps
 *   en même temps — cause principale des saccades sur Safari iOS.
 *
 * Le rendu n'est monté qu'après hydratation pour que la détection d'appareil
 * soit fiable dès la première frame (et éviter tout mismatch SSR).
 */
export function AdaptiveCanvas({
  children,
  gl,
  dpr,
  maxDpr = 1.8,
  frameloop,
  ...props
}: AdaptiveCanvasProps) {
  const [mounted, setMounted] = useState(false);
  const [canvasEl, setCanvasEl] = useState<HTMLCanvasElement | null>(null);
  const [active, setActive] = useState(true);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!canvasEl) return;
    let onscreen = true;
    let visible = !document.hidden;
    const sync = () => setActive(onscreen && visible);

    const io = new IntersectionObserver(
      (entries) => {
        onscreen = entries[0]?.isIntersecting ?? true;
        sync();
      },
      { threshold: 0 },
    );
    io.observe(canvasEl);

    const onVisibility = () => {
      visible = !document.hidden;
      sync();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      io.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [canvasEl]);

  if (!mounted) return null;
  if (!detectWebGL()) return null;

  const mobile = isMobileDevice();
  const resolvedDpr =
    dpr ?? (mobile ? ([1, 1.25] as [number, number]) : ([1, maxDpr] as [number, number]));

  return (
    <Canvas
      dpr={resolvedDpr}
      frameloop={frameloop ?? (active ? 'always' : 'never')}
      gl={{ antialias: !mobile, powerPreference: 'high-performance', ...gl }}
      onCreated={(state) => setCanvasEl(state.gl.domElement)}
      {...props}
    >
      {children}
    </Canvas>
  );
}

export default AdaptiveCanvas;
