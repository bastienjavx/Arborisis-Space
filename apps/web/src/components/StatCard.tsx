'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface StatCardProps {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
  delay?: number;
  color?: 'green' | 'purple' | 'gold' | 'red';
}

const colorClasses = {
  green: 'border-canopy-500/30 text-canopy-300',
  purple: 'border-spore-500/30 text-spore-400',
  gold: 'border-sap-400/30 text-sap-400',
  red: 'border-red-500/30 text-red-400',
};

export function StatCard({ label, value, hint, icon, delay = 0, color = 'green' }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className={`card flex min-w-[8.5rem] flex-col px-3 py-2 ${colorClasses[color]}`}
    >
      <div className="mb-1 flex items-center gap-2 text-canopy-100/50">
        {icon && <span className="text-lg">{icon}</span>}
        <span className="text-xs uppercase tracking-wide">{label}</span>
      </div>
      <div className="text-lg font-semibold">{value}</div>
      {hint && <div className="text-[11px] text-canopy-100/40">{hint}</div>}
    </motion.div>
  );
}

export default StatCard;
