'use client';

import Image from 'next/image';
import Link from 'next/link';
import { AnimatePresence, motion, useScroll, useTransform } from 'framer-motion';
import { useState } from 'react';
import { FiMenu, FiX } from 'react-icons/fi';
import { LANDING_FAQ } from '@/lib/landing-content';

const GAMEPLAY = [
  {
    title: 'Empire',
    eyebrow: 'Cultiver',
    description:
      'Développez des cités vivantes, reliées par des réseaux racinaires. Chaque structure transforme durablement votre monde.',
    image: '/images/arborisis/feature-empire.webp',
    accent: 'text-canopy-300',
    glow: 'group-hover:shadow-canopy-500/20',
  },
  {
    title: 'Recherche',
    eyebrow: 'Évoluer',
    description:
      "Explorez des symbioses, débloquez de nouvelles voies d'évolution et adaptez votre civilisation aux merveilles de la galaxie.",
    image: '/images/arborisis/feature-research.webp',
    accent: 'text-spore-400',
    glow: 'group-hover:shadow-spore-500/20',
  },
  {
    title: 'Galaxie',
    eyebrow: 'Étendre',
    description:
      "Déployez vos essaims à travers une galaxie vivante, découvrez des anomalies et étendez l'influence de vos colonies.",
    image: '/images/arborisis/feature-galaxy.webp',
    accent: 'text-sap-400',
    glow: 'group-hover:shadow-sap-400/20',
  },
] as const;

