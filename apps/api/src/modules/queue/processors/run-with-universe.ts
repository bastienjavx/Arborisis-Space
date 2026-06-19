import { PrismaService } from '../../../common/prisma/prisma.service';
import { getDefaultUniverseId } from '../../../common/prisma/default-universe.helper';
import { universeContext } from '../../universe/universe-context';

/**
 * Exécute une logique de processor à l'intérieur du contexte d'univers
 * (AsyncLocalStorage). Le `universeId` est lu depuis les données du job ;
 * s'il est absent ou invalide, l'univers par défaut est utilisé.
 */
export async function runWithUniverse<T>(
  prisma: PrismaService,
  universeId: unknown,
  fn: () => Promise<T>,
): Promise<T> {
  const resolved =
    typeof universeId === 'string' && universeId.length > 0
      ? universeId
      : await getDefaultUniverseId(prisma);
  return universeContext.run({ universeId: resolved }, fn);
}
