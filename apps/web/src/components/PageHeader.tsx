'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';
import { FiActivity } from 'react-icons/fi';

interface PageHeaderProps {
  title: ReactNode;
  subtitle?: string;
  children?: ReactNode;
  delay?: number;
}

export function PageHeader({ title, subtitle, children, delay = 0 }: PageHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay }}
      className="relative overflow-hidden rounded-2xl border border-canopy-700/15 bg-bark-900/45 px-5 py-5 backdrop-blur-xl sm:flex sm:items-end sm:justify-between sm:px-6 sm:py-6"
    >
      <div className="pointer-events-none absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-canopy-400/60 to-transparent" />
      <div className="relative">
        <div className="mb-3 flex items-center gap-2">
          <FiActivity className="h-3.5 w-3.5 text-canopy-400" aria-hidden="true" />
          <span className="section-kicker">Interface impériale</span>
        </div>
        <h1 className="text-2xl font-semibold tracking-[-0.035em] text-canopy-50 sm:text-3xl">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1.5 max-w-2xl text-sm leading-6 text-canopy-100/48">{subtitle}</p>
        )}
      </div>
      {children && <div className="relative mt-4 flex items-center gap-2 sm:mt-0">{children}</div>}
    </motion.div>
  );
}

export default PageHeader;
