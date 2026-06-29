import { DailyQuestsPanel } from '@/components/DailyQuestsPanel';
import { EngagementPanel } from '@/components/EngagementPanel';
import { QuestTracker } from '@/components/QuestTracker';
import { GameIcon } from '@/components/GameIcon';
import { PageHeader } from '@/components/PageHeader';
import { StatCard } from '@/components/StatCard';
import Link from 'next/link';
import { FiActivity, FiCompass, FiGift, FiZap } from 'react-icons/fi';

const shortcuts = [
  {
    href: '/buildings',
    label: 'Bâtiments',
    description: 'Faire croître les organes de production.',
    icon: 'wrench',
  },
  {
    href: '/research',
    label: 'Recherche',
    description: 'Débloquer de nouvelles symbioses.',
    icon: 'flask',
  },
  {
    href: '/fleets',
    label: 'Flottes',
    description: 'Préparer essaims et expéditions.',
    icon: 'rocket',
  },
  {
    href: '/galaxy',
    label: 'Galaxie',
    description: 'Observer les systèmes voisins.',
    icon: 'globe',
  },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <>
            Tableau <span className="italic text-canopy-300">de bord</span>
          </>
        }
        subtitle="Vue organique de vos priorités: missions, bonus d'engagement et prochaines actions de croissance."
      >
        <div className="flex flex-wrap gap-2">
          <StatCard label="Rythme" value="Actif" hint="Session mycélienne" icon={<FiActivity />} />
          <StatCard
            label="Priorité"
            value="Quêtes"
            hint="Progression guidée"
            icon={<FiCompass />}
            color="purple"
            delay={0.05}
          />
          <StatCard
            label="Bonus"
            value="À suivre"
            hint="Engagement quotidien"
            icon={<FiGift />}
            color="gold"
            delay={0.1}
          />
        </div>
      </PageHeader>

      <section className="mycelium-panel overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-canopy-700/15 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="section-kicker">Console vivante</span>
            <h2 className="section-title mt-1">Actions recommandées</h2>
          </div>
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-canopy-700/25 bg-canopy-500/8 px-3 py-1.5 text-xs text-canopy-100/60">
            <FiZap className="h-3.5 w-3.5 text-canopy-300" aria-hidden="true" />
            Synchronisé avec l'activité de la colonie
          </span>
        </div>
        <div className="grid gap-5 p-5 xl:grid-cols-[1.1fr_0.9fr]">
          <DailyQuestsPanel />
          <EngagementPanel />
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <QuestTracker />

        <section className="mycelium-panel overflow-hidden">
          <div className="border-b border-canopy-700/15 px-5 py-4">
            <span className="section-kicker">Navigation rapide</span>
            <h2 className="section-title mt-1">Raccourcis stratégiques</h2>
          </div>
          <div className="grid gap-3 p-5 sm:grid-cols-2">
            {shortcuts.map((shortcut) => (
              <Link
                key={shortcut.href}
                href={shortcut.href}
                className="group rounded-xl border border-canopy-700/20 bg-bark-950/35 p-4 transition hover:border-canopy-300/35 hover:bg-canopy-500/8"
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-full border border-canopy-700/25 bg-canopy-500/8 text-canopy-300 transition group-hover:border-canopy-300/45 group-hover:text-canopy-200">
                    <GameIcon name={shortcut.icon} className="h-5 w-5" />
                  </span>
                  <span className="text-xs text-canopy-100/30 transition group-hover:text-canopy-300/70">
                    →
                  </span>
                </div>
                <p className="text-sm font-medium text-canopy-50">{shortcut.label}</p>
                <p className="mt-1 text-xs leading-5 text-canopy-100/42">{shortcut.description}</p>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
