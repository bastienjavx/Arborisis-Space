'use client';

import { useEffect, useState } from 'react';
import { AllianceRole, ALLIANCE_CREATION_COST, RACES, ResourceType } from '@arborisis/shared';
import type { AllianceDetailView, AllianceMemberView, AllianceView } from '@arborisis/shared';
import { AnimatedButton } from '@/components/AnimatedButton';
import { AnimatedCard } from '@/components/AnimatedCard';
import { PageHeader } from '@/components/PageHeader';
import {
  useAlliance,
  useAllianceApplications,
  useAlliances,
  useApplyAlliance,
  useCreateAlliance,
  useDecideApplication,
  useDemoteMember,
  useDisbandAlliance,
  useKickMember,
  useLeaveAlliance,
  useMe,
  useMyAlliance,
  usePromoteMember,
} from '@/lib/queries';
import { motion } from 'framer-motion';
import {
  FiCheck,
  FiLogOut,
  FiMoreHorizontal,
  FiSearch,
  FiShield,
  FiTrash2,
  FiUser,
  FiUsers,
  FiX,
} from 'react-icons/fi';

const ROLE_LABELS: Record<AllianceRole, string> = {
  [AllianceRole.LEADER]: 'Chef',
  [AllianceRole.OFFICER]: 'Officier',
  [AllianceRole.MEMBER]: 'Membre',
};

function AllianceCard({
  alliance,
  onSelect,
}: {
  alliance: AllianceView;
  onSelect: (id: string) => void;
}) {
  return (
    <AnimatedCard className="cursor-pointer" hover glowColor={`${alliance.bannerColor}40`}>
      <button type="button" className="w-full text-left" onClick={() => onSelect(alliance.id)}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-xl text-lg font-bold text-bark-950"
              style={{ backgroundColor: alliance.bannerColor }}
            >
              {alliance.tag}
            </div>
            <div>
              <h3 className="font-semibold text-canopy-100">{alliance.name}</h3>
              <p className="text-xs text-canopy-100/50">
                <FiUsers className="mr-1 inline" />
                {alliance.memberCount} membres • score {alliance.totalScore.toLocaleString('fr-FR')}
              </p>
            </div>
          </div>
        </div>
        {alliance.description && (
          <p className="mt-3 line-clamp-2 text-sm text-canopy-100/60">{alliance.description}</p>
        )}
      </button>
    </AnimatedCard>
  );
}

function CreateAllianceForm({ onCreated }: { onCreated: () => void }) {
  const create = useCreateAlliance();
  const [tag, setTag] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [bannerColor, setBannerColor] = useState('#22c55e');
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await create.mutateAsync({
        tag: tag.trim().toUpperCase(),
        name: name.trim(),
        description: description.trim() || undefined,
        bannerColor,
      });
      setTag('');
      setName('');
      setDescription('');
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    }
  }

  return (
    <AnimatedCard>
      <h3 className="mb-4 text-lg font-semibold text-canopy-100">Fonder une alliance</h3>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="tag">
              Tag (3-4 caractères)
            </label>
            <input
              id="tag"
              className="input uppercase"
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              minLength={3}
              maxLength={4}
              placeholder="TAG"
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="name">
              Nom
            </label>
            <input
              id="name"
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              minLength={3}
              maxLength={40}
              required
            />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="description">
            Description
          </label>
          <textarea
            id="description"
            className="input min-h-[80px] resize-none"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={500}
          />
        </div>
        <div>
          <label className="label" htmlFor="bannerColor">
            Couleur de bannière
          </label>
          <div className="flex items-center gap-3">
            <input
              id="bannerColor"
              type="color"
              className="h-10 w-16 cursor-pointer rounded bg-transparent"
              value={bannerColor}
              onChange={(e) => setBannerColor(e.target.value)}
            />
            <input
              type="text"
              className="input flex-1"
              value={bannerColor}
              onChange={(e) => setBannerColor(e.target.value)}
              pattern="^#[0-9A-Fa-f]{6}$"
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4 pt-2">
          <AnimatedButton type="submit" disabled={create.isPending} loading={create.isPending}>
            Créer ({ALLIANCE_CREATION_COST[ResourceType.SPORES]?.toLocaleString('fr-FR')} spores)
          </AnimatedButton>
          {error && <p className="text-sm text-red-300">{error}</p>}
        </div>
      </form>
    </AnimatedCard>
  );
}

