import { Injectable } from '@nestjs/common';
import { type InventorySlotView, type ItemDropView, ItemKey } from '@arborisis/shared';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  async getUserInventory(userId: string): Promise<InventorySlotView[]> {
    const slots = await this.prisma.playerInventorySlot.findMany({
      where: { userId, quantity: { gt: 0 } },
      include: { planet: { select: { name: true } } },
      orderBy: [{ planetId: 'asc' }, { itemKey: 'asc' }],
    });

    return slots.map((s) => ({
      itemKey: s.itemKey as ItemKey,
      quantity: s.quantity,
      planetId: s.planetId,
      planetName: s.planet.name,
    }));
  }

  async getPlanetInventory(userId: string, planetId: string): Promise<InventorySlotView[]> {
    const slots = await this.prisma.playerInventorySlot.findMany({
      where: { userId, planetId, quantity: { gt: 0 } },
      include: { planet: { select: { name: true } } },
      orderBy: { itemKey: 'asc' },
    });

    return slots.map((s) => ({
      itemKey: s.itemKey as ItemKey,
      quantity: s.quantity,
      planetId: s.planetId,
      planetName: s.planet.name,
    }));
  }

  /** Crédite des objets dans l'inventaire d'un joueur (utilisé par la finalisation PvE/expédition). */
  async creditItems(
    tx: Parameters<Parameters<PrismaService['$transaction']>[0]>[0],
    userId: string,
    planetId: string,
    drops: ItemDropView[],
  ): Promise<void> {
    for (const drop of drops) {
      if (drop.quantity <= 0) continue;
      await tx.playerInventorySlot.upsert({
        where: {
          userId_planetId_itemKey: { userId, planetId, itemKey: drop.itemKey },
        },
        update: { quantity: { increment: drop.quantity } },
        create: { userId, planetId, itemKey: drop.itemKey, quantity: drop.quantity },
      });
    }
  }
}
