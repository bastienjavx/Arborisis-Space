'use client';

import Link from 'next/link';
import { PvpMissionType } from '@arborisis/shared';
import { useIncomingAttacks } from '@/lib/queries';
import { AnimatedCountdown } from './AnimatedCountdown';
import { motion, AnimatePresence } from 'framer-motion';
import { FiAlertOctagon, FiEye, FiCrosshair, FiExternalLink } from 'react-icons/fi';

export function AttackWarningBanner() {
  const { data: incoming } = useIncomingAttacks();

  if (!incoming || incoming.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        className="mb-3 overflow-hidden rounded-xl border border-red-500/40 bg-red-950/30 backdrop-blur-xl"
      >
        <div className="flex items-center justify-between border-b border-red-500/20 bg-red-500/[0.06] px-4 py-2">
          <div className="flex items-center gap-2">
            <FiAlertOctagon className="h-4 w-4 animate-pulse text-red-400" aria-hidden="true" />
            <span className="text-xs font-semibold uppercase tracking-widest text-red-300">
              {incoming.length === 1
                ? 'Alerte — Attaque entrante'
                : `Alerte — ${incoming.length} opérations ennemies`}
            </span>
          </div>
          <Link
            href="/pvp"
            className="flex items-center gap-1.5 rounded-lg border border-red-500/25 bg-red-500/10 px-2.5 py-1 text-[10px] uppercase tracking-widest text-red-300 transition hover:bg-red-500/20"
          >
            <FiExternalLink className="h-3 w-3" aria-hidden="true" />
            Voir PvP
          </Link>
        </div>
        <ul className="divide-y divide-red-500/10">
          {incoming.map((attack) => (
            <li key={attack.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5 text-xs">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-red-500/25 bg-red-500/[0.06] text-red-400">
                {attack.type === PvpMissionType.SPY ? (
                  <FiEye className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <FiCrosshair className="h-3.5 w-3.5" aria-hidden="true" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="font-medium text-red-200">{attack.attackerName}</span>
                <span className="text-red-300/60">
                  {' '}
                  {attack.type === PvpMissionType.SPY ? 'espionne' : 'attaque'}{' '}
                </span>
                <span className="font-medium text-red-200">{attack.targetPlanet.name}</span>
                <span className="ml-2 text-red-300/45">
                  {attack.targetPlanet.coordinates.galaxy}:{attack.targetPlanet.coordinates.system}:
                  {attack.targetPlanet.coordinates.position}
                </span>
              </span>
              <span className="flex items-center gap-1.5 text-xs font-semibold text-red-300">
                <span className="text-red-300/50">Arrivée dans</span>
                <AnimatedCountdown finishesAt={attack.arrivesAt} />
              </span>
            </li>
          ))}
        </ul>
      </motion.div>
    </AnimatePresence>
  );
}
