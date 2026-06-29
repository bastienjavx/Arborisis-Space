'use client';

import { motion } from 'framer-motion';
import { organicEase } from '@/lib/motion';

// Template (et non layout) : Next le re-monte à chaque navigation. On veut une
// transition qui « pose » le contenu sans jamais le faire disparaître — partir
// d'opacity:0 donnait un flash vide à chaque clic, ressenti comme un rechargement.
// Ici l'opacité ne descend jamais sous 0.6 et le glissement est court : effet de
// continuité plutôt que de remontage de page.
const pageEnter = {
  hidden: { opacity: 0.6, y: 6 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.2, ease: organicEase },
  },
};

export default function GameTemplate({ children }: { children: React.ReactNode }) {
  return (
    <motion.div initial="hidden" animate="visible" variants={pageEnter}>
      {children}
    </motion.div>
  );
}
