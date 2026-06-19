import { PrismaService } from '../../../common/prisma/prisma.service';
import { getDefaultUniverseId } from '../../../common/prisma/default-universe.helper';
import { universeContext } from '../../universe/universe-context';
import { runWithUniverse } from './run-with-universe';

jest.mock('../../../common/prisma/default-universe.helper');

describe('runWithUniverse', () => {
  const prisma = {} as PrismaService;

  beforeEach(() => {
    jest.resetAllMocks();
    (getDefaultUniverseId as jest.Mock).mockResolvedValue('default-univ');
  });

  it('utilise universeId présent dans les données du job', async () => {
    const fn = jest.fn(async () => getCurrentUniverseId());

    const result = await runWithUniverse(prisma, 'job-univ', fn);

    expect(result).toBe('job-univ');
    expect(fn).toHaveBeenCalledTimes(1);
    expect(getDefaultUniverseId).not.toHaveBeenCalled();
  });

  it("utilise l'univers par défaut si universeId est absent", async () => {
    const fn = jest.fn(async () => getCurrentUniverseId());

    const result = await runWithUniverse(prisma, undefined, fn);

    expect(result).toBe('default-univ');
    expect(getDefaultUniverseId).toHaveBeenCalledWith(prisma);
  });

  it("utilise l'univers par défaut si universeId est une chaîne vide", async () => {
    const fn = jest.fn(async () => getCurrentUniverseId());

    const result = await runWithUniverse(prisma, '', fn);

    expect(result).toBe('default-univ');
    expect(getDefaultUniverseId).toHaveBeenCalledWith(prisma);
  });

  it('restaure le contexte après exécution', async () => {
    await universeContext.run({ universeId: 'outer' }, async () => {
      expect(getCurrentUniverseId()).toBe('outer');
      await runWithUniverse(prisma, 'inner', async () => {
        expect(getCurrentUniverseId()).toBe('inner');
      });
      expect(getCurrentUniverseId()).toBe('outer');
    });
  });
});

function getCurrentUniverseId(): string | undefined {
  return universeContext.getStore()?.universeId;
}