function MemberRow({
  member,
  isLeader,
  isOfficer,
  isMe,
  allianceId,
}: {
  member: AllianceMemberView;
  isLeader: boolean;
  isOfficer: boolean;
  isMe: boolean;
  allianceId: string;
}) {
  const kick = useKickMember(allianceId);
  const promote = usePromoteMember(allianceId);
  const demote = useDemoteMember(allianceId);

  const canKick =
    !isMe &&
    member.role !== AllianceRole.LEADER &&
    (isLeader || (isOfficer && member.role === AllianceRole.MEMBER));
  const canPromote =
    !isMe &&
    (isLeader || (isOfficer && member.role === AllianceRole.MEMBER)) &&
    member.role !== AllianceRole.LEADER;
  const canDemote = !isMe && isLeader && member.role === AllianceRole.OFFICER;

  return (
    <motion.li
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="grid gap-3 border-b border-canopy-700/10 px-3 py-3 last:border-0 sm:grid-cols-[minmax(12rem,1fr)_7rem_minmax(10rem,auto)] sm:items-center"
    >
      <div className="flex items-center gap-3">
        <span
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full border bg-bark-950/60"
          style={{ borderColor: `${RACES[member.race].defaultColor}66` }}
        >
          <FiUser
            className="h-4 w-4"
            style={{ color: RACES[member.race].defaultColor }}
            aria-hidden="true"
          />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm text-canopy-100/82">
            {member.displayName || member.username}
            {isMe && <span className="ml-2 text-xs text-canopy-100/40">(vous)</span>}
          </p>
          <p className="mt-0.5 text-[10px] text-canopy-100/35">{RACES[member.race].name}</p>
        </div>
      </div>
      <span className="text-xs text-canopy-100/55">{ROLE_LABELS[member.role]}</span>
      <div className="flex flex-wrap items-center justify-end gap-2">
        {canPromote && (
          <AnimatedButton
            variant="ghost"
            className="px-2.5 py-1.5 text-xs"
            onClick={() => promote.mutate(member.userId)}
            disabled={promote.isPending}
          >
            Promouvoir
          </AnimatedButton>
        )}
        {canDemote && (
          <AnimatedButton
            variant="ghost"
            className="px-2.5 py-1.5 text-xs"
            onClick={() => demote.mutate(member.userId)}
            disabled={demote.isPending}
          >
            Rétrograder
          </AnimatedButton>
        )}
        {canKick && (
          <AnimatedButton
            variant="danger"
            className="px-2.5 py-1.5 text-xs"
            onClick={() => kick.mutate(member.userId)}
            disabled={kick.isPending}
          >
            Expulser
          </AnimatedButton>
        )}
      </div>
    </motion.li>
  );
}

