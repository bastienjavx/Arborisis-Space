'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';

interface AnimatedCounterProps {
  value: number;
  className?: string;
  duration?: number;
}

export function AnimatedCounter({ value, className = '', duration = 1.5 }: AnimatedCounterProps) {
  const [display, setDisplay] = useState(0);
  const spring = useSpring(0, { stiffness: 50, damping: 20, duration: duration * 1000 });
  const rounded = useTransform(spring, (latest) => Math.floor(latest));

  useEffect(() => {
    spring.set(value);
  }, [value, spring]);

  useEffect(() => {
    const unsubscribe = rounded.on('change', (latest) => setDisplay(latest));
    return () => unsubscribe();
  }, [rounded]);

  return <motion.span className={className}>{display.toLocaleString('fr-FR')}</motion.span>;
}
