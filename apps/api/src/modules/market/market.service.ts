import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  CRAFTING_RECIPES,
  ITEMS,
  ItemKey,
  MarketOrderSide,
  MarketOrderStatus,
  type MarketOrderView,
  type MarketSummaryView,
  type MarketTradeView,
  type OhlcvCandleView,
  type OrderBookView,
  type PlaceMarketOrderDto,
} from '@arborisis/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { GameEngineService } from '../game/game-engine.service';
import { PlanetsService } from '../game/planets.service';
import { MARKET_EXPIRY_QUEUE, EXPIRE_MARKET_ORDER_JOB } from '../queue/queue.constants';

// Re-export for convenience
export { CRAFTING_RECIPES, ITEMS };

const ORDER_EXPIRY_DAYS = 7;

@Injectable()
export class MarketService {
  private readonly logger = new Logger(MarketService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly engine: GameEngineService,
    private readonly planets: PlanetsService,
    @InjectQueue(MARKET_EXPIRY_QUEUE) private readonly expiryQueue: Queue,
  ) {}

  async getMarketSummaries(universeId: string): Promise<MarketSummaryView[]> {
    const results: MarketSummaryView[] = [];

    for (const key of Object.values(ItemKey)) {
      const now = new Date();
      const dayAgo = new Date(now.getTime() - 86_400_000);

      const [bestBidRow, bestAskRow, lastTrade, trades24h] = await Promise.all([
        this.prisma.marketOrder.findFirst({
          where: {
            universeId,
            itemKey: key,
            side: MarketOrderSide.BUY,
            status: { in: [MarketOrderStatus.OPEN, MarketOrderStatus.PARTIALLY_FILLED] },
          },
          orderBy: { pricePerUnit: 'desc' },
        }),
        this.prisma.marketOrder.findFirst({
          where: {
            universeId,
            itemKey: key,
            side: MarketOrderSide.SELL,
            status: { in: [MarketOrderStatus.OPEN, MarketOrderStatus.PARTIALLY_FILLED] },
          },
          orderBy: { pricePerUnit: 'asc' },
        }),
        this.prisma.marketTrade.findFirst({
          where: { universeId, itemKey: key },
          orderBy: { executedAt: 'desc' },
        }),
        this.prisma.marketTrade.findMany({
          where: { universeId, itemKey: key, executedAt: { gte: dayAgo } },
          select: { price: true, quantity: true },
        }),
      ]);

      const volume24h = trades24h.reduce((sum, t) => sum + t.quantity, 0);
      const change24h = await this.compute24hChange(universeId, key);

      results.push({
        itemKey: key as ItemKey,
        lastPrice: lastTrade?.price ?? null,
        change24h,
        volume24h,
        bestBid: bestBidRow?.pricePerUnit ?? null,
        bestAsk: bestAskRow?.pricePerUnit ?? null,
      });
    }

    return results;
  }

  async getOrderBook(universeId: string, itemKey: ItemKey): Promise<OrderBookView> {
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 86_400_000);

    const [buyOrders, sellOrders, lastTrade, trades24h] = await Promise.all([
      this.prisma.marketOrder.findMany({
        where: {
          universeId,
          itemKey,
          side: MarketOrderSide.BUY,
          status: { in: [MarketOrderStatus.OPEN, MarketOrderStatus.PARTIALLY_FILLED] },
        },
        orderBy: { pricePerUnit: 'desc' },
        take: 20,
      }),
      this.prisma.marketOrder.findMany({
        where: {
          universeId,
          itemKey,
          side: MarketOrderSide.SELL,
          status: { in: [MarketOrderStatus.OPEN, MarketOrderStatus.PARTIALLY_FILLED] },
        },
        orderBy: { pricePerUnit: 'asc' },
        take: 20,
      }),
      this.prisma.marketTrade.findFirst({
        where: { universeId, itemKey },
        orderBy: { executedAt: 'desc' },
      }),
      this.prisma.marketTrade.findMany({
        where: { universeId, itemKey, executedAt: { gte: dayAgo } },
        select: { price: true, quantity: true },
      }),
    ]);

