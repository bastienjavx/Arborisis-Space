'use client';

import { motion, AnimatePresence } from 'framer-motion';

interface LoadingScreenProps {
  visible: boolean;
  text?: string;
}

export default function LoadingScreen({ visible, text = 'Germination…' }: LoadingScreenProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-bark-950/90 backdrop-blur-sm"
        >
          <div className="relative flex flex-col items-center gap-6">
            {/* Organic spinner */}
            <div className="relative h-16 w-16">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="absolute inset-0 rounded-full border-2 border-transparent"
                  style={{
                    borderTopColor: i === 0 ? '#16bf6c' : i === 1 ? '#7b66f0' : '#e0a93f',
                  }}
                  animate={{ rotate: 360 }}
                  transition={{
                    duration: 1.5 + i * 0.6,
                    repeat: Infinity,
                    ease: 'linear',
                  }}
                />
              ))}
              <motion.div
                className="absolute inset-2 rounded-full bg-canopy-500/10"
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.3, 0.6, 0.3],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
            </div>

            {/* Pulsing text */}
            <motion.p
              className="text-lg font-medium tracking-wide text-canopy-300"
              animate={{
                opacity: [0.5, 1, 0.5],
              }}
              transition={{
                duration: 2.5,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            >
              {text}
            </motion.p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
