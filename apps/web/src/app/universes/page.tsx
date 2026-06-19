import { api } from '@/lib/api';
import { UniverseStatus } from '@arborisis/shared';
import { AnimatedCard } from '@/components/AnimatedCard';
import { StaggerContainer, StaggerItem } from '@/components/StaggerContainer';
import { JoinUniverseButton } from '@/components/JoinUniverseButton';
import { PageHeader } from '@/components/PageHeader';

export const dynamic = 'force-dynamic';

function getStatusLabel(status: UniverseStatus): string {
  switch (status) {
    case UniverseStatus.ACTIVE:
      return 'Actif';
    case UniverseStatus.PROVISIONING:
      return 'En préparation';
    case UniverseStatus.CLOSED:
      return 'Fermé';
    case UniverseStatus.FAILED:
      return 'Indisponible';
  }
}

export default async function UniversesPage() {
  let universes;
  try {
    universes = await api.universes();
  } catch {
    return (
      <div className="relative min-h-screen px-4 py-12">
        <div className="mx-auto max-w-5xl space-y-8">
          <PageHeader
            title="Choisir un univers"
            subtitle="Rejoignez une galaxie vivante et faites germer votre civilisation."
          />
          <p className="text-center text-canopy-100/50">
            L'API est temporairement indisponible. Veuillez réessayer plus tard.
          </p>
        </div>
      </div>
    );
  }

  const visibleUniverses = universes.filter((u) => u.status === UniverseStatus.ACTIVE);

  return (
    <div className="relative min-h-screen px-4 py-12">
      <div className="mx-auto max-w-5xl space-y-8">
        <PageHeader
          title="Choisir un univers"
          subtitle="Rejoignez une galaxie vivante et faites germer votre civilisation."
        />

        {visibleUniverses.length === 0 ? (
          <p className="text-center text-canopy-100/50">Aucun univers disponible pour le moment.</p>
        ) : (
          <StaggerContainer staggerDelay={0.1} className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {visibleUniverses.map((universe, index) => (
              <StaggerItem key={universe.id}>
                <AnimatedCard
                  delay={index * 0.05}
                  glow="green"
                  hover
                  className="flex h-full flex-col"
                >
                  <div className="mb-4">
                    <h2 className="text-xl font-semibold text-canopy-100">{universe.name}</h2>
                    <p className="text-sm text-canopy-100/50">{universe.slug}</p>
                  </div>

                  <div className="mb-6 space-y-2 text-sm text-canopy-100/70">
                    <div className="flex justify-between">
                      <span>Joueurs</span>
                      <span className="text-canopy-300">
                        {universe.playerCount} / {universe.maxPlayers}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Statut</span>
                      <span className="text-canopy-300">{getStatusLabel(universe.status)}</span>
                    </div>
                  </div>

                  <div className="mt-auto">
                    <JoinUniverseButton universeId={universe.id} />
                  </div>
                </AnimatedCard>
              </StaggerItem>
            ))}
          </StaggerContainer>
        )}
      </div>
    </div>
  );
}
