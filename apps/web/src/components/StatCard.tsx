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
  green: 'border-canopy-500/20 text-canopy-300',
  purple: 'border-spore-500/20 text-spore-400',
  gold: 'border-sap-400/20 text-sap-400',
  red: 'border-red-500/20 text-red-400',
};

export function StatCard({ label, value, hint, icon, delay = 0, color = 'green' }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className={`flex min-w-[9.5rem] flex-col rounded-lg border bg-bark-950/45 px-4 py-3 shadow-lg shadow-black/10 backdrop-blur ${colorClasses[color]}`}
    >
      <div className="mb-1.5 flex items-center gap-2 text-canopy-100/40">
        {icon && <span className="text-lg">{icon}</span>}
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em]">{label}</span>
      </div>
      <div className="tabular text-xl font-semibold tracking-[-0.025em]">{value}</div>
      {hint && <div className="mt-0.5 text-[11px] text-canopy-100/35">{hint}</div>}
    </motion.div>
  );
}

export default StatCard;
