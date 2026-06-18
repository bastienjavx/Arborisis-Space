'use client';

import { useEffect, useState } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import Link from 'next/link';
import { HeroScene } from '@/components/three';

function TypingText({ text, delay = 0 }: { text: string; delay?: number }) {
  const [displayed, setDisplayed] = useState('');
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setStarted(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  useEffect(() => {
    if (!started) return;
    let i = 0;
    const interval = setInterval(() => {
      setDisplayed(text.slice(0, i + 1));
      i++;
      if (i >= text.length) clearInterval(interval);
    }, 50);
    return () => clearInterval(interval);
  }, [started, text]);

  return (
    <span>
      {displayed}
      {started && displayed.length < text.length && (
        <motion.span
          className="inline-block h-[1em] w-[2px] bg-canopy-400 align-middle"
          animate={{ opacity: [1, 0] }}
          transition={{ duration: 0.5, repeat: Infinity }}
        />
      )}
    </span>
  );
}

function FloatingOrbs() {
  const orbs = [
    { x: '10%', y: '20%', size: 120, color: 'rgba(22, 191, 108, 0.12)', delay: 0 },
    { x: '80%', y: '60%', size: 160, color: 'rgba(123, 102, 240, 0.1)', delay: 2 },
    { x: '30%', y: '70%', size: 100, color: 'rgba(245, 201, 107, 0.08)', delay: 4 },
    { x: '70%', y: '15%', size: 80, color: 'rgba(22, 191, 108, 0.08)', delay: 1 },
    { x: '50%', y: '50%', size: 200, color: 'rgba(123, 102, 240, 0.06)', delay: 3 },
  ];

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {orbs.map((orb, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full blur-3xl"
          style={{
            left: orb.x,
            top: orb.y,
            width: orb.size,
            height: orb.size,
            backgroundColor: orb.color,
          }}
          animate={{
            x: [0, 30, -20, 0],
            y: [0, -20, 30, 0],
            scale: [1, 1.2, 0.9, 1],
          }}
          transition={{
            duration: 15 + i * 3,
            delay: orb.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}

function ScrollIndicator() {
  return (
    <motion.div
      className="absolute bottom-8 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 2.2, duration: 0.8 }}
    >
      <span className="text-xs text-canopy-100/40">Découvrir</span>
      <motion.div
        className="h-8 w-5 rounded-full border-2 border-canopy-700/40 p-1"
        animate={{ y: [0, 5, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      >
        <motion.div
          className="h-2 w-full rounded-full bg-canopy-500/60"
          animate={{ y: [0, 12, 0], opacity: [1, 0.3, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
      </motion.div>
    </motion.div>
  );
}

function FeatureCard({
  title,
  desc,
  color,
  delay,
}: {
  title: string;
  desc: string;
  color: string;
  delay: number;
}) {
  return (
    <motion.div
      className={`glass-card bg-gradient-to-br ${color} group relative overflow-hidden`}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay, duration: 0.5 }}
      whileHover={{ y: -8, transition: { duration: 0.25 } }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-canopy-500/0 to-canopy-500/0 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
      <div className="relative z-10">
        <h3 className="mb-2 text-xl font-semibold text-canopy-300">{title}</h3>
        <p className="text-sm text-canopy-100/60">{desc}</p>
      </div>
    </motion.div>
  );
}

const FEATURES = [
  {
    title: 'Colonisez',
    desc: "Plantez votre première graine sur un monde vierge et faites-la grandir jusqu'à devenir un empire galactique.",
    color: 'from-canopy-500/20 to-canopy-600/10',
  },
  {
    title: 'Évoluez',
    desc: 'Recherchez des technologies biologiques pour débloquer de nouvelles capacités et adapter votre civilisation.',
    color: 'from-spore-500/20 to-spore-600/10',
  },
  {
    title: 'Dominez',
    desc: 'Étendez votre influence à travers les étoiles par la diplomatie ou la force des spores.',
    color: 'from-sap-400/20 to-sap-500/10',
  },
];

const MECHANICS = [
  {
    title: 'Ressources vivantes',
    desc: 'Gérez sève, spores et biomasse dans un écosystème fragile où chaque choix impacte la stabilité.',
  },
  {
    title: 'Recherches organiques',
    desc: "Développez un arbre technologique unique inspiré de la génétique, de la mycologie et de l'astrobiologie.",
  },
  {
    title: 'Flottes biologiques',
    desc: "Faites éclore des bio-vaisseaux capables d'explorer, coloniser et défendre vos mondes.",
  },
  {
    title: 'Expéditions narratives',
    desc: "Envoyez des essaims à la découverte d'anomalies, de débris et de civilisations oubliées.",
  },
];

export default function LandingPage() {
  const { scrollY } = useScroll();
  const heroOpacity = useTransform(scrollY, [0, 400], [1, 0]);
  const heroScale = useTransform(scrollY, [0, 400], [1, 0.95]);

  const titleLetters = 'Arborisis'.split('');

  return (
    <div className="relative min-h-screen overflow-hidden bg-bark-950">
      <FloatingOrbs />

      <div
        className="pointer-events-none absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(22, 191, 108, 0.5) 1px, transparent 1px),
            linear-gradient(90deg, rgba(22, 191, 108, 0.5) 1px, transparent 1px)
          `,
          backgroundSize: '80px 80px',
        }}
      />

      <motion.div
        className="relative flex min-h-screen flex-col items-center justify-center px-4"
        style={{ opacity: heroOpacity, scale: heroScale }}
      >
        <div className="pointer-events-none absolute inset-0 z-0">
          <HeroScene className="h-full w-full opacity-60" />
        </div>

        <motion.div
          className="relative z-10 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="mb-4 text-7xl font-bold tracking-tight sm:text-8xl md:text-9xl">
            {titleLetters.map((letter, i) => (
              <motion.span
                key={i}
                className={`inline-block ${letter === ' ' ? 'w-4' : ''} gradient-text text-glow-strong`}
                initial={{ opacity: 0, y: 50, rotateX: -90 }}
                animate={{ opacity: 1, y: 0, rotateX: 0 }}
                transition={{
                  delay: 0.3 + i * 0.08,
                  duration: 0.6,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                {letter}
              </motion.span>
            ))}
          </h1>

          <motion.p
            className="mx-auto max-w-xl text-lg text-canopy-100/70 sm:text-xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2, duration: 0.5 }}
          >
            <TypingText
              text="Cultivez une civilisation organique à travers une galaxie vivante."
              delay={1200}
            />
          </motion.p>
        </motion.div>

        <motion.div
          className="relative z-10 mt-12 flex flex-col gap-4 sm:flex-row sm:gap-6"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.8, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <Link href="/login">
            <motion.button
              className="group relative overflow-hidden rounded-2xl bg-canopy-600 px-8 py-4 text-lg font-semibold text-bark-950 shadow-lg shadow-canopy-600/20 transition-all"
              whileHover={{ scale: 1.05, boxShadow: '0 0 40px rgba(22, 191, 108, 0.4)' }}
              whileTap={{ scale: 0.98 }}
            >
              <span className="relative z-10">Se connecter</span>
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-canopy-500 to-canopy-400"
                initial={{ x: '-100%' }}
                whileHover={{ x: 0 }}
                transition={{ duration: 0.3 }}
              />
            </motion.button>
          </Link>

          <Link href="/register">
            <motion.button
              className="group relative overflow-hidden rounded-2xl border-2 border-canopy-700/50 px-8 py-4 text-lg font-semibold text-canopy-300 backdrop-blur-sm transition-all"
              whileHover={{
                scale: 1.05,
                borderColor: 'rgba(22, 191, 108, 0.5)',
                boxShadow: '0 0 30px rgba(22, 191, 108, 0.2)',
              }}
              whileTap={{ scale: 0.98 }}
            >
              <span className="relative z-10">Créer un compte</span>
              <motion.div
                className="absolute inset-0 bg-canopy-600/10"
                initial={{ x: '-100%' }}
                whileHover={{ x: 0 }}
                transition={{ duration: 0.3 }}
              />
            </motion.button>
          </Link>
        </motion.div>

        <ScrollIndicator />
      </motion.div>

      <motion.section
        className="relative z-10 px-4 py-24"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
      >
        <div className="mx-auto max-w-4xl">
          <motion.h2
            className="mb-12 text-center text-3xl font-bold gradient-text md:text-4xl"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            Une galaxie vivante vous attend
          </motion.h2>

          <div className="grid gap-6 sm:grid-cols-3">
            {FEATURES.map((feature, i) => (
              <FeatureCard key={feature.title} {...feature} delay={i * 0.2} />
            ))}
          </div>
        </div>
      </motion.section>

      <motion.section
        className="relative z-10 px-4 py-24"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
      >
        <div className="mx-auto max-w-5xl">
          <motion.h2
            className="mb-12 text-center text-3xl font-bold gradient-text md:text-4xl"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            Mécaniques organiques
          </motion.h2>

          <div className="grid gap-4 sm:grid-cols-2">
            {MECHANICS.map((mechanic, i) => (
              <motion.div
                key={mechanic.title}
                className="card group"
                initial={{ opacity: 0, x: i % 2 === 0 ? -30 : 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
              >
                <h3 className="mb-2 text-lg font-semibold text-canopy-300 transition-colors group-hover:text-canopy-200">
                  {mechanic.title}
                </h3>
                <p className="text-sm text-canopy-100/60">{mechanic.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      <motion.section
        className="relative z-10 px-4 py-24"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
      >
        <div className="mx-auto max-w-3xl text-center">
          <motion.h2
            className="mb-6 text-3xl font-bold gradient-text md:text-4xl"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            Prêt à germer ?
          </motion.h2>
          <motion.p
            className="mb-8 text-canopy-100/60"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
          >
            Rejoignez la bêta contrôlée et participez à l\'éveil d\'Arborisis.
          </motion.p>
          <motion.div
            className="flex flex-col justify-center gap-4 sm:flex-row"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            <Link href="/register">
              <motion.button
                className="rounded-2xl bg-canopy-600 px-8 py-4 text-lg font-semibold text-bark-950 shadow-lg shadow-canopy-600/20"
                whileHover={{ scale: 1.05, boxShadow: '0 0 40px rgba(22, 191, 108, 0.4)' }}
                whileTap={{ scale: 0.98 }}
              >
                Planter ma graine
              </motion.button>
            </Link>
            <Link href="/login">
              <motion.button
                className="rounded-2xl border-2 border-canopy-700/50 px-8 py-4 text-lg font-semibold text-canopy-300 backdrop-blur-sm"
                whileHover={{
                  scale: 1.05,
                  borderColor: 'rgba(22, 191, 108, 0.5)',
                  boxShadow: '0 0 30px rgba(22, 191, 108, 0.2)',
                }}
                whileTap={{ scale: 0.98 }}
              >
                Reprendre mon empire
              </motion.button>
            </Link>
          </motion.div>
        </div>
      </motion.section>

      <footer className="relative z-10 border-t border-canopy-700/10 px-4 py-8 text-center text-sm text-canopy-100/40">
        <p>© {new Date().getFullYear()} Arborisis. Civilisation organique en développement.</p>
      </footer>
    </div>
  );
}