    const aggregateSide = (orders: typeof buyOrders) => {
      const map = new Map<number, number>();
      for (const o of orders) {
        const remaining = o.quantity - o.filledQuantity;
        map.set(o.pricePerUnit, (map.get(o.pricePerUnit) ?? 0) + remaining);
      }
      return [...map.entries()].map(([price, quantity]) => ({ price, quantity, total: 0 }));
    };

    const bids = aggregateSide(buyOrders);
    const asks = aggregateSide(sellOrders);

    // Cumulative totals
    let cum = 0;
    for (const b of bids) { cum += b.quantity; b.total = cum; }
    cum = 0;
    for (const a of asks) { cum += a.quantity; a.total = cum; }

    const volume24h = trades24h.reduce((sum, t) => sum + t.quantity, 0);
    const prices24h = trades24h.map((t) => t.price);
    const change24h = await this.compute24hChange(universeId, itemKey);

    return {
      bids,
      asks,
      lastPrice: lastTrade?.price ?? null,
      change24h,
      volume24h,
      high24h: prices24h.length ? Math.max(...prices24h) : null,
      low24h: prices24h.length ? Math.min(...prices24h) : null,
    };
  }

  async getCandles(
    universeId: string,
    itemKey: ItemKey,
    interval: '1h' | '4h' | '1d',
    limit = 200,
  ): Promise<OhlcvCandleView[]> {
    const candles = await this.prisma.ohlcvCandle.findMany({
      where: { universeId, itemKey, interval },
      orderBy: { openTime: 'asc' },
      take: limit,
    });
    return candles.map((c) => ({
      openTime: c.openTime.toISOString(),
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      volume: c.volume,
    }));
  }

  async getMyOrders(userId: string, universeId: string): Promise<MarketOrderView[]> {
    const orders = await this.prisma.marketOrder.findMany({
      where: { userId, universeId },
      include: { user: { select: { username: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return orders.map((o) => this.toOrderView(o, userId));
  }

  async getOrdersForItem(
    universeId: string,
    itemKey: ItemKey,
    userId: string,
  ): Promise<MarketOrderView[]> {
    const orders = await this.prisma.marketOrder.findMany({
      where: {
        universeId,
        itemKey,
        status: { in: [MarketOrderStatus.OPEN, MarketOrderStatus.PARTIALLY_FILLED] },
      },
      include: { user: { select: { username: true } } },
      orderBy: [{ side: 'asc' }, { pricePerUnit: 'asc' }],
      take: 100,
    });
    return orders.map((o) => this.toOrderView(o, userId));
  }

  async getMyTrades(userId: string, universeId: string): Promise<MarketTradeView[]> {
    const trades = await this.prisma.marketTrade.findMany({
      where: { universeId, OR: [{ buyerId: userId }, { sellerId: userId }] },
      orderBy: { executedAt: 'desc' },
      take: 200,
    });
    return trades.map((t) => ({
      id: t.id,
      itemKey: t.itemKey as ItemKey,
      price: t.price,
      quantity: t.quantity,
      executedAt: t.executedAt.toISOString(),
      isBuyer: t.buyerId === userId,
      isSeller: t.sellerId === userId,
    }));
  }

  async placeOrder(
    userId: string,
    universeId: string,
    dto: PlaceMarketOrderDto,
  ): Promise<MarketOrderView> {
    const planet = await this.planets.assertOwnership(userId, dto.sourcePlanetId);
    const settled = await this.engine.settlePlanet(planet.id);

    if (dto.side === MarketOrderSide.BUY) {
      const escrow = dto.pricePerUnit * dto.quantity;
      const biomass = settled.planet.biomass;
      if (biomass < escrow) {
        throw new BadRequestException(
          `Biomasse insuffisante. Requise : ${escrow}, disponible : ${Math.floor(biomass)}.`,
        );
      }
      await this.prisma.planet.update({
        where: { id: planet.id },
        data: { biomass: { decrement: escrow }, lastResourceUpdate: settled.planet.lastResourceUpdate },
      });

      const order = await this.prisma.marketOrder.create({
        data: {
          universeId,
          userId,
          itemKey: dto.itemKey,
          side: MarketOrderSide.BUY,
          pricePerUnit: dto.pricePerUnit,
          quantity: dto.quantity,
          escrowBiomass: escrow,
          sourcePlanetId: dto.sourcePlanetId,
          expiresAt: new Date(Date.now() + ORDER_EXPIRY_DAYS * 86_400_000),
        },
        include: { user: { select: { username: true } } },
      });

      await this.scheduleExpiry(order.id, order.expiresAt!);
      await this.tryMatch(universeId, dto.itemKey, order.id);

      const fresh = await this.prisma.marketOrder.findUniqueOrThrow({
        where: { id: order.id },
        include: { user: { select: { username: true } } },
      });
      return this.toOrderView(fresh, userId);
    } else {
      // SELL — vérifier inventaire
      const slot = await this.prisma.playerInventorySlot.findUnique({
        where: { userId_planetId_itemKey: { userId, planetId: dto.sourcePlanetId, itemKey: dto.itemKey } },
      });
      if (!slot || slot.quantity < dto.quantity) {
        throw new BadRequestException(
          `Inventaire insuffisant. Requis : ${dto.quantity}, disponible : ${slot?.quantity ?? 0}.`,
        );
      }

      await this.prisma.playerInventorySlot.update({
        where: { userId_planetId_itemKey: { userId, planetId: dto.sourcePlanetId, itemKey: dto.itemKey } },
        data: { quantity: { decrement: dto.quantity } },
      });

      const order = await this.prisma.marketOrder.create({
        data: {
          universeId,
          userId,
          itemKey: dto.itemKey,
          side: MarketOrderSide.SELL,
          pricePerUnit: dto.pricePerUnit,
          quantity: dto.quantity,
          escrowBiomass: 0,
          sourcePlanetId: dto.sourcePlanetId,
          expiresAt: new Date(Date.now() + ORDER_EXPIRY_DAYS * 86_400_000),
        },
        include: { user: { select: { username: true } } },
      });

      await this.scheduleExpiry(order.id, order.expiresAt!);
      await this.tryMatch(universeId, dto.itemKey, order.id);

      const fresh = await this.prisma.marketOrder.findUniqueOrThrow({
        where: { id: order.id },
        include: { user: { select: { username: true } } },
      });
      return this.toOrderView(fresh, userId);
    }
  }

  async cancelOrder(userId: string, orderId: string): Promise<void> {
    const order = await this.prisma.marketOrder.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Ordre introuvable.');
    if (order.userId !== userId) throw new BadRequestException('Cet ordre ne vous appartient pas.');
    if (
      order.status === MarketOrderStatus.FILLED ||
      order.status === MarketOrderStatus.CANCELLED
    ) {
      throw new BadRequestException('Cet ordre ne peut plus être annulé.');
    }

    await this.prisma.$transaction(async (tx) => {
      if (order.side === MarketOrderSide.BUY && order.escrowBiomass > 0) {
        const remaining = order.quantity - order.filledQuantity;
        const refund = remaining * order.pricePerUnit;
        await tx.planet.update({
          where: { id: order.sourcePlanetId },
          data: { biomass: { increment: refund } },
        });
      } else if (order.side === MarketOrderSide.SELL) {
        const remaining = order.quantity - order.filledQuantity;
        if (remaining > 0) {
          await tx.playerInventorySlot.upsert({
            where: {
              userId_planetId_itemKey: {
                userId,
                planetId: order.sourcePlanetId,
                itemKey: order.itemKey,
              },
            },
            update: { quantity: { increment: remaining } },
            create: {
              userId,
              planetId: order.sourcePlanetId,
              itemKey: order.itemKey,
              quantity: remaining,
            },
          });
        }
      }

      await tx.marketOrder.update({
        where: { id: orderId },
        data: { status: MarketOrderStatus.CANCELLED },
      });
    });
  }

  /** Moteur de matching : tente d'exécuter l'ordre contre le carnet existant. */
  private async tryMatch(
    universeId: string,
    itemKey: string,
    newOrderId: string,
  ): Promise<void> {
    const order = await this.prisma.marketOrder.findUnique({ where: { id: newOrderId } });
    if (!order || order.status === MarketOrderStatus.FILLED || order.status === MarketOrderStatus.CANCELLED) return;

    while (true) {
      const fresh = await this.prisma.marketOrder.findUnique({ where: { id: newOrderId } });
      if (!fresh) break;
      const remaining = fresh.quantity - fresh.filledQuantity;
      if (remaining <= 0) break;

      // Chercher le meilleur ordre opposé
      const opposing =
        fresh.side === MarketOrderSide.BUY
          ? await this.prisma.marketOrder.findFirst({
              where: {
                universeId,
                itemKey,
                side: MarketOrderSide.SELL,
                status: { in: [MarketOrderStatus.OPEN, MarketOrderStatus.PARTIALLY_FILLED] },
                pricePerUnit: { lte: fresh.pricePerUnit },
                userId: { not: fresh.userId },
              },
              orderBy: { pricePerUnit: 'asc' },
            })
          : await this.prisma.marketOrder.findFirst({
              where: {
                universeId,
                itemKey,
                side: MarketOrderSide.BUY,
                status: { in: [MarketOrderStatus.OPEN, MarketOrderStatus.PARTIALLY_FILLED] },
                pricePerUnit: { gte: fresh.pricePerUnit },
                userId: { not: fresh.userId },
              },
              orderBy: { pricePerUnit: 'desc' },
            });

      if (!opposing) break;

      const execQty = Math.min(remaining, opposing.quantity - opposing.filledQuantity);
      const execPrice = opposing.pricePerUnit; // maker price

      const buyOrder = fresh.side === MarketOrderSide.BUY ? fresh : opposing;
      const sellOrder = fresh.side === MarketOrderSide.SELL ? fresh : opposing;

      await this.executeTrade({
        universeId,
        itemKey,
        buyOrder,
        sellOrder,
        execQty,
        execPrice,
      });
    }
  }

  private async executeTrade(params: {
    universeId: string;
    itemKey: string;
    buyOrder: { id: string; userId: string; quantity: number; filledQuantity: number; pricePerUnit: number; sourcePlanetId: string };
    sellOrder: { id: string; userId: string; quantity: number; filledQuantity: number; sourcePlanetId: string };
    execQty: number;
    execPrice: number;
  }): Promise<void> {
    const { universeId, itemKey, buyOrder, sellOrder, execQty, execPrice } = params;

    await this.prisma.serializable(async (tx) => {
      // Vérifier à nouveau les quantités restantes
      const [freshBuy, freshSell] = await Promise.all([
        tx.marketOrder.findUniqueOrThrow({ where: { id: buyOrder.id } }),
        tx.marketOrder.findUniqueOrThrow({ where: { id: sellOrder.id } }),
      ]);

      const buyRemaining = freshBuy.quantity - freshBuy.filledQuantity;
      const sellRemaining = freshSell.quantity - freshSell.filledQuantity;
      const qty = Math.min(buyRemaining, sellRemaining, execQty);
      if (qty <= 0) return;

      const totalBiomass = qty * execPrice;

      // Acheteur reçoit les objets
      await tx.playerInventorySlot.upsert({
        where: {
          userId_planetId_itemKey: {
            userId: buyOrder.userId,
            planetId: buyOrder.sourcePlanetId,
            itemKey,
          },
        },
        update: { quantity: { increment: qty } },
        create: {
          userId: buyOrder.userId,
          planetId: buyOrder.sourcePlanetId,
          itemKey,
          quantity: qty,
        },
      });

      // Remboursement différentiel si acheteur a payé plus que execPrice
      const overpay = (freshBuy.pricePerUnit - execPrice) * qty;
      if (overpay > 0) {
        await tx.planet.update({
          where: { id: buyOrder.sourcePlanetId },
          data: { biomass: { increment: overpay } },
        });
      }

      // Vendeur reçoit la Biomasse
      await tx.planet.update({
        where: { id: sellOrder.sourcePlanetId },
        data: { biomass: { increment: totalBiomass } },
      });

      const newBuyFilled = freshBuy.filledQuantity + qty;
      const newSellFilled = freshSell.filledQuantity + qty;

      await tx.marketOrder.update({
        where: { id: buyOrder.id },
        data: {
          filledQuantity: newBuyFilled,
          status: newBuyFilled >= freshBuy.quantity ? MarketOrderStatus.FILLED : MarketOrderStatus.PARTIALLY_FILLED,
        },
      });
      await tx.marketOrder.update({
        where: { id: sellOrder.id },
        data: {
          filledQuantity: newSellFilled,
          status: newSellFilled >= freshSell.quantity ? MarketOrderStatus.FILLED : MarketOrderStatus.PARTIALLY_FILLED,
        },
      });

      await tx.marketTrade.create({
        data: {
          universeId,
          itemKey,
          buyOrderId: buyOrder.id,
          sellOrderId: sellOrder.id,
          buyerId: buyOrder.userId,
          sellerId: sellOrder.userId,
          price: execPrice,
          quantity: qty,
          buyerPlanetId: buyOrder.sourcePlanetId,
          sellerPlanetId: sellOrder.sourcePlanetId,
        },
      });

      // Mettre à jour ou créer la bougie OHLCV courante
      await this.updateCandles(tx, universeId, itemKey, execPrice, qty);
    });
  }

  private async updateCandles(
    tx: Parameters<Parameters<PrismaService['serializable']>[0]>[0],
    universeId: string,
    itemKey: string,
    price: number,
    qty: number,
  ): Promise<void> {
    const now = new Date();
    const intervals: { name: string; ms: number }[] = [
      { name: '1h', ms: 3_600_000 },
      { name: '4h', ms: 14_400_000 },
      { name: '1d', ms: 86_400_000 },
    ];

    for (const { name, ms } of intervals) {
      const openTime = new Date(Math.floor(now.getTime() / ms) * ms);
      const existing = await tx.ohlcvCandle.findUnique({
        where: { universeId_itemKey_interval_openTime: { universeId, itemKey, interval: name, openTime } },
      });

      if (existing) {
        await tx.ohlcvCandle.update({
          where: { universeId_itemKey_interval_openTime: { universeId, itemKey, interval: name, openTime } },
          data: {
            high: Math.max(existing.high, price),
            low: Math.min(existing.low, price),
            close: price,
            volume: { increment: qty },
          },
        });
      } else {
        await tx.ohlcvCandle.create({
          data: {
            universeId,
            itemKey,
            interval: name,
            openTime,
            open: price,
            high: price,
            low: price,
            close: price,
            volume: qty,
          },
        });
      }
    }
  }

  private async scheduleExpiry(orderId: string, expiresAt: Date): Promise<void> {
    const delay = Math.max(0, expiresAt.getTime() - Date.now());
    await this.expiryQueue.add(
      EXPIRE_MARKET_ORDER_JOB,
      { orderId },
      { jobId: `expire-${orderId}`, delay, removeOnComplete: true, removeOnFail: 10 },
    );
  }

  async expireOrder(orderId: string): Promise<void> {
    const order = await this.prisma.marketOrder.findUnique({ where: { id: orderId } });
    if (!order) return;
    if (
      order.status === MarketOrderStatus.FILLED ||
      order.status === MarketOrderStatus.CANCELLED
    ) return;
    await this.cancelOrder(order.userId, orderId);
  }

  private async compute24hChange(universeId: string, itemKey: string): Promise<number | null> {
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 86_400_000);
    const twoDaysAgo = new Date(now.getTime() - 2 * 86_400_000);

    const [recent, older] = await Promise.all([
      this.prisma.marketTrade.findFirst({
        where: { universeId, itemKey, executedAt: { gte: dayAgo } },
        orderBy: { executedAt: 'asc' },
      }),
      this.prisma.marketTrade.findFirst({
        where: { universeId, itemKey, executedAt: { gte: twoDaysAgo, lt: dayAgo } },
        orderBy: { executedAt: 'desc' },
      }),
    ]);

    if (!recent || !older) return null;
    return ((recent.price - older.price) / older.price) * 100;
  }

  private toOrderView(
    order: {
      id: string; itemKey: string; side: MarketOrderSide; status: MarketOrderStatus;
      pricePerUnit: number; quantity: number; filledQuantity: number;
      createdAt: Date; expiresAt: Date | null; userId: string;
      user: { username: string };
    },
    currentUserId: string,
  ): MarketOrderView {
    return {
      id: order.id,
      itemKey: order.itemKey as ItemKey,
      side: order.side,
      status: order.status,
      pricePerUnit: order.pricePerUnit,
      quantity: order.quantity,
      filledQuantity: order.filledQuantity,
      createdAt: order.createdAt.toISOString(),
      expiresAt: order.expiresAt?.toISOString() ?? null,
      ownerUsername: order.user.username,
      isOwn: order.userId === currentUserId,
    };
  }
}
