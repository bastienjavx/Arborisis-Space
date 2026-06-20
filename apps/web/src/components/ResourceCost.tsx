import { RESOURCE_TYPES, type ResourceBundle } from '@arborisis/shared';
import { formatNumber, resourceLabel } from '@/lib/format';
import { RESOURCE_VISUALS } from '@/lib/resourceVisuals';

/**
 * Affiche un coût en ressources. Chaque ressource a une icône **et** une couleur
 * propres (cf. {@link RESOURCE_VISUALS}). Si `have` est fourni, toute ressource
 * dont le solde ne couvre pas le coût est mise en rouge : le joueur voit
 * immédiatement *quelle* ressource lui manque.
 */
export function ResourceCost({ cost, have }: { cost: ResourceBundle; have?: ResourceBundle }) {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1">
      {RESOURCE_TYPES.filter((resource) => (cost[resource] ?? 0) > 0).map((resource) => {
        const { Icon, className } = RESOURCE_VISUALS[resource];
        const amount = cost[resource] ?? 0;
        const insufficient = have !== undefined && (have[resource] ?? 0) < amount;
        return (
          <span
            key={resource}
            className={`inline-flex items-center gap-1.5 whitespace-nowrap text-xs ${
              insufficient ? 'text-red-400' : 'text-canopy-100/58'
            }`}
            title={resourceLabel(resource)}
          >
            <Icon
              className={`h-3.5 w-3.5 ${insufficient ? 'text-red-400/80' : className}`}
              aria-hidden="true"
            />
            {formatNumber(amount)}
          </span>
        );
      })}
    </div>
  );
}
