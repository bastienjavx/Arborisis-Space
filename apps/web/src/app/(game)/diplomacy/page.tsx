'use client';

import { useState } from 'react';
import { DiplomaticStatus, DiplomaticOfferStatus } from '@arborisis/shared';
import { PageHeader } from '@/components/PageHeader';
import { AnimatedButton } from '@/components/AnimatedButton';
import {
  useBreakDiplomaticRelation,
  useCreateDiplomaticOffer,
  useDecideDiplomaticOffer,
  useDiplomaticOffers,
  useDiplomaticRelations,
  useWithdrawDiplomaticOffer,
} from '@/lib/queries';
import { ApiError } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { FiAlertTriangle, FiCheck, FiShield, FiUsers, FiX } from 'react-icons/fi';

const STATUS_LABELS: Record<DiplomaticStatus, string> = {
  [DiplomaticStatus.WAR]: 'Guerre',
  [DiplomaticStatus.NON_AGGRESSION_PACT]: 'Pacte de non-agression',
  [DiplomaticStatus.TRADE_ALLIANCE]: 'Alliance commerciale',
};

const STATUS_COLORS: Record<DiplomaticStatus, string> = {
  [DiplomaticStatus.WAR]: 'border-red-500/30 bg-red-500/10 text-red-300',
  [DiplomaticStatus.NON_AGGRESSION_PACT]: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  [DiplomaticStatus.TRADE_ALLIANCE]: 'border-canopy-500/30 bg-canopy-500/10 text-canopy-300',
};

const OFFER_TYPE_LABELS: Record<DiplomaticStatus, string> = {
  [DiplomaticStatus.WAR]: 'Déclaration de guerre',
  [DiplomaticStatus.NON_AGGRESSION_PACT]: 'Pacte de non-agression',
  [DiplomaticStatus.TRADE_ALLIANCE]: 'Alliance commerciale',
};

