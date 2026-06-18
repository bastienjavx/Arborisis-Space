'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface Particle {
  id: number;
  x: number;
  size: number;
  duration: number;
  delay: number;
  color: string;
}

function buildParticles(): Particle[] {
  const colors = [
    'rgba(22, 191, 108, 0.4)',
    'rgba(123, 102, 240, 0.3)',
    'rgba(245, 201, 107, 0.3)',
    'rgba(22, 191, 108, 0.2)',
    'rgba(155, 140, 255, 0.25)',
  ];
  return Array.from({ length: 40 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    size: Math.random() * 3 + 1,
    duration: Math.random() * 15 + 10,
    delay: Math.random() * 10,
    color: colors[Math.floor(Math.random() * colors.length)],
  }));
}

export function ParticleField() {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    setParticles(buildParticles());
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            boxShadow: `0 0 ${p.size * 4}px ${p.color}`,
          }}
          initial={{ y: '110vh', opacity: 0, scale: 0 }}
          animate={{
            y: '-10vh',
            opacity: [0, 1, 1, 0],
            scale: [0, 1, 1, 0.5],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      ))}

      {/* Ambient glow orbs */}
      <div className="absolute -left-32 top-1/4 h-96 w-96 rounded-full bg-canopy-500/5 blur-[100px]" />
      <div className="absolute -right-32 bottom-1/4 h-96 w-96 rounded-full bg-spore-500/5 blur-[100px]" />
      <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-sap-400/3 blur-[80px]" />
    </div>
  );
}
