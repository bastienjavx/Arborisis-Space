import { RESOURCE_TYPES, ResourceType, type ResourceBundle } from '@arborisis/shared';
import { FiCircle, FiDroplet, FiHexagon } from 'react-icons/fi';
import { formatNumber, resourceLabel } from '@/lib/format';

const RESOURCE_ICONS = {
  [ResourceType.BIOMASS]: FiDroplet,
  [ResourceType.SAP]: FiCircle,
  [ResourceType.MINERALS]: FiHexagon,
  [ResourceType.SPORES]: FiCircle,
};

export function ResourceCost({ cost }: { cost: ResourceBundle }) {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1">
      {RESOURCE_TYPES.filter((resource) => (cost[resource] ?? 0) > 0).map((resource) => {
        const Icon = RESOURCE_ICONS[resource];
        return (
          <span
            key={resource}
            className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs text-canopy-100/58"
            title={resourceLabel(resource)}
          >
            <Icon className="h-3.5 w-3.5 text-canopy-300/55" aria-hidden="true" />
            {formatNumber(cost[resource] ?? 0)}
          </span>
        );
      })}
    </div>
  );
}
