'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface AnimatedButtonProps {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'ghost' | 'danger';
  className?: string;
  type?: 'button' | 'submit' | 'reset';
  glow?: boolean;
  ariaLabel?: string;
}

const variantStyles = {
  primary:
    'bg-canopy-600 text-bark-950 hover:bg-canopy-500 shadow-[0_0_16px_-4px_rgba(22,191,108,0.4)]',
  ghost:
    'border border-canopy-700/30 text-canopy-100 hover:bg-canopy-700/15 hover:border-canopy-500/40',
  danger:
    'bg-red-900/40 text-red-200 border border-red-700/30 hover:bg-red-800/50 shadow-[0_0_16px_-4px_rgba(220,38,38,0.3)]',
};

export function AnimatedButton({
  children,
  onClick,
  disabled = false,
  loading = false,
  variant = 'primary',
  className = '',
  type = 'button',
  glow = false,
  ariaLabel,
}: AnimatedButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      aria-label={ariaLabel}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      whileHover={isDisabled ? {} : { scale: 1.015 }}
      whileTap={isDisabled ? {} : { scale: 0.98 }}
      className={`
        inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium
        transition-colors disabled:cursor-not-allowed disabled:opacity-40
        ${glow && !isDisabled ? 'animate-pulse-glow' : ''}
        ${variantStyles[variant]}
        ${className}
      `}
    >
      {loading && (
        <motion.span
          className="inline-block h-4 w-4 rounded-full border-2 border-current border-t-transparent"
          animate={{ rotate: 360 }}
          transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
        />
      )}
      {children}
    </motion.button>
  );
}

export default AnimatedButton;