const NAV_ITEMS = [
  { href: '#univers', label: 'Univers' },
  { href: '#systemes', label: 'Systèmes' },
  { href: '#experience', label: 'Expérience' },
  { href: '#rejoindre', label: 'Rejoindre' },
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

const FAQ = LANDING_FAQ;

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0, 800], [0, 90]);
  const heroOpacity = useTransform(scrollY, [0, 650], [1, 0.35]);

  return (
    <div className="min-h-screen bg-bark-950 text-canopy-50">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/[0.06] bg-bark-950/75 backdrop-blur-xl">
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
                className="text-sm text-canopy-100/60 transition hover:text-canopy-100"
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
            onClick={() => setMenuOpen((open) => !open)}
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
                    S'inscrire
                  </Link>
                </div>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main>
        <section
          id="univers"
          className="relative isolate min-h-[760px] overflow-hidden pt-20 sm:min-h-[820px]"
        >
          <motion.div className="absolute inset-0" style={{ y: heroY, opacity: heroOpacity }}>
            <Image
              src="/images/arborisis/hero-living-planet.webp"
              alt="Monde organique parcouru de réseaux bioluminescents dans l’espace"
              fill
              priority
              sizes="100vw"
              className="object-cover object-[62%_center] sm:object-center"
            />
          </motion.div>
          <div className="absolute inset-0 bg-bark-950/55" />

          <div className="relative mx-auto flex min-h-[680px] max-w-7xl items-center px-5 py-20 lg:px-8">
            <motion.div
              className="max-w-2xl"
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            >
              <p className="mb-6 text-xs font-semibold uppercase tracking-[0.28em] text-canopy-300/80">
                Stratégie spatiale organique
              </p>
              <h1 className="display max-w-xl text-[3.25rem] text-white sm:text-7xl lg:text-[5.75rem] [text-wrap:balance]">
                Cultivez un empire <span className="italic text-canopy-300">vivant</span>
                <span style={{ color: 'var(--sap)' }}>.</span>
              </h1>
              <p className="mt-7 max-w-lg text-base leading-7 text-canopy-100/65 sm:text-lg">
                Faites germer votre empire sur des mondes vivants, développez des technologies
                biologiques et étendez vos racines à travers la galaxie.
              </p>
              <div className="mt-10 flex flex-col gap-3 sm:flex-row">
                <Link href="/register" className="btn-primary min-h-12 px-7 text-base">
                  Créer un compte
                </Link>
                <Link href="/login" className="btn-ghost min-h-12 px-7 text-base">
                  Se connecter
                </Link>
              </div>
              <div className="mt-12 flex items-center gap-4 text-xs uppercase tracking-[0.2em] text-canopy-100/35">
                <span
                  className="h-1.5 w-1.5 rotate-45 bg-canopy-400/70"
                  style={{ boxShadow: '0 0 12px rgba(63,217,137,0.6)' }}
                />
                <span className="h-px w-12 bg-canopy-500/40" />
                Une galaxie vivante vous attend
              </div>
            </motion.div>
          </div>
        </section>

        <section id="systemes" className="relative px-5 pb-28 pt-12 lg:px-8 lg:pb-36">
          <div className="mx-auto max-w-7xl">
            <motion.div
              className="mb-12 flex flex-col justify-between gap-4 border-b border-canopy-700/20 pb-8 md:flex-row md:items-end"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
            >
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-canopy-400">
                  Les piliers du vivant
                </p>
                <h2 className="text-3xl tracking-[-0.04em] sm:text-5xl">
                  Votre empire est un <span className="italic text-canopy-300">écosystème</span>.
                </h2>
              </div>
              <p className="max-w-md text-sm leading-6 text-canopy-100/50">
                Chaque décision façonne un réseau interdépendant de ressources, d'organismes et de
                mondes à conquérir.
              </p>
            </motion.div>

            <div className="grid gap-6 lg:grid-cols-3">
              {GAMEPLAY.map((item, index) => (
                <motion.article
                  key={item.title}
                  className={`group overflow-hidden rounded-xl border border-canopy-700/20 bg-bark-900/55 shadow-2xl shadow-transparent transition duration-500 ${item.glow}`}
                  initial={{ opacity: 0, y: 32 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.25 }}
                  transition={{ delay: index * 0.1, duration: 0.55 }}
                >
                  <div className="relative aspect-[2/1] overflow-hidden">
                    <Image
                      src={item.image}
                      alt={`Illustration du système ${item.title} d’Arborisis`}
                      fill
                      sizes="(min-width: 1024px) 33vw, 100vw"
                      className="object-cover transition duration-700 ease-out group-hover:scale-[1.04]"
                    />
                    <div className="absolute inset-0 bg-bark-950/20" />
                  </div>
                  <div className="p-6 sm:p-7">
                    <div className="flex items-center gap-2.5">
                      <span className="font-display text-sm italic text-canopy-100/30">
                        0{index + 1}
                      </span>
                      <span className="h-px w-5 bg-canopy-500/30" />
                      <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-canopy-100/40">
                        {item.eyebrow}
                      </span>
                    </div>
                    <h3 className={`mt-3 font-display text-3xl ${item.accent}`}>{item.title}</h3>
                    <p className="mt-3 text-sm leading-6 text-canopy-100/55">{item.description}</p>
                  </div>
                </motion.article>
              ))}
            </div>
          </div>
        </section>

        <section
          id="experience"
          aria-labelledby="experience-title"
          className="border-y border-canopy-700/15 bg-bark-900/30 px-5 py-24 lg:px-8"
        >
          <div className="mx-auto max-w-7xl">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-canopy-400">
                Jeu de stratégie multijoueur
              </p>
              <h2 id="experience-title" className="mt-4 text-3xl tracking-[-0.04em] sm:text-5xl">
                Bâtissez, évoluez, survivez.
              </h2>
              <p className="mt-6 text-base leading-7 text-canopy-100/55">
                Dans Arborisis, chaque monde est un organisme à faire grandir. Équilibrez votre
                économie, spécialisez vos colonies et coordonnez vos flottes pour inscrire votre
                civilisation dans un univers qui ne s'arrête jamais.
              </p>
            </div>

            <div className="mt-12 grid gap-px overflow-hidden rounded-xl border border-canopy-700/20 bg-canopy-700/20 md:grid-cols-3">
              {EXPERIENCE.map((item) => (
                <article key={item.title} className="bg-bark-950 p-7 sm:p-8">
                  <span
                    className="inline-block h-1.5 w-1.5 rotate-45 bg-canopy-400/70"
                    style={{ boxShadow: '0 0 10px rgba(63,217,137,0.6)' }}
                    aria-hidden="true"
                  />
                  <h3 className="mt-5 font-display text-2xl text-canopy-100">{item.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-canopy-100/50">{item.description}</p>
                </article>
              ))}
            </div>

            <div className="mt-24 max-w-4xl" aria-labelledby="faq-title">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-canopy-400">
                Questions fréquentes
              </p>
              <h2 id="faq-title" className="mt-4 text-3xl tracking-[-0.04em] sm:text-4xl">
                Découvrir Arborisis
              </h2>
              <dl className="mt-9 divide-y divide-canopy-700/20 border-y border-canopy-700/20">
                {FAQ.map((item) => (
                  <div key={item.question} className="py-6 sm:grid sm:grid-cols-5 sm:gap-8">
                    <dt className="text-base font-semibold text-canopy-100 sm:col-span-2">
                      {item.question}
                    </dt>
                    <dd className="mt-3 text-sm leading-6 text-canopy-100/50 sm:col-span-3 sm:mt-0">
                      {item.answer}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </section>

        <section
          id="rejoindre"
          className="relative overflow-hidden border-t border-canopy-700/15 px-5 py-28 lg:px-8"
        >
          <motion.div
            className="relative mx-auto max-w-3xl text-center"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
          >
            <div className="mycelium-rule mx-auto mb-8 w-32" aria-hidden="true" />
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-canopy-400">
              Commencer l'expansion
            </p>
            <h2 className="mt-5 text-4xl tracking-[-0.045em] sm:text-6xl">
              Plantez la première <span className="italic text-canopy-300">graine</span>
              <span style={{ color: 'var(--sap)' }}>.</span>
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-canopy-100/55">
              Créez votre monde-noyau et prenez part à l'éveil d'une civilisation qui ne ressemble à
              aucune autre.
            </p>
            <Link href="/register" className="btn-primary mt-9 min-h-12 px-8 text-base">
              Faire germer mon empire
            </Link>
          </motion.div>
        </section>
      </main>

      <footer className="border-t border-canopy-700/15 px-5 py-8 text-sm text-canopy-100/35 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <span>Arborisis</span>
          <span>© {new Date().getFullYear()} · Civilisation organique en développement</span>
        </div>
      </footer>
    </div>
  );
}
