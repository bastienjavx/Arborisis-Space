'use client';

import { motion } from 'framer-motion';

// Template (et non layout) : Next le re-monte à chaque navigation, donc
// l'animation d'entrée rejoue sans le deadlock d'AnimatePresence mode="wait"
// qui laissait parfois la zone de contenu vide (cf. GameShell).
export default function GameTemplate({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      {children}
    </motion.div>
  );
}
