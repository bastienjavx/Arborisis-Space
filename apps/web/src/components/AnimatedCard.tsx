'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';

type GlowPreset = 'green' | 'purple' | 'none';

interface AnimatedCardProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  glowColor?: string;
  glow?: GlowPreset;
  hover?: boolean;
}

const defaultGlowColor = 'rgba(22, 191, 108, 0.25)';

const glowPresets: Record<GlowPreset, string> = {
  green: 'rgba(22, 191, 108, 0.25)',
  purple: 'rgba(123, 102, 240, 0.25)',
  none: 'transparent',
};

export function AnimatedCard({
  children,
  className = '',
  delay = 0,
  glowColor,
  glow,
  hover = true,
}: AnimatedCardProps) {
  const resolvedGlowColor = glowColor ?? (glow ? glowPresets[glow] : defaultGlowColor);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.6,
        delay,
        ease: [0.22, 1, 0.36, 1],
      }}
      whileHover={hover ? { y: -4, scale: 1.01, transition: { duration: 0.3 } } : undefined}
      className={`group relative rounded-2xl border border-canopy-700/20 bg-bark-900/70 p-5 shadow-lg backdrop-blur ${className}`}
      style={{
        boxShadow: `0 4px 24px -4px rgba(0,0,0,0.4), 0 0 0 0 ${resolvedGlowColor}`,
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget;
        el.style.boxShadow = `0 8px 32px -4px rgba(0,0,0,0.5), 0 0 24px 4px ${resolvedGlowColor}`;
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget;
        el.style.boxShadow = `0 4px 24px -4px rgba(0,0,0,0.4), 0 0 0 0 ${resolvedGlowColor}`;
      }}
    >
      {children}
    </motion.div>
  );
}

export default AnimatedCard;
