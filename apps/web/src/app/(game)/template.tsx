'use client';

import { motion } from 'framer-motion';
import { pageShell } from '@/lib/motion';

// Template (et non layout) : Next le re-monte à chaque navigation, donc
// l'animation d'entrée rejoue sans le deadlock d'AnimatePresence mode="wait"
// qui laissait parfois la zone de contenu vide (cf. GameShell).
export default function GameTemplate({ children }: { children: React.ReactNode }) {
  return (
    <motion.div initial="hidden" animate="visible" variants={pageShell}>
      {children}
    </motion.div>
  );
}
