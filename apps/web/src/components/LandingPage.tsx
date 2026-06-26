'use client';

import Image from 'next/image';
import Link from 'next/link';
import {
  AnimatePresence,
  motion,
  useScroll,
  useTransform,
  useMotionValue,
  useSpring,
  useInView,
} from 'framer-motion';
import { useState, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { FiMenu, FiX } from 'react-icons/fi';
import { LANDING_FAQ } from '@/lib/landing-content';
import { AnimatedCounter } from './AnimatedCounter';
import { CustomCursor } from './CustomCursor';

const HeroScene3D = dynamic(() => import('./HeroScene3D').then((m) => m.HeroScene3D), {
  ssr: false,
});

// ── Static data ───────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { href: '#univers', label: 'Univers' },
  { href: '#systemes', label: 'Systèmes' },
  { href: '#experience', label: 'Expérience' },
  { href: '#rejoindre', label: 'Rejoindre' },
] as const;

const GAMEPLAY = [
  {
    title: 'Empire',
    eyebrow: 'Cultiver',
    description:
      'Développez des cités vivantes, reliées par des réseaux racinaires. Chaque structure transforme durablement votre monde.',
    image: '/images/arborisis/arborisis-empire.png',
    accent: 'text-canopy-300',
    glowColor: 'rgba(22,191,108,0.18)',
  },
  {
    title: 'Recherche',
    eyebrow: 'Évoluer',
    description:
      "Explorez des symbioses, débloquez de nouvelles voies d'évolution et adaptez votre civilisation aux merveilles de la galaxie.",
    image: '/images/arborisis/arborisis-research.png',
    accent: 'text-spore-400',
    glowColor: 'rgba(155,140,255,0.18)',
  },
  {
    title: 'Galaxie',
    eyebrow: 'Étendre',
    description:
      "Déployez vos essaims à travers une galaxie vivante, découvrez des anomalies et étendez l'influence de vos colonies.",
    image: '/images/arborisis/arborisis-galaxy.png',
    accent: 'text-sap-400',
    glowColor: 'rgba(245,201,107,0.18)',
  },
] as const;

// Archive Orbitale — floating-panel image collage with scroll parallax
const ARCHIVE_FRAMES = [
  {
    title: 'Monde-noyau',
    label: 'Biosphère active',
    image: '/images/arborisis/arborisis-hero.png',
    alt: "Planète organique d’Arborisis parcourue de réseaux racinaires",
  },
  {
    title: 'Chambre symbiotique',
    label: 'Recherche évolutive',
    image: '/images/arborisis/arborisis-research.png',
    alt: 'Nexus de recherche bioluminescent avec orbe énergétique',
  },
  {
    title: 'Carte mycélienne',
    label: 'Expansion galactique',
    image: '/images/arborisis/arborisis-symbiosis.png',
    alt: "Deux mondes reliés par des réseaux mycéliens dans l'espace",
  },
] as const;

const EXPERIENCE = [
  {
    title: 'Un univers persistant',
    description:
      "Votre civilisation continue d'exister entre vos sessions. Planifiez vos constructions, vos recherches et vos expéditions pour progresser à votre rythme.",
  },
  {
    title: 'Une stratégie multijoueur',
    description:
      'Rejoignez une alliance, mesurez-vous aux autres empires et choisissez entre coopération, exploration et conquête dans une galaxie partagée.',
  },
  {
    title: 'Aucune installation',
    description:
      'Arborisis se joue directement dans un navigateur moderne, sur ordinateur comme sur mobile. Créez un compte et faites germer votre premier monde.',
  },
] as const;

const STATS = [
  {
    value: 9,
    suffix: '',
    label: 'Structures biologiques',
    description: 'Bâtiments vivants à faire évoluer niveau par niveau',
  },
  {
    value: 17,
    suffix: '',
    label: 'Voies de recherche',
    description: 'Technologies organiques pour spécialiser votre empire',
  },
  {
    value: 17,
    suffix: '+',
    label: 'Classes de vaisseaux',
    description: 'Flottes organiques à produire et déployer',
  },
] as const;

