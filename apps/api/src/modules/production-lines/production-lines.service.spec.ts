import { BadRequestException } from '@nestjs/common';
import { PRODUCTION_LINE_RECIPES, ProductionLineStatus, ResourceType } from '@arborisis/shared';
import { ProductionLinesService } from './production-lines.service';

type MockPrisma = {
  productionLine: {
    count: jest.Mock;
    create: jest.Mock;
    findMany: jest.Mock;
    findUnique: jest.Mock;
    update: jest.Mock;
    updateMany: jest.Mock;
  };
  serializable: jest.Mock;
  planet: {
    findUniqueOrThrow: jest.Mock;
    update: jest.Mock;
  };
  playerInventorySlot: {
    upsert: jest.Mock;
  };
};

function makeService(
  overrides: {
    prisma?: Partial<MockPrisma>;
    engine?: Record<string, unknown>;
    planets?: Record<string, unknown>;
    queue?: Record<string, unknown>;
  } = {},
) {
  let prisma: MockPrisma;
  prisma = {
    productionLine: {
      count: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    serializable: jest.fn((work: (tx: MockPrisma) => unknown) => work(prisma)),
    planet: {
      findUniqueOrThrow: jest.fn(),
      update: jest.fn(),
    },
    playerInventorySlot: {
      upsert: jest.fn(),
    },
  };
  prisma = { ...prisma, ...overrides.prisma };
  const engine = { settlePlanet: jest.fn(), ...overrides.engine };
  const planets = { assertOwnership: jest.fn(), ...overrides.planets };
  const queue = { add: jest.fn(), ...overrides.queue };

  return {
    prisma,
    engine,
    planets,
    queue,
    service: new ProductionLinesService(
      prisma as never,
      engine as never,
      planets as never,
      queue as never,
    ),
  };
}

function lineFixture(overrides: Record<string, unknown> = {}) {
  const recipe = PRODUCTION_LINE_RECIPES[0]!;
  return {
    id: 'line-1',
    userId: 'user-1',
    planetId: 'planet-1',
    planet: { name: 'Noyau' },
    recipeId: recipe.id,
    outputKey: recipe.outputKey,
    outputQty: recipe.outputQty,
    cycleSeconds: recipe.cycleSeconds,
    status: ProductionLineStatus.ACTIVE,
    nextRunAt: new Date('2026-06-23T10:00:00.000Z'),
    lastRunAt: null,
    createdAt: new Date('2026-06-23T09:00:00.000Z'),
    ...overrides,
  };
}

describe('ProductionLinesService', () => {
  it('refuse la création si la planète ne possède pas le joueur', async () => {
    const { service, planets, prisma } = makeService({
      planets: {
        assertOwnership: jest.fn().mockRejectedValue(new BadRequestException('nope')),
      },
    });

    await expect(
      service.createLine('user-1', {
        planetId: 'planet-1',
        recipeId: PRODUCTION_LINE_RECIPES[0]!.id,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(planets.assertOwnership).toHaveBeenCalledWith('user-1', 'planet-1');
    expect(prisma.productionLine.create).not.toHaveBeenCalled();
  });

  it('exécute une ligne due en débitant les ressources et créditant l’inventaire', async () => {
    const now = new Date('2026-06-23T10:01:00.000Z');
    const line = lineFixture();
    const recipe = PRODUCTION_LINE_RECIPES[0]!;
    const { service, prisma, engine, queue } = makeService();
    prisma.productionLine.findUnique.mockResolvedValue(line);
    prisma.productionLine.updateMany = jest.fn().mockResolvedValue({ count: 1 });
    prisma.planet.findUniqueOrThrow.mockResolvedValue({
      biomass: 1_000,
      sap: 1_000,
      minerals: 1_000,
      spores: 1_000,
    });

    await service.runLine(line.id, now);

    expect(engine.settlePlanet).toHaveBeenCalledWith(line.planetId);
    expect(prisma.planet.update).toHaveBeenCalledWith({
      where: { id: line.planetId },
      data: expect.objectContaining({
        biomass: { decrement: recipe.inputs[ResourceType.BIOMASS] },
        sap: { decrement: recipe.inputs[ResourceType.SAP] },
      }),
    });
    expect(prisma.playerInventorySlot.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: { quantity: { increment: line.outputQty } },
      }),
    );
    expect(queue.add).toHaveBeenCalledTimes(1);
  });

  it('met la ligne en manque d’intrants quand les ressources sont insuffisantes', async () => {
    const now = new Date('2026-06-23T10:01:00.000Z');
    const line = lineFixture();
    const { service, prisma, queue } = makeService();
    prisma.productionLine.findUnique.mockResolvedValue(line);
    prisma.productionLine.updateMany = jest.fn().mockResolvedValue({ count: 1 });
    prisma.planet.findUniqueOrThrow.mockResolvedValue({
      biomass: 0,
      sap: 0,
      minerals: 0,
      spores: 0,
    });

    await service.runLine(line.id, now);

    expect(prisma.productionLine.update).toHaveBeenCalledWith({
      where: { id: line.id },
      data: { status: ProductionLineStatus.INPUT_SHORTAGE, nextRunAt: null },
    });
    expect(prisma.playerInventorySlot.upsert).not.toHaveBeenCalled();
    expect(queue.add).not.toHaveBeenCalled();
  });

  it('relance une ligne en pause avec une seule planification', async () => {
    const paused = lineFixture({ status: ProductionLineStatus.PAUSED, nextRunAt: null });
    const active = lineFixture({ status: ProductionLineStatus.ACTIVE, nextRunAt: new Date() });
    const { service, prisma, queue } = makeService();
    prisma.productionLine.findUnique.mockResolvedValue(paused);
    prisma.productionLine.update.mockResolvedValue(active);

    await service.updateLine('user-1', paused.id, { status: ProductionLineStatus.ACTIVE });

    expect(prisma.productionLine.update).toHaveBeenCalledTimes(1);
    expect(queue.add).toHaveBeenCalledTimes(1);
  });
});
