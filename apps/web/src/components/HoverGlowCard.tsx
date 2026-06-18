'use client';

import { motion } from 'framer-motion';
import { ReactNode, useRef } from 'react';

interface HoverGlowCardProps {
  children: ReactNode;
  className?: string;
  glowColor?: string;
}

export function HoverGlowCard({
  children,
  className = '',
  glowColor = 'rgba(22, 191, 108, 0.25)',
}: HoverGlowCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    card.style.setProperty('--glow-x', `${x}px`);
    card.style.setProperty('--glow-y', `${y}px`);
  };

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      initial={{ opacity: 0, y: 24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -4, scale: 1.01, transition: { duration: 0.3 } }}
      className={`group relative overflow-hidden rounded-2xl border border-canopy-700/20 bg-bark-900/70 p-5 shadow-lg backdrop-blur ${className}`}
      style={
        {
          '--glow-color': glowColor,
        } as React.CSSProperties
      }
    >
      <div
        className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: `radial-gradient(400px circle at var(--glow-x) var(--glow-y), var(--glow-color), transparent 40%)`,
        }}
      />
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}

export default HoverGlowCard;