const MARQUEE_ITEMS = [
  'Empire Organique',
  'Galaxie Persistante',
  'Alliances',
  'Technologies Biologiques',
  'Flottes Spatiales',
  'Recherche Évolutive',
  'Colonies',
  'Stratégie Multijoueur',
  'Mondes Vivants',
  'Réseaux Racinaires',
];

// ── Sub-components ────────────────────────────────────────────────────────────

function TiltCard({
  children,
  className,
  glowColor,
}: {
  children: React.ReactNode;
  className?: string;
  glowColor: string;
}) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 140, damping: 18 });
  const springY = useSpring(y, { stiffness: 140, damping: 18 });
  const rotateX = useTransform(springY, [-0.5, 0.5], [7, -7]);
  const rotateY = useTransform(springX, [-0.5, 0.5], [-7, 7]);
  const glowOpacity = useSpring(0, { stiffness: 120, damping: 20 });

  return (
    <motion.div
      style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        x.set((e.clientX - r.left) / r.width - 0.5);
        y.set((e.clientY - r.top) / r.height - 0.5);
      }}
      onMouseEnter={() => glowOpacity.set(1)}
      onMouseLeave={() => {
        x.set(0);
        y.set(0);
        glowOpacity.set(0);
      }}
      className={className}
    >
      {children}
      <motion.div
        className="pointer-events-none absolute inset-0 rounded-xl"
        style={{
          opacity: glowOpacity,
          boxShadow: `0 0 60px ${glowColor}, inset 0 0 40px ${glowColor}`,
        }}
      />
    </motion.div>
  );
}