function AllianceDetail({ alliance }: { alliance: AllianceDetailView }) {
  const { data: user } = useMe();
  const leave = useLeaveAlliance();
  const disband = useDisbandAlliance();
  const decide = useDecideApplication();

  const userId = user?.id ?? '';
  const myMembership = alliance.members.find((m) => m.userId === userId);
  const isLeader = myMembership?.role === AllianceRole.LEADER;
  const isOfficer = isLeader || myMembership?.role === AllianceRole.OFFICER;
  const { data: applications } = useAllianceApplications(isOfficer);

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(32rem,1.25fr)_minmax(20rem,0.7fr)]">
      <div className="mycelium-panel overflow-hidden">
        <div className="border-b border-canopy-700/15 p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-4">
              <span
                className="grid h-16 w-16 shrink-0 place-items-center rounded-full border bg-bark-950/60 font-display text-lg"
                style={{ borderColor: `${alliance.bannerColor}66`, color: alliance.bannerColor }}
              >
                {alliance.tag}
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate font-display text-3xl text-canopy-50/90">
                    {alliance.name}
                  </h2>
                  <span className="rounded border border-canopy-700/20 px-2 py-0.5 text-[10px] text-canopy-100/42">
                    [{alliance.tag}]
                  </span>
                </div>
                {alliance.description && (
                  <p className="mt-2 text-sm text-canopy-100/55">{alliance.description}</p>
                )}
                <div className="mt-4 flex flex-wrap gap-5 text-xs text-canopy-100/48">
                  <span className="inline-flex items-center gap-2">
                    <FiUsers className="h-4 w-4 text-canopy-300/60" aria-hidden="true" />
                    {alliance.memberCount} membres
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <FiShield className="h-4 w-4 text-canopy-300/60" aria-hidden="true" />
                    Vous êtes {myMembership ? ROLE_LABELS[myMembership.role] : 'visiteur'}
                  </span>
                  <span>Score {alliance.totalScore.toLocaleString('fr-FR')}</span>
                </div>
              </div>
            </div>
            <FiMoreHorizontal className="h-5 w-5 text-canopy-100/35" aria-hidden="true" />
          </div>
        </div>

        <div className="px-3 py-4 sm:px-5">
          <div className="flex items-center justify-between px-3 pb-3">
            <h3 className="section-title">Membres ({alliance.memberCount})</h3>
            <span className="text-[10px] uppercase tracking-[0.13em] text-canopy-100/28">
              Rôle · actions
            </span>
          </div>
          <ul className="overflow-hidden rounded-xl border border-canopy-700/15">
            {alliance.members.map((member) => (
              <MemberRow
                key={member.userId}
                member={member}
                isLeader={isLeader}
                isOfficer={isOfficer}
                isMe={member.userId === userId}
                allianceId={alliance.id}
              />
            ))}
          </ul>
        </div>
      </div>

      <aside className="space-y-5">
        {isOfficer && (
          <section className="mycelium-panel overflow-hidden">
            <div className="flex items-center justify-between border-b border-canopy-700/15 px-5 py-4">
              <h3 className="section-title">Demandes en attente</h3>
              <span className="text-xs text-canopy-300/60">{applications?.length ?? 0}</span>
            </div>
            {applications && applications.length > 0 ? (
              <ul className="divide-y divide-canopy-700/10 px-5">
                {applications.map((application) => (
                  <motion.li
                    key={application.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-3 py-4"
                  >
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-spore-500/20 text-spore-400/65">
                      <FiUser className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-canopy-100/75">{application.username}</p>
                      <p className="mt-1 line-clamp-1 text-[10px] text-canopy-100/32">
                        {application.message || 'Sans message'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        decide.mutate({ id: application.id, body: { decision: 'ACCEPT' } })
                      }
                      disabled={decide.isPending}
                      className="grid h-9 w-9 place-items-center rounded-lg border border-canopy-500/25 text-canopy-300 transition hover:bg-canopy-500/10 disabled:opacity-40"
                      aria-label={`Accepter ${application.username}`}
                    >
                      <FiCheck className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        decide.mutate({ id: application.id, body: { decision: 'REJECT' } })
                      }
                      disabled={decide.isPending}
                      className="grid h-9 w-9 place-items-center rounded-lg border border-red-500/20 text-red-300/75 transition hover:bg-red-500/10 disabled:opacity-40"
                      aria-label={`Refuser ${application.username}`}
                    >
                      <FiX className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </motion.li>
                ))}
              </ul>
            ) : (
              <p className="px-5 py-6 text-sm text-canopy-100/38">Aucune demande en attente.</p>
            )}
          </section>
        )}

        <section className="mycelium-panel overflow-hidden">
          <div className="border-b border-canopy-700/15 px-5 py-4">
            <h3 className="section-title">Actions de guilde</h3>
            <p className="mt-1 text-xs text-canopy-100/35">
              Ces actions affectent votre participation.
            </p>
          </div>
          <div className="space-y-3 p-4">
            <button
              type="button"
              onClick={() => leave.mutate()}
              disabled={leave.isPending}
              className="flex w-full items-center gap-3 rounded-xl border border-canopy-700/15 px-4 py-4 text-left transition hover:bg-canopy-500/[0.035] disabled:opacity-40"
            >
              <FiLogOut className="h-4 w-4 text-canopy-100/45" aria-hidden="true" />
              <span>
                <span className="block text-sm text-canopy-100/72">Quitter la guilde</span>
                <span className="mt-1 block text-xs text-canopy-100/32">
                  Vous quitterez {alliance.name}.
                </span>
              </span>
            </button>
            {isLeader && (
              <button
                type="button"
                onClick={() => disband.mutate(alliance.id)}
                disabled={disband.isPending}
                className="flex w-full items-center gap-3 rounded-xl border border-red-500/15 px-4 py-4 text-left transition hover:bg-red-500/[0.045] disabled:opacity-40"
              >
                <FiTrash2 className="h-4 w-4 text-red-300/65" aria-hidden="true" />
                <span>
                  <span className="block text-sm text-red-300/80">Dissoudre la guilde</span>
                  <span className="mt-1 block text-xs text-canopy-100/32">
                    Cette action est définitive.
                  </span>
                </span>
              </button>
            )}
          </div>
        </section>
      </aside>
    </div>
  );
}

