'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BondPositionStatus,
  type BondOfferingView,
  type SubscribeBondDto,
} from '@arborisis/shared';
import { FiArrowLeft, FiCheckCircle, FiClock, FiTrendingUp } from 'react-icons/fi';
import { api } from '@/lib/api';
import { formatNumber, resourceLabel } from '@/lib/format';
import { keys, useBondOfferings, useMyBonds, usePlanetDetail } from '@/lib/queries';
import { usePlanetSelection } from '@/components/PlanetContext';
import { RESOURCE_VISUALS } from '@/lib/resourceVisuals';

export default function MarketBondsPage() {
  const qc = useQueryClient();
  const { selectedId: planetId } = usePlanetSelection();
  const { data: planet } = usePlanetDetail(planetId);
  const { data: offerings, isLoading: offeringsLoading } = useBondOfferings();
  const { data: bonds } = useMyBonds();
  const [principalByOffer, setPrincipalByOffer] = useState<Record<string, string>>({});
  const [error, setError] = useState('');

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: keys.bondOfferings });
    void qc.invalidateQueries({ queryKey: keys.myBonds });
    if (planetId) void qc.invalidateQueries({ queryKey: keys.planet(planetId) });
  };

  const subscribe = useMutation({
    mutationFn: (body: SubscribeBondDto) => api.subscribeBond(body),
    onSuccess: () => {
      invalidate();
      setPrincipalByOffer({});
      setError('');
    },
    onError: (e: Error) => setError(e.message),
  });

  const claim = useMutation({
    mutationFn: (id: string) => api.claimBond(id, planetId ? { targetPlanetId: planetId } : {}),
    onSuccess: () => {
      invalidate();
      setError('');
    },
    onError: (e: Error) => setError(e.message),
  });

  function submitOffering(offering: BondOfferingView) {
    if (!planetId) return setError('Sélectionnez une planète.');
    const principal = Number.parseInt(principalByOffer[offering.id] ?? '', 10);
    if (!principal || principal <= 0) return setError('Principal invalide.');
    subscribe.mutate({ offeringId: offering.id, sourcePlanetId: planetId, principal });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href="/market"
          className="rounded-lg p-1.5 text-canopy-100/40 hover:bg-bark-800/60 hover:text-canopy-100"
        >
          <FiArrowLeft className="h-5 w-5" aria-hidden />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-canopy-100">Obligations Mycosynth</h1>
          <p className="text-xs text-canopy-100/50">
            Placez des ressources auprès de l’IA et réclamez principal + rendement à maturité.
          </p>
        </div>
        <Link
          href="/market/resources"
          className="ml-auto rounded-lg border border-canopy-700/20 bg-bark-900/50 px-3 py-1.5 text-xs text-canopy-100/60 transition hover:border-canopy-500/40 hover:text-canopy-100"
        >
          Ressources
        </Link>
      </div>

      {error && <p className="rounded-lg bg-red-900/20 px-3 py-2 text-xs text-red-400">{error}</p>}

      <section>
        <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-canopy-100/50">
          Offres disponibles
        </h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {(offerings ?? []).map((offering) => {
            const Icon = RESOURCE_VISUALS[offering.resource].Icon;
            const principal = Number.parseInt(principalByOffer[offering.id] ?? '0', 10);
            const payout = principal
              ? principal + Math.floor(principal * offering.currentYieldRate)
              : 0;
            return (
              <div
                key={offering.id}
                className="rounded-xl border border-canopy-700/20 bg-bark-900/60 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-canopy-100">{offering.name}</p>
                    <p className="text-xs text-canopy-100/40">
                      {offering.durationHours}h · {resourceLabel(offering.resource)}
                    </p>
                  </div>
                  <Icon className={`h-5 w-5 ${RESOURCE_VISUALS[offering.resource].className}`} />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                  <MarketMetric
                    label="Rendement"
                    value={`${(offering.currentYieldRate * 100).toFixed(2)}%`}
                  />
                  <MarketMetric
                    label="Limites"
                    value={`${formatNumber(offering.minPrincipal)}-${formatNumber(offering.maxPrincipal)}`}
                  />
                </div>
                <label className="mt-3 block text-[10px] uppercase tracking-widest text-canopy-100/40">
                  Principal
                </label>
                <input
                  type="number"
                  min={offering.minPrincipal}
                  max={offering.maxPrincipal}
                  value={principalByOffer[offering.id] ?? ''}
                  onChange={(event) =>
                    setPrincipalByOffer((current) => ({
                      ...current,
                      [offering.id]: event.target.value,
                    }))
                  }
                  className="input mt-1 w-full font-mono"
                  placeholder={String(offering.minPrincipal)}
                />
                <p className="mt-2 text-xs text-canopy-100/40">
                  Paiement estimé :{' '}
                  <span className="font-mono text-canopy-100">
                    {payout ? formatNumber(payout) : '—'}
                  </span>
                </p>
                <button
                  type="button"
                  disabled={subscribe.isPending || offeringsLoading}
                  onClick={() => submitOffering(offering)}
                  className="mt-3 w-full rounded-lg bg-canopy-600/30 py-2.5 text-sm font-semibold text-canopy-200 transition hover:bg-canopy-600/50 disabled:opacity-50"
                >
                  Souscrire
                </button>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-canopy-100/50">
          Mes obligations
        </h2>
        <div className="space-y-2">
          {(bonds ?? []).length === 0 && (
            <p className="rounded-xl border border-canopy-700/20 bg-bark-900/60 p-4 text-sm text-canopy-100/45">
              Aucune obligation active.
            </p>
          )}
          {(bonds ?? []).map((bond) => {
            const Icon = RESOURCE_VISUALS[bond.resource].Icon;
            const claimed = bond.status === BondPositionStatus.CLAIMED;
            return (
              <div
                key={bond.id}
                className="grid gap-3 rounded-xl border border-canopy-700/20 bg-bark-900/60 p-4 md:grid-cols-[minmax(0,1fr)_auto]"
              >
                <div className="flex min-w-0 gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-canopy-700/20 bg-bark-800/50">
                    <Icon className={`h-5 w-5 ${RESOURCE_VISUALS[bond.resource].className}`} />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-canopy-100">
                      {bond.offeringName}
                    </p>
                    <p className="text-xs text-canopy-100/45">
                      {formatNumber(bond.principal)} → {formatNumber(bond.payoutAmount)}{' '}
                      {resourceLabel(bond.resource)}
                    </p>
                    <p className="text-xs text-canopy-100/35">
                      Maturité : {new Date(bond.maturesAt).toLocaleString('fr-FR')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs ${
                      claimed
                        ? 'border-canopy-700/20 text-canopy-100/35'
                        : bond.isMatured
                          ? 'border-emerald-400/25 bg-emerald-500/10 text-emerald-300'
                          : 'border-sap-400/25 bg-sap-500/10 text-sap-300'
                    }`}
                  >
                    {claimed ? (
                      <FiCheckCircle className="h-3.5 w-3.5" />
                    ) : bond.isMatured ? (
                      <FiTrendingUp className="h-3.5 w-3.5" />
                    ) : (
                      <FiClock className="h-3.5 w-3.5" />
                    )}
                    {claimed ? 'Réclamée' : bond.isMatured ? 'Mûre' : 'Active'}
                  </span>
                  {!claimed && bond.isMatured && (
                    <button
                      type="button"
                      onClick={() => claim.mutate(bond.id)}
                      disabled={claim.isPending}
                      className="rounded-lg bg-emerald-600/30 px-3 py-2 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-600/50 disabled:opacity-50"
                    >
                      Réclamer
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {planet && (
        <p className="text-xs text-canopy-100/35">
          Planète active : {planet.name}. Les souscriptions débitent cette planète, les paiements y
          sont crédités si elle reste sélectionnée.
        </p>
      )}
    </div>
  );
}

function MarketMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-bark-800/45 p-2">
      <p className="text-[10px] uppercase tracking-widest text-canopy-100/35">{label}</p>
      <p className="font-mono text-canopy-100">{value}</p>
    </div>
  );
}
