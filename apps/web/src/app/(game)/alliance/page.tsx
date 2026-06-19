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
import { FiSearch, FiUsers, FiShield, FiMessageSquare } from 'react-icons/fi';

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
      className="flex items-center justify-between gap-3 border-b border-canopy-700/10 py-3 last:border-0"
    >
      <div className="flex items-center gap-3">
        <div
          className="h-9 w-9 rounded-full"
          style={{ backgroundColor: RACES[member.race].defaultColor }}
        />
        <div>
          <p className="font-medium text-canopy-100">
            {member.displayName || member.username}
            {isMe && <span className="ml-2 text-xs text-canopy-100/40">(vous)</span>}
          </p>
          <p className="text-xs text-canopy-100/50">
            {RACES[member.race].name} • {ROLE_LABELS[member.role]}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
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
    <div className="space-y-6">
      <AnimatedCard glowColor={`${alliance.bannerColor}40`}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div
              className="flex h-16 w-16 items-center justify-center rounded-2xl text-2xl font-bold text-bark-950"
              style={{ backgroundColor: alliance.bannerColor }}
            >
              {alliance.tag}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-canopy-100">{alliance.name}</h2>
              <p className="text-sm text-canopy-100/60">
                <FiUsers className="mr-1 inline" />
                {alliance.memberCount} membres • score {alliance.totalScore.toLocaleString('fr-FR')}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {isLeader && (
              <AnimatedButton
                variant="danger"
                onClick={() => disband.mutate(alliance.id)}
                disabled={disband.isPending}
              >
                Dissoudre
              </AnimatedButton>
            )}
            <AnimatedButton
              variant="ghost"
              onClick={() => leave.mutate()}
              disabled={leave.isPending}
            >
              Quitter
            </AnimatedButton>
          </div>
        </div>
        {alliance.description && (
          <p className="mt-4 text-sm text-canopy-100/70">{alliance.description}</p>
        )}
      </AnimatedCard>

      <AnimatedCard>
        <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold text-canopy-100">
          <FiShield />
          Membres
        </h3>
        <ul>
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
      </AnimatedCard>

      {isOfficer && applications && applications.length > 0 && (
        <AnimatedCard>
          <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold text-canopy-100">
            <FiMessageSquare />
            Candidatures
          </h3>
          <ul className="space-y-3">
            {applications.map((app) => (
              <motion.li
                key={app.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-canopy-700/10 bg-bark-900/40 p-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-canopy-100">{app.username}</p>
                  <div className="flex gap-2">
                    <AnimatedButton
                      variant="ghost"
                      className="px-2.5 py-1.5 text-xs"
                      onClick={() => decide.mutate({ id: app.id, body: { decision: 'ACCEPT' } })}
                      disabled={decide.isPending}
                    >
                      Accepter
                    </AnimatedButton>
                    <AnimatedButton
                      variant="danger"
                      className="px-2.5 py-1.5 text-xs"
                      onClick={() => decide.mutate({ id: app.id, body: { decision: 'REJECT' } })}
                      disabled={decide.isPending}
                    >
                      Refuser
                    </AnimatedButton>
                  </div>
                </div>
                {app.message && (
                  <p className="mt-2 text-sm italic text-canopy-100/60">“{app.message}”</p>
                )}
              </motion.li>
            ))}
          </ul>
        </AnimatedCard>
      )}
    </div>
  );
}

function AllianceBrowser() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const { data: alliances, isLoading } = useAlliances(debouncedSearch);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timeout);
  }, [search]);

  if (selectedId) {
    return <AllianceDetailBrowser allianceId={selectedId} onBack={() => setSelectedId(null)} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <FiSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-canopy-100/40" />
          <input
            type="text"
            className="input w-full pl-9"
            placeholder="Rechercher une alliance..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <AnimatedButton onClick={() => setShowCreate((s) => !s)}>
          {showCreate ? 'Annuler' : 'Fonder une alliance'}
        </AnimatedButton>
      </div>

      {showCreate && <CreateAllianceForm onCreated={() => setShowCreate(false)} />}

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

  if (isLoading || !user) return <p className="text-canopy-100/50">Germination…</p>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Alliance"
        subtitle="Unissez vos forces avec d’autres civilisations organiques."
      />
      {myAlliance ? <AllianceDetail alliance={myAlliance} /> : <AllianceBrowser />}
    </div>
  );
}
