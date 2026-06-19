'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';

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
      className="relative border-b border-canopy-700/20 px-1 pb-5 pt-1 lg:flex lg:items-end lg:justify-between lg:gap-6 lg:px-2 lg:pb-6"
    >
      <div className="relative min-w-0">
        <h1 className="font-display text-3xl tracking-[-0.035em] text-canopy-50 sm:text-[2.75rem] sm:leading-none">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1.5 max-w-2xl text-sm leading-6 text-canopy-100/48">{subtitle}</p>
        )}
      </div>
      {children && (
        <div className="relative mt-4 flex min-w-0 flex-wrap items-end gap-2 lg:mt-0 lg:justify-end">
          {children}
        </div>
      )}
    </motion.div>
  );
}

export default PageHeader;
