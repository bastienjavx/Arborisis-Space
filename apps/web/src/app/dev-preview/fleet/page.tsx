'use client';

/**
 * Page de preview dev-only (hors groupe `(game)` → pas d'auth, pas de DB).
 * Sert à valider le rendu runtime des assets 3D générés (chargement GLB +
 * décodage Draco + normalisation) dans la vraie scène `FleetView`.
 *
 * À SUPPRIMER une fois la direction artistique validée.
 */

import { SHIP_TYPES, ShipType, type ShipCounts } from '@arborisis/shared';
import { FleetView } from '@/components/three';

const mockShips: ShipCounts = SHIP_TYPES.reduce((acc, type) => {
  acc[type] = 0;
  return acc;
}, {} as ShipCounts);

// Quelques croiseurs (GLB Meshy) + types procéduraux pour comparer.
mockShips[ShipType.BIOLUMINESCENT_CRUISER] = 6;
mockShips[ShipType.SPORAL_SCOUT] = 4;
mockShips[ShipType.CHITIN_DESTROYER] = 3;

export default function FleetPreviewPage() {
  return (
    <main style={{ width: '100vw', height: '100vh', background: '#06120d', margin: 0 }}>
      <FleetView ships={mockShips} activeMission className="h-screen w-screen" />
    </main>
  );
}
