'use client';

import { motion } from 'framer-motion';
import { ReactNode, useEffect, useState } from 'react';

interface GlowTextProps {
  children: ReactNode;
  className?: string;
  animate?: boolean;
  typing?: boolean;
  typingSpeed?: number;
  color?: 'green' | 'purple' | 'gold';
}

const colorMap = {
  green: {
    main: 'rgba(22, 191, 108,',
    fallback: '0 0 4px rgba(22,191,108,0.2), 0 0 12px rgba(22,191,108,0.1)',
  },
  purple: {
    main: 'rgba(123, 102, 240,',
    fallback: '0 0 4px rgba(123,102,240,0.2), 0 0 12px rgba(123,102,240,0.1)',
  },
  gold: {
    main: 'rgba(224, 169, 63,',
    fallback: '0 0 4px rgba(224,169,63,0.2), 0 0 12px rgba(224,169,63,0.1)',
  },
};

export default function GlowText({
  children,
  className = '',
  animate = true,
  typing = false,
  typingSpeed = 60,
  color = 'green',
}: GlowTextProps) {
  const text = typeof children === 'string' ? children : '';
  const [displayed, setDisplayed] = useState(typing ? '' : text);

  useEffect(() => {
    if (!typing || !text) {
      setDisplayed(text);
      return;
    }
    let i = 0;
    const interval = setInterval(() => {
      i += 1;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) clearInterval(interval);
    }, typingSpeed);
    return () => clearInterval(interval);
  }, [typing, text, typingSpeed]);

  const content = typing ? displayed : children;

  const palette = colorMap[color];
  const buildShadow = (alpha1: number, alpha2: number) =>
    `0 0 4px ${palette.main}${alpha1}), 0 0 12px ${palette.main}${alpha2})`;

  return (
    <motion.span
      className={className}
      animate={
        animate
          ? {
              textShadow: [buildShadow(0.2, 0.1), buildShadow(0.4, 0.2), buildShadow(0.2, 0.1)],
            }
          : undefined
      }
      transition={
        animate
          ? {
              duration: 3,
              repeat: Infinity,
              ease: 'easeInOut',
            }
          : undefined
      }
      style={animate ? { textShadow: palette.fallback } : undefined}
    >
      {content}
      {typing && displayed.length < text.length && (
        <motion.span
          className={`inline-block h-[1em] w-[2px] translate-y-[1px] align-middle ${
            color === 'purple' ? 'bg-spore-400' : color === 'gold' ? 'bg-sap-400' : 'bg-canopy-400'
          }`}
          animate={{ opacity: [1, 0] }}
          transition={{ duration: 0.6, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}
    </motion.span>
  );
}
