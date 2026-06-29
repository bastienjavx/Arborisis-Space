'use client';

import { useEffect, useState } from 'react';

/**
 * Détection « appareil mobile / GPU modeste ». Sert à dégrader le rendu 3D
 * (résolution de géométrie, octaves de bruit, densité de particules, DPR) sur
 * les terminaux tactiles — en particulier Safari iOS, sensible au coût des
 * shaders par-sommet et au nombre de contextes WebGL simultanés.
 */
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return (
    window.matchMedia('(pointer: coarse)').matches ||
    window.matchMedia('(max-width: 768px)').matches
  );
}

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function prefersDataSaver(): boolean {
  if (typeof navigator === 'undefined') return false;
  const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  return connection?.saveData === true;
}

export function shouldUseLowPowerMode(): boolean {
  return isMobileDevice() || prefersReducedMotion() || prefersDataSaver();
}

export function shouldPreload3dAssets(): boolean {
  return typeof window !== 'undefined' && !shouldUseLowPowerMode();
}

/** Hook réactif : `true` sur mobile/tactile, recalculé au redimensionnement. */
export function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(pointer: coarse), (max-width: 768px)');
    const update = () => setMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  return mobile;
}

export function useLowPowerMode(): boolean {
  const [lowPower, setLowPower] = useState(false);

  useEffect(() => {
    const mobileMq = window.matchMedia('(pointer: coarse), (max-width: 768px)');
    const motionMq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setLowPower(mobileMq.matches || motionMq.matches || prefersDataSaver());
    update();
    mobileMq.addEventListener('change', update);
    motionMq.addEventListener('change', update);
    return () => {
      mobileMq.removeEventListener('change', update);
      motionMq.removeEventListener('change', update);
    };
  }, []);

  return lowPower;
}

/** Choisit entre deux budgets selon le tier de l'appareil. */
export function tier<T>(mobile: boolean, mobileValue: T, desktopValue: T): T {
  return mobile ? mobileValue : desktopValue;
}