function StatItem({
  value,
  suffix,
  label,
  description,
  index,
}: {
  value: number;
  suffix: string;
  label: string;
  description: string;
  index: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  const [triggered, setTriggered] = useState(false);

  useEffect(() => {
    if (inView) setTriggered(true);
  }, [inView]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ delay: index * 0.15, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col items-center text-center"
    >
      <div className="font-mono text-6xl tracking-[-0.04em] text-canopy-50 sm:text-7xl lg:text-[5.5rem]">
        {triggered ? <AnimatedCounter value={value} duration={2.5} /> : '0'}
        <span className="text-canopy-400">{suffix}</span>
      </div>
      <div className="mt-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-canopy-300">
        {label}
      </div>
      <p className="mt-2 max-w-[14rem] text-xs leading-5 text-canopy-100/35">{description}</p>
    </motion.div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const archiveRef = useRef<HTMLElement>(null);
  const { scrollY } = useScroll();
  const { scrollYProgress: archiveProgress } = useScroll({
    target: archiveRef,
    offset: ['start end', 'end start'],
  });

  const heroY = useTransform(scrollY, [0, 800], [0, 80]);
  const heroOpacity = useTransform(scrollY, [0, 600], [1, 0.25]);
  const navBg = useTransform(scrollY, [0, 80], ['rgba(3,9,6,0)', 'rgba(3,9,6,0.92)']);
  const symbiosisY = useTransform(scrollY, [0, 3000], [0, 120]);

  // Archive Orbitale — floating panels parallax
  const archiveDriftMain = useTransform(archiveProgress, [0, 1], [52, -42]);
  const archiveDriftLeft = useTransform(archiveProgress, [0, 1], [24, -64]);
  const archiveDriftRight = useTransform(archiveProgress, [0, 1], [58, -26]);
  const archiveScale = useTransform(archiveProgress, [0, 0.5, 1], [0.96, 1.03, 0.98]);
  const archiveGlow = useTransform(archiveProgress, [0, 0.5, 1], [0.25, 0.55, 0.3]);

  return (
    <div className="min-h-screen bg-bark-950 text-canopy-50">
      <CustomCursor />
      {/* Film-grain overlay */}
      <div className="grain pointer-events-none" aria-hidden="true" />

      {/* ── Navigation ── */}
      <motion.header
        className="fixed inset-x-0 top-0 z-50 border-b border-white/[0.04] backdrop-blur-xl"
        style={{ backgroundColor: navBg }}
      >
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 lg:px-8">
          <Link
            href="/"
            className="font-display text-3xl tracking-[-0.04em] text-canopy-50 sm:text-4xl"
            aria-label="Arborisis — accueil"
          >
            Arborisis
          </Link>

          <nav className="hidden items-center gap-8 md:flex" aria-label="Navigation principale">
            {NAV_ITEMS.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="text-sm text-canopy-100/45 transition duration-200 hover:text-canopy-100"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <Link href="/login" className="btn-ghost">
              Se connecter
            </Link>
            <Link href="/register" className="btn-primary px-5">
              Créer un compte
            </Link>
          </div>

          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-canopy-700/30 text-canopy-100 md:hidden"
            aria-label={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((o) => !o)}
          >
            {menuOpen ? (
              <FiX className="h-5 w-5" aria-hidden="true" />
            ) : (
              <FiMenu className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
        </div>

        <AnimatePresence>
          {menuOpen && (
            <motion.div
              className="border-t border-white/[0.06] bg-bark-950 px-5 py-5 md:hidden"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <nav className="flex flex-col gap-1" aria-label="Navigation mobile">
                {NAV_ITEMS.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className="rounded-lg px-3 py-3 text-canopy-100/70 hover:bg-canopy-700/10"
                  >
                    {item.label}
                  </a>
                ))}
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <Link href="/login" className="btn-ghost">
                    Connexion
                  </Link>
                  <Link href="/register" className="btn-primary">
                    S&apos;inscrire
                  </Link>
                </div>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>

      <main>
        {/* ── Hero ── */}
        <section
          id="univers"
          className="relative isolate flex min-h-svh flex-col overflow-hidden"
          aria-label="Présentation"
        >
          {/* Three.js spore nebula */}
          <div className="absolute inset-0 z-0">
            <HeroScene3D />
          </div>

          {/* Hero image with scroll parallax */}
          <motion.div
            className="absolute inset-0 z-[1]"
            style={{ y: heroY, opacity: heroOpacity }}
          >
            <Image
              src="/images/arborisis/arborisis-hero.png"
              alt="Planète organique vivante dont les réseaux racinaires s'étendent vers ses lunes"
              fill
              priority
              sizes="100vw"
              className="object-cover object-[62%_center] sm:object-center"
            />
          </motion.div>

          {/* Gradient vignettes */}
          <div className="pointer-events-none absolute inset-0 z-[2]">
            <div className="absolute inset-0 bg-gradient-to-t from-bark-950 via-bark-950/45 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-bark-950/65 via-transparent to-transparent" />
          </div>

          {/* Ambient glow orbs */}
          <div className="pointer-events-none absolute inset-0 z-[3] overflow-hidden">
            <div className="absolute -left-40 top-1/3 h-[550px] w-[550px] rounded-full bg-canopy-500/[0.055] blur-[130px]" />
            <div className="absolute right-0 top-1/4 h-[380px] w-[380px] rounded-full bg-sap-400/[0.04] blur-[110px]" />
          </div>

          {/* HUD data overlay */}
          <motion.div
            className="absolute right-5 top-28 z-[4] hidden select-none flex-col items-end gap-1.5 font-mono text-[9px] uppercase tracking-[0.24em] text-canopy-100/18 md:flex lg:right-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2, duration: 1.2 }}
            aria-hidden="true"
          >
            <span>UNIVERS-ALPHA / ACTIF</span>
            <span>RÉSEAU RACINAIRE / EN CROISSANCE</span>
            <span className="flex items-center gap-2">
              <motion.span
                className="inline-block h-1 w-1 rounded-full bg-canopy-400/55"
                animate={{ opacity: [1, 0.15, 1] }}
                transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
              />
              EXPANSION EN COURS
            </span>
          </motion.div>

          {/* Content */}
          <div className="relative z-[4] mx-auto flex min-h-svh w-full max-w-7xl flex-col justify-center px-5 py-24 lg:px-8">
            <div className="max-w-2xl">
              <motion.p
                className="mb-7 text-xs font-semibold uppercase tracking-[0.3em] text-canopy-300/65"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              >
                Stratégie spatiale organique
              </motion.p>

              <h1 className="display max-w-2xl text-[3.25rem] text-white sm:text-7xl lg:text-[7rem] xl:text-[8rem]">
                {(['Cultivez', 'un', 'empire'] as const).map((word, i) => (
                  <motion.span
                    key={word}
                    className="inline-block"
                    initial={{ opacity: 0, y: 44, filter: 'blur(8px)' }}
                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                    transition={{
                      delay: 0.2 + i * 0.1,
                      duration: 0.75,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                  >
                    {word}&nbsp;
                  </motion.span>
                ))}
                <br />
                <motion.span
                  className="inline-block italic text-canopy-300"
                  initial={{ opacity: 0, y: 44, filter: 'blur(8px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  transition={{ delay: 0.58, duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
                >
                  vivant
                </motion.span>
                <motion.span
                  className="inline-block"
                  style={{ color: 'var(--sap)' }}
                  initial={{ opacity: 0, scale: 0.2 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.82, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                >
                  .
                </motion.span>
              </h1>

              <motion.p
                className="mt-7 max-w-lg text-base leading-7 text-canopy-100/55 sm:text-lg"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.95, duration: 0.65 }}
              >
                Faites germer votre empire sur des mondes vivants, développez des technologies
                biologiques et étendez vos racines à travers la galaxie.
              </motion.p>

              <motion.div
                className="mt-10 flex flex-col gap-3 sm:flex-row"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.08, duration: 0.6 }}
              >
                <Link href="/register" className="btn-primary min-h-12 px-7 text-base">
                  Créer un compte
                </Link>
                <Link href="/login" className="btn-ghost min-h-12 px-7 text-base">
                  Se connecter
                </Link>
              </motion.div>

              <motion.div
                className="mt-12 flex items-center gap-4 text-xs uppercase tracking-[0.22em] text-canopy-100/28"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.25, duration: 0.8 }}
              >
                <span
                  className="h-1.5 w-1.5 rotate-45 bg-canopy-400/60"
                  style={{ boxShadow: '0 0 14px rgba(63,217,137,0.65)' }}
                />
                <span className="h-px w-12 bg-canopy-500/30" />
                Une galaxie vivante vous attend
              </motion.div>
            </div>
          </div>

          {/* Scroll indicator */}
          <motion.div
            className="absolute bottom-10 left-1/2 z-[4] flex -translate-x-1/2 flex-col items-center gap-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.6, duration: 0.8 }}
            aria-hidden="true"
          >
            <span className="text-[9px] uppercase tracking-[0.25em] text-canopy-100/20">
              Découvrir
            </span>
            <motion.div
              className="h-9 w-px bg-gradient-to-b from-canopy-400/50 to-transparent"
              animate={{ scaleY: [1, 0.2, 1], originY: '0%' }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
            />
          </motion.div>
        </section>

        {/* ── Marquee ── */}
        <div
          className="relative overflow-hidden border-y border-canopy-700/10 bg-bark-900/15 py-4"
          aria-hidden="true"
        >
          <div className="flex animate-marquee whitespace-nowrap">
            {[...MARQUEE_ITEMS, ...MARQUEE_ITEMS].map((item, i) => (
              <span
                key={i}
                className="mx-8 inline-flex items-center gap-8 text-[10px] font-semibold uppercase tracking-[0.26em] text-canopy-100/25"
              >
                {item}
                <span className="inline-block h-1 w-1 rotate-45 bg-canopy-500/40" />
              </span>
            ))}
          </div>
        </div>

        {/* ── Features ── */}
        <section id="systemes" className="relative px-5 pb-28 pt-20 lg:px-8 lg:pb-36 lg:pt-28">
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -right-48 top-1/2 h-[650px] w-[650px] -translate-y-1/2 rounded-full bg-canopy-500/[0.035] blur-[160px]" />
          </div>

          <div className="relative mx-auto max-w-7xl">
            <motion.div
              className="mb-14 flex flex-col justify-between gap-4 border-b border-canopy-700/15 pb-10 md:flex-row md:items-end"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            >
              <div>
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.26em] text-canopy-400">
                  Les piliers du vivant
                </p>
                <h2 className="text-3xl tracking-[-0.04em] sm:text-5xl">
                  Votre empire est un{' '}
                  <span className="italic text-canopy-300">écosystème</span>.
                </h2>
              </div>
              <p className="max-w-md text-sm leading-6 text-canopy-100/40">
                Chaque décision façonne un réseau interdépendant de ressources, d&apos;organismes
                et de mondes à conquérir.
              </p>
            </motion.div>

            <div className="grid gap-6 lg:grid-cols-3" style={{ perspective: '1200px' }}>
              {GAMEPLAY.map((item, index) => (
                <TiltCard key={item.title} glowColor={item.glowColor} className="group relative">
                  <motion.article
                    className="relative overflow-hidden rounded-xl border border-canopy-700/20 bg-bark-900/60 shadow-2xl backdrop-blur-sm"
                    initial={{ opacity: 0, y: 40, scale: 1.04, filter: 'blur(4px)' }}
                    whileInView={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
                    viewport={{ once: true, amount: 0.15 }}
                    transition={{ delay: index * 0.12, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <div className="relative aspect-[2/1] overflow-hidden">
                      <Image
                        src={item.image}
                        alt={`Illustration du système ${item.title} d'Arborisis`}
                        fill
                        sizes="(min-width: 1024px) 33vw, 100vw"
                        className="object-cover transition duration-700 ease-out group-hover:scale-[1.06]"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-bark-900/80 to-bark-950/10" />
                    </div>
                    <div className="p-6 sm:p-7">
                      <div className="flex items-center gap-2.5">
                        <span className="font-display text-sm italic text-canopy-100/22">
                          0{index + 1}
                        </span>
                        <span className="h-px w-5 bg-canopy-500/22" />
                        <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-canopy-100/32">
                          {item.eyebrow}
                        </span>
                      </div>
                      <h3 className={`mt-3 font-display text-3xl ${item.accent}`}>
                        {item.title}
                      </h3>
                      <p className="mt-3 text-sm leading-6 text-canopy-100/48">
                        {item.description}
                      </p>
                    </div>
                  </motion.article>
                </TiltCard>
              ))}
            </div>
          </div>
        </section>

        {/* ── Archive Orbitale — floating panels with scroll parallax ── */}
        <section
          ref={archiveRef}
          aria-labelledby="archive-title"
          className="relative isolate overflow-hidden border-y border-canopy-700/15 bg-bark-950 px-5 py-28 lg:px-8 lg:py-36"
        >
          <motion.div
            className="pointer-events-none absolute left-1/2 top-1/2 h-[48rem] w-[48rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-sap-400/10"
            style={{ opacity: archiveGlow, scale: archiveScale }}
            aria-hidden="true"
          />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(245,201,107,0.1),transparent_34%),linear-gradient(180deg,rgba(6,11,9,0),rgba(6,11,9,0.88))]" />

          <div className="relative mx-auto grid max-w-7xl gap-14 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
            <div className="max-w-xl">
              <motion.p
                className="text-[11px] font-semibold uppercase tracking-[0.26em] text-sap-400/80"
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.6 }}
              >
                Archive orbitale
              </motion.p>
              <motion.h2
                id="archive-title"
                className="mt-5 text-4xl tracking-[-0.045em] text-white sm:text-6xl"
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.45 }}
                transition={{ delay: 0.08, duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
              >
                Observez votre empire comme un organisme en mouvement.
              </motion.h2>
              <motion.p
                className="mt-7 text-base leading-7 text-canopy-100/50"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.45 }}
                transition={{ delay: 0.16, duration: 0.6 }}
              >
                Les mondes, routes, recherches et flottes ne sont pas de simples tableaux : ce sont
                des couches vivantes à lire, surveiller et faire évoluer au fil de vos décisions.
              </motion.p>

              <div className="mt-10 grid gap-px overflow-hidden rounded-xl border border-canopy-700/20 bg-canopy-700/20 sm:grid-cols-3 lg:grid-cols-1">
                {ARCHIVE_FRAMES.map((frame, index) => (
                  <motion.div
                    key={frame.title}
                    className="bg-bark-950/90 p-5"
                    initial={{ opacity: 0, x: -18 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, amount: 0.4 }}
                    transition={{ delay: 0.12 + index * 0.08, duration: 0.55 }}
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-canopy-100/35">
                      {frame.label}
                    </p>
                    <p className="mt-2 font-display text-xl text-canopy-100">{frame.title}</p>
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="relative min-h-[480px] sm:min-h-[640px]" aria-hidden="true">
              {/* Main center panel */}
              <motion.div
                className="absolute left-1/2 top-6 z-20 aspect-[4/5] w-[72%] max-w-[420px] -translate-x-1/2 overflow-hidden rounded-xl border border-sap-400/25 bg-bark-900 shadow-2xl shadow-black/60"
                style={{ y: archiveDriftMain, scale: archiveScale }}
              >
                <Image
                  src={ARCHIVE_FRAMES[0].image}
                  alt=""
                  fill
                  sizes="(min-width: 1024px) 38vw, 82vw"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-bark-950/65 via-transparent to-bark-950/10" />
                <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between gap-4 font-mono text-[10px] uppercase tracking-[0.2em] text-canopy-50/55">
                  <span>Core planet</span>
                  <span>01</span>
                </div>
              </motion.div>

              {/* Left panel */}
              <motion.div
                className="absolute left-0 top-24 z-10 aspect-[5/4] w-[48%] overflow-hidden rounded-xl border border-canopy-300/20 bg-bark-900 shadow-2xl shadow-black/50"
                style={{ y: archiveDriftLeft }}
              >
                <Image
                  src={ARCHIVE_FRAMES[1].image}
                  alt=""
                  fill
                  sizes="(min-width: 1024px) 24vw, 48vw"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-bark-950/25" />
              </motion.div>

              {/* Right panel */}
              <motion.div
                className="absolute bottom-8 right-0 z-30 aspect-[5/4] w-[54%] overflow-hidden rounded-xl border border-spore-400/25 bg-bark-900 shadow-2xl shadow-black/60"
                style={{ y: archiveDriftRight }}
              >
                <Image
                  src={ARCHIVE_FRAMES[2].image}
                  alt=""
                  fill
                  sizes="(min-width: 1024px) 28vw, 56vw"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-br from-bark-950/30 via-transparent to-spore-500/10" />
              </motion.div>

              <div className="absolute left-8 right-8 top-1/2 h-px bg-sap-400/20" />
              <div className="absolute bottom-20 left-1/2 h-40 w-px bg-canopy-300/12" />
            </div>
          </div>
        </section>

        {/* ── Symbiosis showcase ── */}
        <section className="relative h-[55vh] min-h-[380px] overflow-hidden lg:h-[65vh]">
          <motion.div className="absolute inset-0" style={{ y: symbiosisY }}>
            <Image
              src="/images/arborisis/arborisis-symbiosis.png"
              alt="Deux mondes organiques reliés par des réseaux mycéliens dans l'espace"
              fill
              sizes="100vw"
              className="object-cover object-center"
            />
          </motion.div>
          <div className="absolute inset-0 bg-bark-950/60" />
          <div className="absolute inset-0 bg-gradient-to-t from-bark-950 via-bark-950/25 to-bark-950/55" />

          <div className="relative flex h-full items-center justify-center px-5 lg:px-8">
            <motion.div
              className="max-w-3xl text-center"
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            >
              <p className="mb-5 text-[10px] font-semibold uppercase tracking-[0.3em] text-canopy-400/70">
                Alliance &amp; Symbiose
              </p>
              <blockquote className="font-display text-3xl leading-snug tracking-[-0.03em] text-white sm:text-4xl lg:text-5xl">
                Deux civilisations reliées par des{' '}
                <span className="italic text-canopy-300">réseaux racinaires</span> —
                <br className="hidden sm:block" /> votre empire n&apos;est pas une conquête.
                C&apos;est une <span className="italic text-sap-400">symbiose</span>.
              </blockquote>
            </motion.div>
          </div>
        </section>

        {/* ── Stats ── */}
        <section
          className="relative overflow-hidden border-y border-canopy-700/10 bg-bark-900/20 px-5 py-28 lg:px-8"
          aria-label="Chiffres clés"
        >
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute left-1/3 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-canopy-500/[0.055] blur-[110px]" />
            <div className="absolute right-1/3 top-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-sap-400/[0.04] blur-[90px]" />
          </div>

          <div className="relative mx-auto max-w-5xl">
            <motion.div
              className="mb-20 text-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.6 }}
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-canopy-400">
                Un univers à la mesure de votre ambition
              </p>
            </motion.div>
            <div className="grid grid-cols-1 gap-14 sm:grid-cols-3 sm:gap-6">
              {STATS.map((stat, i) => (
                <StatItem key={stat.label} {...stat} index={i} />
              ))}
            </div>
          </div>
        </section>

        {/* ── Experience ── */}
        <section
          id="experience"
          aria-labelledby="experience-title"
          className="px-5 py-24 lg:px-8"
        >
          <div className="mx-auto max-w-7xl">
            <motion.div
              className="max-w-3xl"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-canopy-400">
                Jeu de stratégie multijoueur
              </p>
              <h2 id="experience-title" className="mt-4 text-3xl tracking-[-0.04em] sm:text-5xl">
                Bâtissez, évoluez, survivez.
              </h2>
              <p className="mt-6 text-base leading-7 text-canopy-100/50">
                Dans Arborisis, chaque monde est un organisme à faire grandir. Équilibrez votre
                économie, spécialisez vos colonies et coordonnez vos flottes pour inscrire votre
                civilisation dans un univers qui ne s&apos;arrête jamais.
              </p>
            </motion.div>

            <div className="mt-12 grid gap-px overflow-hidden rounded-xl border border-canopy-700/12 bg-canopy-700/10 md:grid-cols-3">
              {EXPERIENCE.map((item, i) => (
                <motion.article
                  key={item.title}
                  className="bg-bark-950 p-7 sm:p-8"
                  initial={{ opacity: 0, y: 20, scale: 1.02 }}
                  whileInView={{ opacity: 1, y: 0, scale: 1 }}
                  viewport={{ once: true, amount: 0.4 }}
                  transition={{ delay: i * 0.1, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                >
                  <span
                    className="inline-block h-1.5 w-1.5 rotate-45 bg-canopy-400/65"
                    style={{ boxShadow: '0 0 10px rgba(63,217,137,0.55)' }}
                    aria-hidden="true"
                  />
                  <h3 className="mt-5 font-display text-2xl text-canopy-100">{item.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-canopy-100/42">{item.description}</p>
                </motion.article>
              ))}
            </div>

            {/* FAQ */}
            <motion.div
              className="mt-24 max-w-4xl"
              aria-labelledby="faq-title"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-canopy-400">
                Questions fréquentes
              </p>
              <h2 id="faq-title" className="mt-4 text-3xl tracking-[-0.04em] sm:text-4xl">
                Découvrir Arborisis
              </h2>
              <dl className="mt-9 divide-y divide-canopy-700/12 border-y border-canopy-700/12">
                {LANDING_FAQ.map((item, i) => (
                  <motion.div
                    key={item.question}
                    className="py-6 sm:grid sm:grid-cols-5 sm:gap-8"
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true, amount: 0.6 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <dt className="text-base font-semibold text-canopy-100 sm:col-span-2">
                      {item.question}
                    </dt>
                    <dd className="mt-3 text-sm leading-6 text-canopy-100/42 sm:col-span-3 sm:mt-0">
                      {item.answer}
                    </dd>
                  </motion.div>
                ))}
              </dl>
            </motion.div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section
          id="rejoindre"
          className="relative overflow-hidden border-t border-canopy-700/10 px-5 py-36 lg:px-8"
        >
          {/* Wormhole background */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
            <Image
              src="/images/arborisis/arborisis-wormhole.png"
              alt=""
              fill
              sizes="100vw"
              className="object-cover object-center opacity-[0.12]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-bark-950 via-bark-950/60 to-bark-950" />
          </div>

          {/* Commander silhouette */}
          <div
            className="pointer-events-none absolute inset-y-0 right-0 hidden w-1/3 overflow-hidden lg:block"
            aria-hidden="true"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-bark-950 via-bark-950/50 to-transparent" />
            <Image
              src="/images/arborisis/arborisis-commander.png"
              alt=""
              fill
              sizes="33vw"
              className="object-cover object-left opacity-20"
            />
          </div>

          {/* Orbital rings */}
          <div
            className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden"
            aria-hidden="true"
          >
            <div className="h-[720px] w-[720px] animate-orbit-slow rounded-full border border-canopy-500/[0.055]" />
            <div className="absolute h-[540px] w-[540px] animate-orbit-reverse rounded-full border border-sap-400/[0.045]" />
            <div className="absolute h-[360px] w-[360px] rounded-full border border-canopy-500/[0.065]" />
            <div className="absolute h-[180px] w-[180px] rounded-full bg-canopy-500/[0.07] blur-[50px]" />
            <div className="absolute h-[60px] w-[60px] rounded-full bg-canopy-400/[0.18] blur-[18px]" />
          </div>

          <div className="absolute inset-x-0 top-0 flex justify-center" aria-hidden="true">
            <div className="mycelium-rule w-32" />
          </div>

          <motion.div
            className="relative mx-auto max-w-3xl text-center"
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-canopy-400">
              Commencer l&apos;expansion
            </p>
            <h2 className="mt-5 text-4xl tracking-[-0.045em] sm:text-6xl">
              Plantez la première{' '}
              <span className="italic text-canopy-300">graine</span>
              <span style={{ color: 'var(--sap)' }}>.</span>
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-canopy-100/48">
              Créez votre monde-noyau et prenez part à l&apos;éveil d&apos;une civilisation qui ne
              ressemble à aucune autre.
            </p>
            <motion.div
              className="mt-10 inline-block"
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
            >
              <Link
                href="/register"
                className="btn-primary animate-pulse-glow min-h-12 px-9 text-base"
              >
                Faire germer mon empire
              </Link>
            </motion.div>
          </motion.div>
        </section>
      </main>

      <footer className="border-t border-canopy-700/10 px-5 py-8 text-sm text-canopy-100/22 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <span>Arborisis</span>
          <span>© {new Date().getFullYear()} · Civilisation organique en développement</span>
        </div>
      </footer>
    </div>
  );
}
