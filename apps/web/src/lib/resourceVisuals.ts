import { ResourceType } from '@arborisis/shared';
import { FiAperture, FiDroplet, FiHexagon, FiSun } from 'react-icons/fi';
import type { IconType } from 'react-icons';

/**
 * Source unique de vérité visuelle des ressources : une icône **et** une couleur
 * distinctes par type. Indispensable pour que sève/spores (auparavant rendues avec
 * la même icône grise) soient discernables — sans quoi un joueur peut croire qu'il
 * lui manque des ressources alors que le coût porte sur une autre ressource.
 */
export const RESOURCE_VISUALS: Record<ResourceType, { Icon: IconType; className: string }> = {
  [ResourceType.BIOMASS]: { Icon: FiDroplet, className: 'text-canopy-400' },
  [ResourceType.SAP]: { Icon: FiSun, className: 'text-sap-400' },
  [ResourceType.MINERALS]: { Icon: FiHexagon, className: 'text-sky-400' },
  [ResourceType.SPORES]: { Icon: FiAperture, className: 'text-spore-400' },
};
