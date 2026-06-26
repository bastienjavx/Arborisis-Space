'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';

export function CustomCursor() {
  const [mounted, setMounted] = useState(false);
  const [hovering, setHovering] = useState(false);
  const mx = useMotionValue(-200);
  const my = useMotionValue(-200);

  // Tight spring for the dot, loose for the ring
  const dotX = useSpring(mx, { stiffness: 1400, damping: 90 });
  const dotY = useSpring(my, { stiffness: 1400, damping: 90 });
  const ringX = useSpring(mx, { stiffness: 180, damping: 28 });
  const ringY = useSpring(my, { stiffness: 180, damping: 28 });

  const observerRef = useRef<MutationObserver | null>(null);

  const attachListeners = useCallback(() => {
    const interactives = document.querySelectorAll<Element>('a, button, [role="button"]');
    interactives.forEach((el) => {
      el.addEventListener('mouseenter', () => setHovering(true));
      el.addEventListener('mouseleave', () => setHovering(false));
    });
  }, []);

  useEffect(() => {
    setMounted(true);

    const onMove = (e: MouseEvent) => {
      mx.set(e.clientX);
      my.set(e.clientY);
    };
    window.addEventListener('mousemove', onMove);
    attachListeners();

    // Watch for DOM changes (menus, modals)
    observerRef.current = new MutationObserver(attachListeners);
    observerRef.current.observe(document.body, { childList: true, subtree: true });

    return () => {
      window.removeEventListener('mousemove', onMove);
      observerRef.current?.disconnect();
    };
  }, [mx, my, attachListeners]);

  if (!mounted) return null;

  return (
    <>
      <style>{`@media (pointer: fine) and (hover: hover) { * { cursor: none !important; } }`}</style>

      {/* Inner dot */}
      <motion.div
        className="pointer-events-none fixed z-[9998] rounded-full bg-canopy-400"
        style={{
          x: dotX,
          y: dotY,
          translateX: '-50%',
          translateY: '-50%',
          boxShadow: '0 0 8px rgba(22,191,108,0.95), 0 0 24px rgba(22,191,108,0.45)',
        }}
        animate={{ width: hovering ? 7 : 4, height: hovering ? 7 : 4 }}
        transition={{ duration: 0.15 }}
      />

      {/* Outer ring — lags behind */}
      <motion.div
        className="pointer-events-none fixed z-[9997] rounded-full border border-canopy-500/25"
        style={{
          x: ringX,
          y: ringY,
          translateX: '-50%',
          translateY: '-50%',
        }}
        animate={{ width: hovering ? 48 : 28, height: hovering ? 48 : 28, opacity: hovering ? 0.6 : 0.35 }}
        transition={{ duration: 0.22 }}
      />
    </>
  );
}
