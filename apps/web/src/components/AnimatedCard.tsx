'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';
import { organicEase, softScale } from '@/lib/motion';

type GlowPreset = 'green' | 'purple' | 'none';

interface AnimatedCardProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  glowColor?: string;
  glow?: GlowPreset;
  hover?: boolean;
  onClick?: () => void;
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
  onClick,
}: AnimatedCardProps) {
  const resolvedGlowColor = glowColor ?? (glow ? glowPresets[glow] : defaultGlowColor);

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={softScale}
      transition={{
        duration: 0.45,
        delay,
        ease: organicEase,
      }}
      whileHover={
        hover
          ? { y: -3, scale: 1.006, transition: { duration: 0.22, ease: organicEase } }
          : undefined
      }
      whileTap={onClick ? { scale: 0.992 } : undefined}
      onClick={onClick}
      className={`group relative overflow-hidden rounded-xl border border-canopy-700/20 bg-bark-900/70 p-5 shadow-xl shadow-black/20 backdrop-blur-xl transition-colors hover:border-canopy-300/25 ${className}`}
      style={{
        boxShadow: `0 12px 36px -22px rgba(0,0,0,0.75), 0 0 0 0 ${resolvedGlowColor}`,
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget;
        el.style.boxShadow = `0 16px 42px -24px rgba(0,0,0,0.85), 0 0 28px -12px ${resolvedGlowColor}`;
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget;
        el.style.boxShadow = `0 12px 36px -22px rgba(0,0,0,0.75), 0 0 0 0 ${resolvedGlowColor}`;
      }}
    >
      {children}
    </motion.div>
  );
}

export default AnimatedCard;
