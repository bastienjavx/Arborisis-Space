'use client';

import { motion } from 'framer-motion';
import { type ReactNode } from 'react';
import { fadeUp, organicEase, staggerChildren } from '@/lib/motion';

interface StaggerContainerProps {
  children: ReactNode;
  className?: string;
  staggerDelay?: number;
}

export function StaggerContainer({
  children,
  className = '',
  staggerDelay = 0.1,
}: StaggerContainerProps) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={staggerChildren(staggerDelay)}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      variants={fadeUp}
      transition={{ duration: 0.5, ease: organicEase }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
