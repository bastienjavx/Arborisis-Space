import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ItemKey as PrismaItemKey, OhlcvInterval, Prisma } from '@prisma/client';
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
import { EventsGateway } from '../events/events.gateway';

// Re-export for convenience
export { CRAFTING_RECIPES, ITEMS };

const ORDER_EXPIRY_DAYS = 7;
const ACTIVE_ORDER_STATUSES = [MarketOrderStatus.OPEN, MarketOrderStatus.PARTIALLY_FILLED] as const;
const CANDLE_INTERVALS = {
  '1h': { name: OhlcvInterval.ONE_HOUR, ms: 3_600_000 },
  '4h': { name: OhlcvInterval.FOUR_HOURS, ms: 14_400_000 },
  '1d': { name: OhlcvInterval.ONE_DAY, ms: 86_400_000 },
} as const;

@Injectable()
export class MarketService {
  private readonly logger = new Logger(MarketService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly engine: GameEngineService,
    private readonly planets: PlanetsService,
    @InjectQueue(MARKET_EXPIRY_QUEUE) private readonly expiryQueue: Queue,
    private readonly events: EventsGateway,
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

    const [buyLevels, sellLevels, lastTrade, trades24h] = await Promise.all([
      this.prisma.marketOrder.groupBy({
        by: ['pricePerUnit'],
        where: {
          universeId,
          itemKey,
          side: MarketOrderSide.BUY,
          status: { in: [...ACTIVE_ORDER_STATUSES] },
        },
        _sum: { quantity: true, filledQuantity: true },
        orderBy: { pricePerUnit: 'desc' },
        take: 20,
      }),
      this.prisma.marketOrder.groupBy({
        by: ['pricePerUnit'],
        where: {
          universeId,
          itemKey,
          side: MarketOrderSide.SELL,
          status: { in: [...ACTIVE_ORDER_STATUSES] },
        },
        _sum: { quantity: true, filledQuantity: true },
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

    const toLevels = (levels: typeof buyLevels) =>
      levels
        .map((level) => ({
          price: level.pricePerUnit,
          quantity: (level._sum.quantity ?? 0) - (level._sum.filledQuantity ?? 0),
          total: 0,
        }))
        .filter((level) => level.quantity > 0);

    const bids = toLevels(buyLevels);
    const asks = toLevels(sellLevels);

    // Cumulative totals
    let cum = 0;
    for (const b of bids) {
      cum += b.quantity;
      b.total = cum;
    }
    cum = 0;
    for (const a of asks) {
      cum += a.quantity;
      a.total = cum;
    }

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
      where: { universeId, itemKey, interval: CANDLE_INTERVALS[interval].name },
      orderBy: { openTime: 'desc' },
      take: limit,
    });
    return candles.reverse().map((c) => ({
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
        status: { in: [...ACTIVE_ORDER_STATUSES] },
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
    const expiresAt = new Date(Date.now() + ORDER_EXPIRY_DAYS * 86_400_000);

    if (dto.side === MarketOrderSide.BUY) {
      const escrow = dto.pricePerUnit * dto.quantity;
      const order = await this.prisma.optimistic(async (tx) => {
        const freshPlanet = await tx.planet.findUniqueOrThrow({ where: { id: planet.id } });
        if (freshPlanet.biomass < escrow) {
          throw new BadRequestException(
            `Biomasse insuffisante. Requise : ${escrow}, disponible : ${Math.floor(freshPlanet.biomass)}.`,
          );
        }
        await tx.planet.update({
          where: { id: planet.id, version: freshPlanet.version },
          data: {
            biomass: { decrement: escrow },
            lastResourceUpdate: settled.planet.lastResourceUpdate,
            version: { increment: 1 },
          },
        });

        return tx.marketOrder.create({
          data: {
            universeId,
            userId,
            itemKey: dto.itemKey,
            side: MarketOrderSide.BUY,
            pricePerUnit: dto.pricePerUnit,
            quantity: dto.quantity,
            escrowBiomass: escrow,
            sourcePlanetId: dto.sourcePlanetId,
            expiresAt,
          },
          include: { user: { select: { username: true } } },
        });
      });

      await this.scheduleExpiry(order.id, order.expiresAt!);
      await this.tryMatch(universeId, dto.itemKey, order.id);
      this.events.emitToUser(userId, 'planet:updated', { planetId: dto.sourcePlanetId });

      const fresh = await this.prisma.marketOrder.findUniqueOrThrow({
        where: { id: order.id },
        include: { user: { select: { username: true } } },
      });
      return this.toOrderView(fresh, userId);
    } else {
      const order = await this.prisma.optimistic(async (tx) => {
        const debit = await tx.playerInventorySlot.updateMany({
          where: {
            userId,
            planetId: dto.sourcePlanetId,
            itemKey: dto.itemKey,
            quantity: { gte: dto.quantity },
          },
          data: { quantity: { decrement: dto.quantity } },
        });
        if (debit.count !== 1) {
          const slot = await tx.playerInventorySlot.findUnique({
            where: {
              userId_planetId_itemKey: {
                userId,
                planetId: dto.sourcePlanetId,
                itemKey: dto.itemKey,
              },
            },
          });
          throw new BadRequestException(
            `Inventaire insuffisant. Requis : ${dto.quantity}, disponible : ${slot?.quantity ?? 0}.`,
          );
        }

        return tx.marketOrder.create({
          data: {
            universeId,
            userId,
            itemKey: dto.itemKey,
            side: MarketOrderSide.SELL,
            pricePerUnit: dto.pricePerUnit,
            quantity: dto.quantity,
            escrowBiomass: 0,
            sourcePlanetId: dto.sourcePlanetId,
            expiresAt,
          },
          include: { user: { select: { username: true } } },
        });
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
    await this.prisma.optimistic(async (tx) => {
      const order = await tx.marketOrder.findUnique({ where: { id: orderId } });
      if (!order) throw new NotFoundException('Ordre introuvable.');
      if (order.userId !== userId)
        throw new BadRequestException('Cet ordre ne vous appartient pas.');
      if (!ACTIVE_ORDER_STATUSES.includes(order.status as (typeof ACTIVE_ORDER_STATUSES)[number])) {
        throw new BadRequestException('Cet ordre ne peut plus être annulé.');
      }

      const claimed = await tx.marketOrder.updateMany({
        where: { id: orderId, status: { in: [...ACTIVE_ORDER_STATUSES] } },
        data: { status: MarketOrderStatus.CANCELLED },
      });
      if (claimed.count !== 1) {
        throw new BadRequestException('Cet ordre ne peut plus être annulé.');
      }

      if (order.side === MarketOrderSide.BUY && order.escrowBiomass > 0) {
        const remaining = order.quantity - order.filledQuantity;
        const refund = remaining * order.pricePerUnit;
        const settled = await this.engine.settlePlanet(order.sourcePlanetId, new Date(), tx);
        await tx.planet.update({
          where: { id: order.sourcePlanetId, version: settled.planet.version },
          data: { biomass: { increment: refund }, version: { increment: 1 } },
        });
        this.events.emitToUser(userId, 'planet:updated', { planetId: order.sourcePlanetId });
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
    });
  }

  /** Moteur de matching : tente d'exécuter l'ordre contre le carnet existant. */
  private async tryMatch(universeId: string, itemKey: ItemKey, newOrderId: string): Promise<void> {
    const order = await this.prisma.marketOrder.findUnique({ where: { id: newOrderId } });
    if (
      !order ||
      !ACTIVE_ORDER_STATUSES.includes(order.status as (typeof ACTIVE_ORDER_STATUSES)[number])
    )
      return;

    let fresh = await this.prisma.marketOrder.findUnique({ where: { id: newOrderId } });
    while (
      fresh &&
      ACTIVE_ORDER_STATUSES.includes(fresh.status as (typeof ACTIVE_ORDER_STATUSES)[number]) &&
      fresh.quantity - fresh.filledQuantity > 0
    ) {
      const remaining = fresh.quantity - fresh.filledQuantity;

      // Chercher le meilleur ordre opposé
      const opposing =
        fresh.side === MarketOrderSide.BUY
          ? await this.prisma.marketOrder.findFirst({
              where: {
                universeId,
                itemKey: itemKey as PrismaItemKey,
                side: MarketOrderSide.SELL,
                status: { in: [...ACTIVE_ORDER_STATUSES] },
                pricePerUnit: { lte: fresh.pricePerUnit },
                userId: { not: fresh.userId },
              },
              orderBy: { pricePerUnit: 'asc' },
            })
          : await this.prisma.marketOrder.findFirst({
              where: {
                universeId,
                itemKey: itemKey as PrismaItemKey,
                side: MarketOrderSide.BUY,
                status: { in: [...ACTIVE_ORDER_STATUSES] },
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

      fresh = await this.prisma.marketOrder.findUnique({ where: { id: newOrderId } });
    }
  }

  private async executeTrade(params: {
    universeId: string;
    itemKey: ItemKey;
    buyOrder: {
      id: string;
      userId: string;
      quantity: number;
      filledQuantity: number;
      pricePerUnit: number;
      sourcePlanetId: string;
    };
    sellOrder: {
      id: string;
      userId: string;
      quantity: number;
      filledQuantity: number;
      sourcePlanetId: string;
    };
    execQty: number;
    execPrice: number;
  }): Promise<void> {
    const { universeId, itemKey, buyOrder, sellOrder, execQty, execPrice } = params;

    await this.prisma.optimistic(async (tx) => {
      // Vérifier à nouveau les quantités restantes
      const [freshBuy, freshSell] = await Promise.all([
        tx.marketOrder.findUniqueOrThrow({ where: { id: buyOrder.id } }),
        tx.marketOrder.findUniqueOrThrow({ where: { id: sellOrder.id } }),
      ]);

      if (
        freshBuy.universeId !== universeId ||
        freshSell.universeId !== universeId ||
        freshBuy.itemKey !== itemKey ||
        freshSell.itemKey !== itemKey ||
        freshBuy.side !== MarketOrderSide.BUY ||
        freshSell.side !== MarketOrderSide.SELL ||
        freshBuy.userId === freshSell.userId ||
        !ACTIVE_ORDER_STATUSES.includes(
          freshBuy.status as (typeof ACTIVE_ORDER_STATUSES)[number],
        ) ||
        !ACTIVE_ORDER_STATUSES.includes(
          freshSell.status as (typeof ACTIVE_ORDER_STATUSES)[number],
        ) ||
        freshBuy.pricePerUnit < freshSell.pricePerUnit ||
        freshBuy.pricePerUnit < execPrice ||
        freshSell.pricePerUnit > execPrice
      ) {
        return;
      }

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

      // Récupère les versions des planètes concernées via un settle serveur-authoritative.
      const [buyerPlanet, sellerPlanet] = await Promise.all([
        this.engine.settlePlanet(buyOrder.sourcePlanetId, new Date(), tx),
        this.engine.settlePlanet(sellOrder.sourcePlanetId, new Date(), tx),
      ]);

      // Remboursement différentiel si acheteur a payé plus que execPrice
      const overpay = (freshBuy.pricePerUnit - execPrice) * qty;
      if (overpay > 0) {
        await tx.planet.update({
          where: { id: buyOrder.sourcePlanetId, version: buyerPlanet.planet.version },
          data: { biomass: { increment: overpay }, version: { increment: 1 } },
        });
      }

      // Vendeur reçoit la Biomasse
      await tx.planet.update({
        where: { id: sellOrder.sourcePlanetId, version: sellerPlanet.planet.version },
        data: { biomass: { increment: totalBiomass }, version: { increment: 1 } },
      });

      const newBuyFilled = freshBuy.filledQuantity + qty;
      const newSellFilled = freshSell.filledQuantity + qty;

      await tx.marketOrder.update({
        where: { id: buyOrder.id },
        data: {
          filledQuantity: newBuyFilled,
          status:
            newBuyFilled >= freshBuy.quantity
              ? MarketOrderStatus.FILLED
              : MarketOrderStatus.PARTIALLY_FILLED,
        },
      });
      await tx.marketOrder.update({
        where: { id: sellOrder.id },
        data: {
          filledQuantity: newSellFilled,
          status:
            newSellFilled >= freshSell.quantity
              ? MarketOrderStatus.FILLED
              : MarketOrderStatus.PARTIALLY_FILLED,
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
      this.events.emitToUser(buyOrder.userId, 'planet:updated', {
        planetId: buyOrder.sourcePlanetId,
      });
      this.events.emitToUser(sellOrder.userId, 'planet:updated', {
        planetId: sellOrder.sourcePlanetId,
      });
    });
  }

  private async updateCandles(
    tx: Prisma.TransactionClient,
    universeId: string,
    itemKey: ItemKey,
    price: number,
    qty: number,
  ): Promise<void> {
    const now = new Date();
    const intervals = Object.values(CANDLE_INTERVALS);

    for (const { name, ms } of intervals) {
      const openTime = new Date(Math.floor(now.getTime() / ms) * ms);
      await tx.ohlcvCandle.upsert({
        where: {
          universeId_itemKey_interval_openTime: {
            universeId,
            itemKey: itemKey as PrismaItemKey,
            interval: name,
            openTime,
          },
        },
        create: {
          universeId,
          itemKey: itemKey as PrismaItemKey,
          interval: name,
          openTime,
          open: price,
          high: price,
          low: price,
          close: price,
          volume: qty,
        },
        update: {
          close: price,
          volume: { increment: qty },
        },
      });
      await tx.ohlcvCandle.updateMany({
        where: {
          universeId,
          itemKey: itemKey as PrismaItemKey,
          interval: name,
          openTime,
          high: { lt: price },
        },
        data: { high: price },
      });
      await tx.ohlcvCandle.updateMany({
        where: {
          universeId,
          itemKey: itemKey as PrismaItemKey,
          interval: name,
          openTime,
          low: { gt: price },
        },
        data: { low: price },
      });
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
    if (order.status === MarketOrderStatus.FILLED || order.status === MarketOrderStatus.CANCELLED)
      return;
    await this.cancelOrder(order.userId, orderId);
  }

  async sweepExpiredOrders(now = new Date()): Promise<void> {
    const expired = await this.prisma.marketOrder.findMany({
      where: {
        status: { in: [...ACTIVE_ORDER_STATUSES] },
        expiresAt: { lte: now },
      },
      select: { id: true, userId: true },
    });
    for (const order of expired) {
      await this.cancelOrder(order.userId, order.id).catch((err) =>
        this.logger.error(err, `Échec expiration ordre ${order.id}.`),
      );
    }
    if (expired.length) this.logger.log(`Marché : ${expired.length} ordre(s) expiré(s).`);
  }

  private async compute24hChange(universeId: string, itemKey: string): Promise<number | null> {
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 86_400_000);
    const twoDaysAgo = new Date(now.getTime() - 2 * 86_400_000);

    const [latest, older] = await Promise.all([
      this.prisma.marketTrade.findFirst({
        where: { universeId, itemKey: itemKey as PrismaItemKey },
        orderBy: { executedAt: 'desc' },
      }),
      this.prisma.marketTrade.findFirst({
        where: {
          universeId,
          itemKey: itemKey as PrismaItemKey,
          executedAt: { lt: dayAgo, gte: twoDaysAgo },
        },
        orderBy: { executedAt: 'desc' },
      }),
    ]);

    if (!latest || !older) return null;
    return ((latest.price - older.price) / older.price) * 100;
  }

  private toOrderView(
    order: {
      id: string;
      itemKey: string;
      side: string;
      status: string;
      pricePerUnit: number;
      quantity: number;
      filledQuantity: number;
      createdAt: Date;
      expiresAt: Date | null;
      userId: string;
      user: { username: string };
    },
    currentUserId: string,
  ): MarketOrderView {
    return {
      id: order.id,
      itemKey: order.itemKey as ItemKey,
      side: order.side as MarketOrderSide,
      status: order.status as MarketOrderStatus,
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
