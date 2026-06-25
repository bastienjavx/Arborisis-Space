'use client';

import { useState } from 'react';
import { GameIcon } from '@/components/GameIcon';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ITEMS,
  SHIPS,
  ItemKey,
  ResourceType,
  ShipType,
  TradeRouteStatus,
  type CreateTradeRouteDto,
  type TradeRouteView,
} from '@arborisis/shared';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';
import { usePlanetSelection } from '@/components/PlanetContext';
import { FiPlus, FiPause, FiPlay, FiTrash2, FiArrowRight, FiRefreshCw } from 'react-icons/fi';

const TRANSPORT_SHIPS = [
  ShipType.SYMBIOTIC_HARVESTER,
  ShipType.CHITIN_FREIGHTER,
  ShipType.SEED_POD,
];

function RouteCard({
  route,
  onToggle,
  onDelete,
}: {
  route: TradeRouteView;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const cargo = route.itemKey
    ? (ITEMS[route.itemKey as ItemKey]?.name ?? route.itemKey)
    : (route.resource ?? '—');
  const icon = route.itemKey ? ITEMS[route.itemKey as ItemKey]?.icon : 'package';
  const shipName = SHIPS[route.shipType]?.name ?? route.shipType;

  return (
    <div
      className={`rounded-xl border bg-bark-900/60 p-4 transition ${
        route.status === TradeRouteStatus.ACTIVE
          ? 'border-canopy-700/25'
          : 'border-canopy-700/10 opacity-60'
      }`}
    >
      {/* Route header */}
      <div className="mb-3 flex items-center gap-2">
        <span className="text-lg"><GameIcon name={icon} className="h-5 w-5" /></span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-sm font-semibold text-canopy-100">
            <span className="truncate">{route.fromPlanetName}</span>
            <FiArrowRight className="h-3.5 w-3.5 shrink-0 text-canopy-100/40" aria-hidden />
            <span className="truncate">{route.toPlanetName}</span>
          </div>
          <p className="text-xs text-canopy-100/40">
            {cargo} · {route.quantityPerRun.toLocaleString()} unités · toutes les{' '}
            {route.intervalHours}h
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
            route.status === TradeRouteStatus.ACTIVE
              ? 'bg-emerald-900/30 text-emerald-400'
              : 'bg-bark-700/40 text-canopy-100/30'
          }`}
        >
          {route.status === TradeRouteStatus.ACTIVE ? 'Active' : 'Pausée'}
        </span>
      </div>

      {/* Stats */}
      <div className="mb-3 grid grid-cols-3 gap-3 text-xs">
        <div>
          <p className="text-canopy-100/30">Vaisseaux</p>
          <p className="font-semibold text-canopy-100">
            {route.shipCount}× {shipName}
          </p>
        </div>
        <div>
          <p className="text-canopy-100/30">Dernier run</p>
          <p className="text-canopy-100/70">
            {route.lastRunAt ? new Date(route.lastRunAt).toLocaleTimeString() : 'Jamais'}
          </p>
        </div>
        <div>
          <p className="text-canopy-100/30">Prochain run</p>
          <p className="text-canopy-100/70">
            {route.nextRunAt ? new Date(route.nextRunAt).toLocaleTimeString() : '—'}
          </p>
        </div>
      </div>

      {/* Lien vers le marché si la cargaison est un objet */}
      {route.itemKey && (
        <a
          href={`/market/${route.itemKey}`}
          className="mb-2 flex items-center gap-1 text-[10px] text-canopy-100/30 hover:text-canopy-300"
        >
          <FiRefreshCw className="h-2.5 w-2.5" aria-hidden />
          Voir le prix de marché
        </a>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={onToggle}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-bark-800/50 py-2 text-xs font-medium text-canopy-100/60 transition hover:bg-bark-700/60 hover:text-canopy-100"
        >
          {route.status === TradeRouteStatus.ACTIVE ? (
            <>
              <FiPause className="h-3.5 w-3.5" aria-hidden /> Pause
            </>
          ) : (
            <>
              <FiPlay className="h-3.5 w-3.5" aria-hidden /> Reprendre
            </>
          )}
        </button>
        <button
          onClick={onDelete}
          className="flex items-center gap-1 rounded-lg bg-red-900/20 px-3 py-2 text-xs font-medium text-red-400/70 transition hover:bg-red-900/40 hover:text-red-300"
        >
          <FiTrash2 className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>
    </div>
  );
}

export default function TradeRoutesPage() {
  const qc = useQueryClient();
  const { planets, selectedId: planetId } = usePlanetSelection();
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState('');

  const [fromPlanetId, setFromPlanetId] = useState('');
  const [toPlanetId, setToPlanetId] = useState('');
  const [cargoType, setCargoType] = useState<'item' | 'resource'>('resource');
  const [itemKey, setItemKey] = useState<ItemKey>(ItemKey.MYCELIAL_FIBER);
  const [resource, setResource] = useState<ResourceType>(ResourceType.BIOMASS);
  const [qty, setQty] = useState('100');
  const [shipType, setShipType] = useState<ShipType>(ShipType.SYMBIOTIC_HARVESTER);
  const [shipCount, setShipCount] = useState('1');
  const [intervalHours, setIntervalHours] = useState('4');

  const { data: routes, isLoading } = useQuery({
    queryKey: ['trade-routes'],
    queryFn: () => api.tradeRoutes(),
    refetchInterval: 30_000,
  });

  const create = useMutation({
    mutationFn: (dto: CreateTradeRouteDto) => api.createTradeRoute(dto),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trade-routes'] });
      setShowForm(false);
      setFormError('');
    },
    onError: (e: Error) => setFormError(e.message),
  });

  const toggle = useMutation({
    mutationFn: ({ id, status }: { id: string; status: TradeRouteStatus }) =>
      api.updateTradeRouteStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['trade-routes'] }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.deleteTradeRoute(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['trade-routes'] }),
  });

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!fromPlanetId || !toPlanetId) {
      setFormError('Sélectionnez les deux planètes.');
      return;
    }
    const dto: CreateTradeRouteDto = {
      fromPlanetId,
      toPlanetId,
      quantityPerRun: parseInt(qty),
      shipType,
      shipCount: parseInt(shipCount),
      intervalHours: parseInt(intervalHours),
    };
    if (cargoType === 'item') dto.itemKey = itemKey;
    else dto.resource = resource;
    create.mutate(dto);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <PageHeader
          title="Routes Commerciales"
          subtitle="Automatisez le transport de ressources et d'objets entre vos planètes."
        />
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-2 rounded-xl bg-canopy-600/25 px-4 py-2 text-sm font-semibold text-canopy-300 hover:bg-canopy-600/40"
        >
          <FiPlus className="h-4 w-4" aria-hidden />
          Nouvelle route
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="rounded-xl border border-canopy-700/25 bg-bark-900/60 p-5">
          <h3 className="mb-4 text-sm font-bold text-canopy-100">Nouvelle route commerciale</h3>
          <form onSubmit={handleCreate} className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Planète source</label>
              <select
                className="input w-full"
                value={fromPlanetId}
                onChange={(e) => setFromPlanetId(e.target.value)}
                required
              >
                <option value="">— Sélectionner —</option>
                {planets.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Planète destination</label>
              <select
                className="input w-full"
                value={toPlanetId}
                onChange={(e) => setToPlanetId(e.target.value)}
                required
              >
                <option value="">— Sélectionner —</option>
                {planets.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Cargo type selector */}
            <div className="sm:col-span-2">
              <label className="label">Type de cargaison</label>
              <div className="mb-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setCargoType('resource')}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium ${cargoType === 'resource' ? 'bg-canopy-600/30 text-canopy-300' : 'text-canopy-100/40 hover:text-canopy-100'}`}
                >
                  Ressource de base
                </button>
                <button
                  type="button"
                  onClick={() => setCargoType('item')}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium ${cargoType === 'item' ? 'bg-canopy-600/30 text-canopy-300' : 'text-canopy-100/40 hover:text-canopy-100'}`}
                >
                  Objet d'inventaire
                </button>
              </div>
              {cargoType === 'resource' ? (
                <select
                  className="input w-full"
                  value={resource}
                  onChange={(e) => setResource(e.target.value as ResourceType)}
                >
                  {Object.values(ResourceType).map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              ) : (
                <select
                  className="input w-full"
                  value={itemKey}
                  onChange={(e) => setItemKey(e.target.value as ItemKey)}
                >
                  {Object.values(ITEMS).map((item) => (
                    <option key={item.key} value={item.key}>
                      {item.icon} {item.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="label">Quantité par trajet</label>
              <input
                type="number"
                min={1}
                className="input w-full"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label">Intervalle (heures)</label>
              <input
                type="number"
                min={1}
                max={168}
                className="input w-full"
                value={intervalHours}
                onChange={(e) => setIntervalHours(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="label">Type de vaisseau</label>
              <select
                className="input w-full"
                value={shipType}
                onChange={(e) => setShipType(e.target.value as ShipType)}
              >
                {TRANSPORT_SHIPS.map((t) => (
                  <option key={t} value={t}>
                    {SHIPS[t].name} (cargaison {SHIPS[t].cargo.toLocaleString()})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Nombre de vaisseaux</label>
              <input
                type="number"
                min={1}
                max={1000}
                className="input w-full"
                value={shipCount}
                onChange={(e) => setShipCount(e.target.value)}
                required
              />
            </div>

            {formError && (
              <div className="sm:col-span-2 rounded-lg bg-red-900/20 px-3 py-2 text-xs text-red-400">
                {formError}
              </div>
            )}

            <div className="sm:col-span-2 flex gap-3">
              <button type="submit" disabled={create.isPending} className="btn btn-primary flex-1">
                {create.isPending ? 'Création…' : 'Créer la route'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn">
                Annuler
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Routes list */}
      {isLoading && (
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-xl bg-bark-800/50" />
          ))}
        </div>
      )}

      {!isLoading && (routes?.length ?? 0) === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-canopy-700/15 bg-bark-900/40 py-14">
          <FiRefreshCw className="h-10 w-10 text-canopy-100/15" aria-hidden />
          <p className="text-sm text-canopy-100/40">Aucune route commerciale configurée.</p>
          <button onClick={() => setShowForm(true)} className="btn btn-primary">
            Créer une route
          </button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {routes?.map((route) => (
          <RouteCard
            key={route.id}
            route={route}
            onToggle={() =>
              toggle.mutate({
                id: route.id,
                status:
                  route.status === TradeRouteStatus.ACTIVE
                    ? TradeRouteStatus.PAUSED
                    : TradeRouteStatus.ACTIVE,
              })
            }
            onDelete={() => remove.mutate(route.id)}
          />
        ))}
      </div>
    </div>
  );
}
