import { getActiveUniverseId } from './universe-scope.storage';

export const SCOPED_MODELS = new Set<string>([
  'User',
  'Session',
  'Planet',
  'PlanetShip',
  'ShipProductionJob',
  'ExpeditionMission',
  'ExpeditionReport',
  'PlanetBuilding',
  'ResearchLevel',
  'ConstructionJob',
  'ResearchJob',
  'GalacticEvent',
  'PlayerAchievement',
  'ColonizationJob',
  'Alliance',
  'AllianceMember',
  'AllianceApplication',
  'NpcEncounter',
  'PveMission',
  'PvpMission',
  'ResourceTransferMission',
]);

const WHERE_OPERATIONS = new Set<string>([
  'findFirst',
  'findMany',
  'count',
  'aggregate',
  'groupBy',
  'updateMany',
  'deleteMany',
]);

const DATA_OPERATIONS = new Set<string>(['create', 'createMany']);

export function applyUniverseScope(
  model: string,
  operation: string,
  args: unknown,
): Record<string, unknown> {
  if (!SCOPED_MODELS.has(model)) return (args as Record<string, unknown> | undefined) ?? {};

  const universeId = getActiveUniverseId();
  if (!universeId) return (args as Record<string, unknown> | undefined) ?? {};

  const safeArgs = (args as Record<string, unknown> | undefined) ?? {};

  if (WHERE_OPERATIONS.has(operation)) {
    return {
      ...safeArgs,
      where: { ...((safeArgs.where as Record<string, unknown> | undefined) ?? {}), universeId },
    };
  }

  if (DATA_OPERATIONS.has(operation)) {
    if (operation === 'createMany') {
      const data = (safeArgs.data as Record<string, unknown>[] | undefined) ?? [];
      return { ...safeArgs, data: data.map((item) => ({ ...item, universeId })) };
    }

    const data = (safeArgs.data as Record<string, unknown> | undefined) ?? {};
    return { ...safeArgs, data: { ...data, universeId } };
  }

  return safeArgs;
}