function CreateOfferForm({ onClose }: { onClose: () => void }) {
  const [toAllianceId, setToAllianceId] = useState('');
  const [status, setStatus] = useState<DiplomaticStatus>(DiplomaticStatus.NON_AGGRESSION_PACT);
  const [error, setError] = useState<string>();
  const create = useCreateDiplomaticOffer();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!toAllianceId.trim()) return;
    setError(undefined);
    create.mutate(
      { toAllianceId: toAllianceId.trim(), proposedStatus: status },
      {
        onSuccess: () => onClose(),
        onError: (err) => setError(err instanceof ApiError ? err.message : 'Erreur'),
      },
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4 px-5 py-4">
      <div>
        <label className="mb-1.5 block text-xs text-canopy-300/70">
          ID de l&apos;alliance cible
        </label>
        <input
          type="text"
          value={toAllianceId}
          onChange={(e) => setToAllianceId(e.target.value)}
          placeholder="ex: clxyz…"
          className="w-full rounded-lg border border-canopy-700/30 bg-bark-900/60 px-3 py-2 text-sm text-canopy-100 outline-none placeholder:text-canopy-400/30 focus:border-canopy-500/50"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-xs text-canopy-300/70">Type de proposition</label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as DiplomaticStatus)}
          className="w-full rounded-lg border border-canopy-700/30 bg-bark-900/60 px-3 py-2 text-sm text-canopy-100 outline-none focus:border-canopy-500/50"
        >
          {Object.entries(OFFER_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      {error && <p className="text-xs text-red-300">{error}</p>}
      <div className="flex gap-2">
        <AnimatedButton
          type="submit"
          variant="primary"
          loading={create.isPending}
          className="flex-1"
        >
          Envoyer l&apos;offre
        </AnimatedButton>
        <AnimatedButton type="button" variant="ghost" onClick={onClose}>
          Annuler
        </AnimatedButton>
      </div>
    </form>
  );
}

export default function DiplomacyPage() {
  const { data: relations, isLoading: loadingRel } = useDiplomaticRelations();
  const { data: offers, isLoading: loadingOff } = useDiplomaticOffers();
  const breakRel = useBreakDiplomaticRelation();
  const decide = useDecideDiplomaticOffer();
  const withdraw = useWithdrawDiplomaticOffer();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [breakError, setBreakError] = useState<string>();

  const isLoading = loadingRel || loadingOff;

  if (isLoading) return <p className="text-canopy-100/50">Chargement…</p>;

  const pendingIncoming = (offers ?? []).filter((o) => o.status === DiplomaticOfferStatus.PENDING);
  const mySentOffers = (offers ?? []).filter((o) => o.status === DiplomaticOfferStatus.PENDING);

  return (
    <div className="space-y-6">
      <PageHeader
        title={
          <>
            Diplomatie <span className="italic text-canopy-300">mycélienne</span>
          </>
        }
        subtitle="Gérez vos relations diplomatiques inter-alliance : pactes, guerres et alliances commerciales."
      >
        <AnimatedButton
          variant="primary"
          onClick={() => setShowCreateForm((v) => !v)}
          className="whitespace-nowrap"
        >
          <FiUsers className="h-4 w-4" />
          Nouvelle offre
        </AnimatedButton>
      </PageHeader>

      <AnimatePresence>
        {showCreateForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mycelium-panel overflow-hidden"
          >
            <div className="border-b border-canopy-700/15 px-5 py-3">
              <h2 className="section-title">Proposer un accord diplomatique</h2>
            </div>
            <CreateOfferForm onClose={() => setShowCreateForm(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Offres en attente */}
      {pendingIncoming.length > 0 && (
        <section className="mycelium-panel overflow-hidden">
          <div className="flex items-center gap-2.5 border-b border-canopy-700/15 px-5 py-3.5">
            <FiAlertTriangle className="h-4 w-4 text-amber-300/70" aria-hidden="true" />
            <h2 className="section-title">Offres en attente ({pendingIncoming.length})</h2>
          </div>
          <ul className="divide-y divide-canopy-700/10">
            {pendingIncoming.map((offer) => (
              <li
                key={offer.id}
                className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center"
              >
                <div className="flex-1">
                  <p className="text-sm text-canopy-100">
                    {OFFER_TYPE_LABELS[offer.proposedStatus]}
                  </p>
                  <p className="mt-0.5 text-xs text-canopy-400/60">
                    Alliance proposante: {offer.fromAllianceId}
                  </p>
                  {offer.expiresAt && (
                    <p className="mt-0.5 text-[11px] text-canopy-400/40">
                      Expire le{' '}
                      {new Date(offer.expiresAt).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <AnimatedButton
                    variant="primary"
                    onClick={() => decide.mutate({ id: offer.id, accept: true })}
                    loading={decide.isPending}
                    className="flex-1 sm:flex-none"
                  >
                    <FiCheck className="h-3.5 w-3.5" />
                    Accepter
                  </AnimatedButton>
                  <AnimatedButton
                    variant="ghost"
                    onClick={() => decide.mutate({ id: offer.id, accept: false })}
                    loading={decide.isPending}
                    className="flex-1 sm:flex-none"
                  >
                    <FiX className="h-3.5 w-3.5" />
                    Refuser
                  </AnimatedButton>
                  <AnimatedButton
                    variant="ghost"
                    onClick={() => withdraw.mutate(offer.id)}
                    loading={withdraw.isPending}
                    className="flex-1 sm:flex-none"
                  >
                    Retirer
                  </AnimatedButton>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Relations actives */}
      <section className="mycelium-panel overflow-hidden">
        <div className="flex items-center gap-2.5 border-b border-canopy-700/15 px-5 py-3.5">
          <FiShield className="h-4 w-4 text-canopy-300/70" aria-hidden="true" />
          <h2 className="section-title">Relations diplomatiques</h2>
        </div>
        {!relations?.length ? (
          <p className="px-5 py-8 text-center text-sm text-canopy-400/50">
            Aucune relation diplomatique établie.
          </p>
        ) : (
          <ul className="divide-y divide-canopy-700/10">
            {relations.map((rel) => (
              <li
                key={rel.id}
                className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center"
              >
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${STATUS_COLORS[rel.status]}`}
                    >
                      {STATUS_LABELS[rel.status]}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-canopy-100/80">
                    [{rel.allianceTag}] {rel.allianceName}
                  </p>
                  <p className="text-[11px] text-canopy-400/40">
                    Depuis le{' '}
                    {new Date(rel.startedAt).toLocaleDateString('fr-FR', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                    {rel.expiresAt &&
                      ` · expire le ${new Date(rel.expiresAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}`}
                  </p>
                </div>
                {breakError && <p className="text-xs text-red-300">{breakError}</p>}
                <AnimatedButton
                  variant="ghost"
                  onClick={() => {
                    setBreakError(undefined);
                    breakRel.mutate(rel.id, {
                      onError: (e) => setBreakError(e instanceof ApiError ? e.message : 'Erreur'),
                    });
                  }}
                  loading={breakRel.isPending}
                  className="whitespace-nowrap"
                >
                  Rompre
                </AnimatedButton>
              </li>
            ))}
          </ul>
        )}
      </section>

      {mySentOffers.length > 0 && (
        <section className="mycelium-panel overflow-hidden">
          <div className="flex items-center gap-2.5 border-b border-canopy-700/15 px-5 py-3.5">
            <h2 className="section-title">Offres envoyées</h2>
          </div>
          <ul className="divide-y divide-canopy-700/10">
            {mySentOffers.map((offer) => (
              <li key={offer.id} className="flex items-center gap-4 px-5 py-3.5">
                <div className="flex-1">
                  <p className="text-sm text-canopy-100/80">
                    {OFFER_TYPE_LABELS[offer.proposedStatus]}
                  </p>
                  <p className="text-xs text-canopy-400/50">→ {offer.toAllianceId}</p>
                </div>
                <AnimatedButton
                  variant="ghost"
                  onClick={() => withdraw.mutate(offer.id)}
                  loading={withdraw.isPending}
                >
                  Retirer
                </AnimatedButton>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