function AllianceBrowser() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const { data: alliances, isLoading } = useAlliances(debouncedSearch);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timeout);
  }, [search]);

  if (selectedId) {
    return <AllianceDetailBrowser allianceId={selectedId} onBack={() => setSelectedId(null)} />;
  }

  return (
    <div className="space-y-6">
      <div className="relative max-w-2xl">
        <FiSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-canopy-100/40" />
        <input
          type="text"
          className="input w-full pl-9"
          placeholder="Rechercher une alliance..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading || !alliances ? (
        <p className="text-canopy-100/50">Recherche en cours…</p>
      ) : alliances.length === 0 ? (
        <p className="text-center text-canopy-100/40">Aucune alliance trouvée.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {alliances.map((alliance) => (
            <AllianceCard key={alliance.id} alliance={alliance} onSelect={setSelectedId} />
          ))}
        </div>
      )}
    </div>
  );
}

function AllianceDetailBrowser({ allianceId, onBack }: { allianceId: string; onBack: () => void }) {
  const { data: alliance, isLoading } = useAlliance(allianceId);
  const apply = useApplyAlliance(allianceId);
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function onApply() {
    setError(null);
    try {
      await apply.mutateAsync({ message: message.trim() || undefined });
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    }
  }

  if (isLoading || !alliance) return <p className="text-canopy-100/50">Chargement…</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <AnimatedButton variant="ghost" onClick={onBack}>
          ← Retour
        </AnimatedButton>
      </div>
      <AllianceDetail alliance={alliance} />
      <AnimatedCard>
        <h3 className="mb-3 text-lg font-semibold text-canopy-100">Postuler</h3>
        {sent ? (
          <p className="text-canopy-400">Candidature envoyée.</p>
        ) : (
          <>
            <textarea
              className="input min-h-[100px] resize-none"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={500}
              placeholder="Votre message aux recruteurs..."
            />
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <AnimatedButton
                onClick={onApply}
                disabled={apply.isPending}
                loading={apply.isPending}
              >
                Envoyer ma candidature
              </AnimatedButton>
              {error && <p className="text-sm text-red-300">{error}</p>}
            </div>
          </>
        )}
      </AnimatedCard>
    </div>
  );
}

export default function AlliancePage() {
  const { data: user } = useMe();
  const { data: myAlliance, isLoading } = useMyAlliance();
  const [tab, setTab] = useState<'mine' | 'discover' | 'create'>('mine');

  if (isLoading || !user) return <p className="text-canopy-100/50">Germination…</p>;

  return (
    <div className="space-y-5">
      <PageHeader title="Alliance" subtitle="Unissez vos forces et partagez votre prospérité." />
      <div className="flex gap-8 border-b border-canopy-700/15 px-1" role="tablist">
        {(
          [
            ['mine', 'Ma guilde'],
            ['discover', 'Découvrir'],
            ['create', 'Créer'],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={tab === value}
            onClick={() => setTab(value)}
            className={`relative pb-3 text-sm transition ${
              tab === value ? 'text-canopy-100' : 'text-canopy-100/42 hover:text-canopy-100/70'
            }`}
          >
            {label}
            {tab === value && (
              <motion.span
                layoutId="alliance-tab"
                className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-canopy-300"
              />
            )}
          </button>
        ))}
      </div>

      {tab === 'mine' &&
        (myAlliance ? (
          <AllianceDetail alliance={myAlliance} />
        ) : (
          <div className="mycelium-panel grid min-h-64 place-items-center px-5 py-10 text-center">
            <div>
              <FiUsers className="mx-auto h-10 w-10 text-canopy-300/35" aria-hidden="true" />
              <h2 className="mt-4 font-display text-xl text-canopy-100/72">Aucune guilde</h2>
              <p className="mt-2 text-sm text-canopy-100/38">
                Découvrez une alliance existante ou fondez la vôtre.
              </p>
            </div>
          </div>
        ))}
      {tab === 'discover' && <AllianceBrowser />}
      {tab === 'create' && <CreateAllianceForm onCreated={() => setTab('mine')} />}
    </div>
  );
}
