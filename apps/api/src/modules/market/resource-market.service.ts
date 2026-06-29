import { randomUUID } from 'node:crypto';
import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { OhlcvInterval, Prisma } from '@prisma/client';
import {
  MarketOrderSide,
  MarketOrderStatus,
  RESOURCE_MARKET_CONFIG,
  ResourceType,
  type ExchangeResourcesDto,
  type OhlcvCandleView,
  type OrderBookView,
  type PlaceResourceMarketOrderDto,
  type ResourceExchangeTradeView,
  type ResourceMarketOrderView,
  type ResourceMarketSummaryView,
  type ResourceMarketTradeView,
  type ResourceQuoteDto,
  type ResourceQuoteView,
} from '@arborisis/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { GameEngineService } from '../game/game-engine.service';
import { PlanetsService } from '../game/planets.service';
import { EventsGateway } from '../events/events.gateway';

const ACTIVE_ORDER_STATUSES = [MarketOrderStatus.OPEN, MarketOrderStatus.PARTIALLY_FILLED] as const;
const CANDLE_INTERVALS = {
  '1h': { name: OhlcvInterval.ONE_HOUR, ms: 3_600_000 },
  '4h': { name: OhlcvInterval.FOUR_HOURS, ms: 14_400_000 },
  '1d': { name: OhlcvInterval.ONE_DAY, ms: 86_400_000 },
} as const;

@Injectable()
export class ResourceMarketService {
  private readonly logger = new Logger(ResourceMarketService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly engine: GameEngineService,
    private readonly planets: PlanetsService,
    private readonly events: EventsGateway,
  ) {}

  async getSummaries(universeId: string): Promise<ResourceMarketSummaryView[]> {
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 86_400_000);

    return Promise.all(
      RESOURCE_MARKET_CONFIG.tradableResources.map(async (resource) => {
        const [book, lastTrade, trades24h, fairPrice, change24h] = await Promise.all([
          this.bestBook(universeId, resource),
          this.prisma.resourceMarketTrade.findFirst({
            where: { universeId, resource },
            orderBy: { executedAt: 'desc' },
          }),
          this.prisma.resourceMarketTrade.findMany({
            where: { universeId, resource, executedAt: { gte: dayAgo } },
            select: { quantity: true },
          }),
          this.fairPrice(universeId, resource),
          this.compute24hChange(universeId, resource),
        ]);
        return {
          resource,
          lastPrice: lastTrade?.price ?? null,
          fairPrice,
          change24h,
          volume24h: trades24h.reduce((sum, trade) => sum + trade.quantity, 0),
          bestBid: book.bestBid,
          bestAsk: book.bestAsk,
        };
      }),
    );
  }

  async getQuote(universeId: string, dto: ResourceQuoteDto): Promise<ResourceQuoteView> {
    const [fromPrice, toPrice, spread] = await Promise.all([
      this.fairPrice(universeId, dto.fromResource),
      this.fairPrice(universeId, dto.toResource),
      this.spread(universeId, dto.fromResource, dto.toResource),
    ]);
    const unitRate = (fromPrice / toPrice) * (1 - spread);
    return {
      fromResource: dto.fromResource,
      toResource: dto.toResource,
      amountIn: dto.amount,
      amountOut: Math.max(0, Math.floor(dto.amount * unitRate)),
      unitRate,
      spread,
      dynamicPriceFromBiomass: fromPrice,
      dynamicPriceToBiomass: toPrice,
    };
  }

  async exchange(
    userId: string,
    universeId: string,
    dto: ExchangeResourcesDto,
  ): Promise<ResourceExchangeTradeView> {
    const planet = await this.planets.assertOwnership(userId, dto.sourcePlanetId);
    const quote = await this.getQuote(universeId, dto);
    if (quote.amountOut <= 0) throw new BadRequestException('Montant reçu nul.');

    const trade = await this.prisma.optimistic(async (tx) => {
      const settled = await this.engine.settlePlanet(planet.id, new Date(), tx);
      const available = this.resourceAmount(settled.planet, dto.fromResource);
      if (available < dto.amount) {
        throw new BadRequestException(
          `${this.resourceName(dto.fromResource)} insuffisante. Requise : ${dto.amount}, disponible : ${Math.floor(available)}.`,
        );
      }
      await tx.planet.update({
        where: { id: planet.id, version: settled.planet.version },
        data: {
          ...this.resourceDelta(dto.fromResource, -dto.amount),
          ...this.resourceDelta(dto.toResource, quote.amountOut),
          version: { increment: 1 },
        },
      });
      return tx.resourceExchangeTrade.create({
        data: {
          universeId,
          userId,
          planetId: planet.id,
          fromResource: dto.fromResource,
          toResource: dto.toResource,
          amountIn: dto.amount,
          amountOut: quote.amountOut,
          unitRate: quote.unitRate,
          spread: quote.spread,
        },
      });
    });

    this.events.emitToUser(userId, 'planet:updated', { planetId: planet.id });
    return {
      id: trade.id,
      fromResource: trade.fromResource as ResourceType,
      toResource: trade.toResource as ResourceType,
      amountIn: trade.amountIn,
      amountOut: trade.amountOut,
      unitRate: trade.unitRate,
      spread: trade.spread,
      executedAt: trade.executedAt.toISOString(),
    };
  }

  async getOrderBook(universeId: string, resource: ResourceType): Promise<OrderBookView> {
    this.assertTradable(resource);
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 86_400_000);

    const [buyLevels, sellLevels, lastTrade, trades24h] = await Promise.all([
      this.prisma.resourceMarketOrder.groupBy({
        by: ['pricePerUnit'],
        where: {
          universeId,
          resource,
          side: MarketOrderSide.BUY,
          status: { in: [...ACTIVE_ORDER_STATUSES] },
        },
        _sum: { quantity: true, filledQuantity: true },
        orderBy: { pricePerUnit: 'desc' },
        take: 20,
      }),
      this.prisma.resourceMarketOrder.groupBy({
        by: ['pricePerUnit'],
        where: {
          universeId,
          resource,
          side: MarketOrderSide.SELL,
          status: { in: [...ACTIVE_ORDER_STATUSES] },
        },
        _sum: { quantity: true, filledQuantity: true },
        orderBy: { pricePerUnit: 'asc' },
        take: 20,
      }),
      this.prisma.resourceMarketTrade.findFirst({
        where: { universeId, resource },
        orderBy: { executedAt: 'desc' },
      }),
      this.prisma.resourceMarketTrade.findMany({
        where: { universeId, resource, executedAt: { gte: dayAgo } },
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
    let cum = 0;
    for (const bid of bids) {
      cum += bid.quantity;
      bid.total = cum;
    }
    cum = 0;
    for (const ask of asks) {
      cum += ask.quantity;
      ask.total = cum;
    }

    const prices24h = trades24h.map((trade) => trade.price);
    return {
      bids,
      asks,
      lastPrice: lastTrade?.price ?? null,
      change24h: await this.compute24hChange(universeId, resource),
      volume24h: trades24h.reduce((sum, trade) => sum + trade.quantity, 0),
      high24h: prices24h.length ? Math.max(...prices24h) : null,
      low24h: prices24h.length ? Math.min(...prices24h) : null,
    };
  }

  async getCandles(
    universeId: string,
    resource: ResourceType,
    interval: '1h' | '4h' | '1d',
    limit = 200,
  ): Promise<OhlcvCandleView[]> {
    this.assertTradable(resource);
    const candles = await this.prisma.resourceOhlcvCandle.findMany({
      where: { universeId, resource, interval: CANDLE_INTERVALS[interval].name },
      orderBy: { openTime: 'desc' },
      take: limit,
    });
    return candles.reverse().map((candle) => ({
      openTime: candle.openTime.toISOString(),
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
      volume: candle.volume,
    }));
  }

  async getMyOrders(userId: string, universeId: string): Promise<ResourceMarketOrderView[]> {
    const orders = await this.prisma.resourceMarketOrder.findMany({
      where: { userId, universeId },
      include: { user: { select: { username: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return orders.map((order) => this.toOrderView(order, userId));
  }

  async getMyTrades(userId: string, universeId: string): Promise<ResourceMarketTradeView[]> {
    const trades = await this.prisma.resourceMarketTrade.findMany({
      where: { universeId, OR: [{ buyerId: userId }, { sellerId: userId }] },
      orderBy: { executedAt: 'desc' },
      take: 200,
    });
    return trades.map((trade) => ({
      id: trade.id,
      resource: trade.resource as ResourceType,
      price: trade.price,
      quantity: trade.quantity,
      executedAt: trade.executedAt.toISOString(),
      isBuyer: trade.buyerId === userId,
      isSeller: trade.sellerId === userId,
    }));
  }

  async placeOrder(
    userId: string,
    universeId: string,
    dto: PlaceResourceMarketOrderDto,
  ): Promise<ResourceMarketOrderView> {
    this.assertTradable(dto.resource);
    const planet = await this.planets.assertOwnership(userId, dto.sourcePlanetId);
    const expiresAt = new Date(Date.now() + RESOURCE_MARKET_CONFIG.orderExpiryDays * 86_400_000);

    const order = await this.prisma.optimistic(async (tx) => {
      const settled = await this.engine.settlePlanet(planet.id, new Date(), tx);
      if (dto.side === MarketOrderSide.BUY) {
        const escrow = dto.pricePerUnit * dto.quantity;
        if (settled.planet.biomass < escrow) {
          throw new BadRequestException(
            `Biomasse insuffisante. Requise : ${escrow}, disponible : ${Math.floor(settled.planet.biomass)}.`,
          );
        }
        await tx.planet.update({
          where: { id: planet.id, version: settled.planet.version },
          data: { biomass: { decrement: escrow }, version: { increment: 1 } },
        });
        return tx.resourceMarketOrder.create({
          data: {
            universeId,
            userId,
            resource: dto.resource,
            side: MarketOrderSide.BUY,
            pricePerUnit: dto.pricePerUnit,
            quantity: dto.quantity,
            escrowBiomass: escrow,
            sourcePlanetId: dto.sourcePlanetId,
            expiresAt,
          },
          include: { user: { select: { username: true } } },
        });
      }

      const available = this.resourceAmount(settled.planet, dto.resource);
      if (available < dto.quantity) {
        throw new BadRequestException(
          `${this.resourceName(dto.resource)} insuffisante. Requise : ${dto.quantity}, disponible : ${Math.floor(available)}.`,
        );
      }
      await tx.planet.update({
        where: { id: planet.id, version: settled.planet.version },
        data: { ...this.resourceDelta(dto.resource, -dto.quantity), version: { increment: 1 } },
      });
      return tx.resourceMarketOrder.create({
        data: {
          universeId,
          userId,
          resource: dto.resource,
          side: MarketOrderSide.SELL,
          pricePerUnit: dto.pricePerUnit,
          quantity: dto.quantity,
          sourcePlanetId: dto.sourcePlanetId,
          expiresAt,
        },
        include: { user: { select: { username: true } } },
      });
    });

    await this.tryMatch(universeId, dto.resource, order.id);
    this.events.emitToUser(userId, 'planet:updated', { planetId: dto.sourcePlanetId });
    const fresh = await this.prisma.resourceMarketOrder.findUniqueOrThrow({
      where: { id: order.id },
      include: { user: { select: { username: true } } },
    });
    return this.toOrderView(fresh, userId);
  }

  async cancelOrder(userId: string, orderId: string): Promise<void> {
    await this.prisma.optimistic(async (tx) => {
      const order = await tx.resourceMarketOrder.findUnique({ where: { id: orderId } });
      if (!order) throw new NotFoundException('Ordre introuvable.');
      if (order.userId !== userId) {
        throw new BadRequestException('Cet ordre ne vous appartient pas.');
      }
      if (!ACTIVE_ORDER_STATUSES.includes(order.status as (typeof ACTIVE_ORDER_STATUSES)[number])) {
        throw new BadRequestException('Cet ordre ne peut plus être annulé.');
      }

      const claimed = await tx.resourceMarketOrder.updateMany({
        where: { id: orderId, status: { in: [...ACTIVE_ORDER_STATUSES] } },
        data: { status: MarketOrderStatus.CANCELLED },
      });
      if (claimed.count !== 1) throw new BadRequestException('Cet ordre ne peut plus être annulé.');

      const remaining = order.quantity - order.filledQuantity;
      if (remaining <= 0) return;

      const settled = await this.engine.settlePlanet(order.sourcePlanetId, new Date(), tx);
      if (order.side === MarketOrderSide.BUY) {
        await tx.planet.update({
          where: { id: order.sourcePlanetId, version: settled.planet.version },
          data: {
            biomass: { increment: remaining * order.pricePerUnit },
            version: { increment: 1 },
          },
        });
      } else {
        await tx.planet.update({
          where: { id: order.sourcePlanetId, version: settled.planet.version },
          data: {
            ...this.resourceDelta(order.resource as ResourceType, remaining),
            version: { increment: 1 },
          },
        });
      }
      this.events.emitToUser(userId, 'planet:updated', { planetId: order.sourcePlanetId });
    });
  }

  async sweepExpiredOrders(now = new Date()): Promise<void> {
    const expired = await this.prisma.resourceMarketOrder.findMany({
      where: { status: { in: [...ACTIVE_ORDER_STATUSES] }, expiresAt: { lte: now } },
      select: { id: true, userId: true },
    });
    for (const order of expired) {
      await this.cancelOrder(order.userId, order.id).catch((error) =>
        this.logger.error(error, `Échec expiration ordre ressource ${order.id}.`),
      );
    }
    if (expired.length)
      this.logger.log(`Marché ressources : ${expired.length} ordre(s) expiré(s).`);
  }

  async fairPrice(universeId: string, resource: ResourceType): Promise<number> {
    if (resource === ResourceType.BIOMASS) return 1;
    this.assertTradable(resource);
    const base = RESOURCE_MARKET_CONFIG.baseValueBiomass[resource];
    const [book, lastTrade] = await Promise.all([
      this.bestBook(universeId, resource),
      this.prisma.resourceMarketTrade.findFirst({
        where: { universeId, resource },
        orderBy: { executedAt: 'desc' },
      }),
    ]);
    const mid =
      book.bestBid != null && book.bestAsk != null
        ? (book.bestBid + book.bestAsk) / 2
        : (book.bestBid ?? book.bestAsk ?? null);
    const observed =
      lastTrade && mid != null
        ? lastTrade.price * 0.55 + mid * 0.45
        : (lastTrade?.price ?? mid ?? base);
    const min = base * RESOURCE_MARKET_CONFIG.minDynamicMultiplier;
    const max = base * RESOURCE_MARKET_CONFIG.maxDynamicMultiplier;
    return Math.max(1, Math.round(Math.min(max, Math.max(min, base * 0.5 + observed * 0.5))));
  }

  private async tryMatch(
    universeId: string,
    resource: ResourceType,
    newOrderId: string,
  ): Promise<void> {
    let order = await this.prisma.resourceMarketOrder.findUnique({ where: { id: newOrderId } });
    if (
      !order ||
      !ACTIVE_ORDER_STATUSES.includes(order.status as (typeof ACTIVE_ORDER_STATUSES)[number])
    )
      return;

    const opposingOrders =
      order.side === MarketOrderSide.BUY
        ? await this.prisma.resourceMarketOrder.findMany({
            where: {
              universeId,
              resource,
              side: MarketOrderSide.SELL,
              status: { in: [...ACTIVE_ORDER_STATUSES] },
              pricePerUnit: { lte: order.pricePerUnit },
              userId: { not: order.userId },
            },
            orderBy: [{ pricePerUnit: 'asc' }, { createdAt: 'asc' }],
          })
        : await this.prisma.resourceMarketOrder.findMany({
            where: {
              universeId,
              resource,
              side: MarketOrderSide.BUY,
              status: { in: [...ACTIVE_ORDER_STATUSES] },
              pricePerUnit: { gte: order.pricePerUnit },
              userId: { not: order.userId },
            },
            orderBy: [{ pricePerUnit: 'desc' }, { createdAt: 'asc' }],
          });

    for (const opposing of opposingOrders) {
      order = await this.prisma.resourceMarketOrder.findUnique({ where: { id: newOrderId } });
      if (
        !order ||
        !ACTIVE_ORDER_STATUSES.includes(order.status as (typeof ACTIVE_ORDER_STATUSES)[number]) ||
        order.quantity - order.filledQuantity <= 0
      ) {
        break;
      }

      const execQty = Math.min(
        order.quantity - order.filledQuantity,
        opposing.quantity - opposing.filledQuantity,
      );
      await this.executeTrade({
        universeId,
        resource,
        buyOrder: order.side === MarketOrderSide.BUY ? order : opposing,
        sellOrder: order.side === MarketOrderSide.SELL ? order : opposing,
        execQty,
        execPrice: opposing.pricePerUnit,
      });
    }
  }

  private async executeTrade(params: {
    universeId: string;
    resource: ResourceType;
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
      pricePerUnit: number;
      sourcePlanetId: string;
    };
    execQty: number;
    execPrice: number;
  }): Promise<void> {
    const { universeId, resource, buyOrder, sellOrder, execQty, execPrice } = params;

    await this.prisma.optimistic(async (tx) => {
      const [freshBuy, freshSell] = await Promise.all([
        tx.resourceMarketOrder.findUniqueOrThrow({ where: { id: buyOrder.id } }),
        tx.resourceMarketOrder.findUniqueOrThrow({ where: { id: sellOrder.id } }),
      ]);

      if (
        freshBuy.universeId !== universeId ||
        freshSell.universeId !== universeId ||
        freshBuy.resource !== resource ||
        freshSell.resource !== resource ||
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

      const qty = Math.min(
        freshBuy.quantity - freshBuy.filledQuantity,
        freshSell.quantity - freshSell.filledQuantity,
        execQty,
      );
      if (qty <= 0) return;

      const [buyerPlanet, sellerPlanet] = await Promise.all([
        this.engine.settlePlanet(buyOrder.sourcePlanetId, new Date(), tx),
        this.engine.settlePlanet(sellOrder.sourcePlanetId, new Date(), tx),
      ]);
      const overpay = (freshBuy.pricePerUnit - execPrice) * qty;

      await tx.planet.update({
        where: { id: buyOrder.sourcePlanetId, version: buyerPlanet.planet.version },
        data: {
          ...this.resourceDelta(resource, qty),
          ...(overpay > 0 ? { biomass: { increment: overpay } } : {}),
          version: { increment: 1 },
        },
      });
      await tx.planet.update({
        where: { id: sellOrder.sourcePlanetId, version: sellerPlanet.planet.version },
        data: { biomass: { increment: qty * execPrice }, version: { increment: 1 } },
      });

      const newBuyFilled = freshBuy.filledQuantity + qty;
      const newSellFilled = freshSell.filledQuantity + qty;
      await tx.resourceMarketOrder.update({
        where: { id: buyOrder.id },
        data: {
          filledQuantity: newBuyFilled,
          status:
            newBuyFilled >= freshBuy.quantity
              ? MarketOrderStatus.FILLED
              : MarketOrderStatus.PARTIALLY_FILLED,
        },
      });
      await tx.resourceMarketOrder.update({
        where: { id: sellOrder.id },
        data: {
          filledQuantity: newSellFilled,
          status:
            newSellFilled >= freshSell.quantity
              ? MarketOrderStatus.FILLED
              : MarketOrderStatus.PARTIALLY_FILLED,
        },
      });
      await tx.resourceMarketTrade.create({
        data: {
          universeId,
          resource,
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
      await this.updateCandles(tx, universeId, resource, execPrice, qty);
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
    resource: ResourceType,
    price: number,
    qty: number,
  ): Promise<void> {
    const now = new Date();
    for (const { name, ms } of Object.values(CANDLE_INTERVALS)) {
      const openTime = new Date(Math.floor(now.getTime() / ms) * ms);
      const candleId = randomUUID();
      await tx.$queryRaw`
        INSERT INTO resource_ohlcv_candles (id, "universeId", "resource", "interval", "openTime", open, high, low, close, volume)
        VALUES (${candleId}, ${universeId}, ${resource}, ${name}, ${openTime}, ${price}, ${price}, ${price}, ${price}, ${qty})
        ON CONFLICT ("universeId", "resource", "interval", "openTime")
        DO UPDATE SET
          high = GREATEST(resource_ohlcv_candles.high, EXCLUDED.high),
          low = LEAST(resource_ohlcv_candles.low, EXCLUDED.low),
          close = EXCLUDED.close,
          volume = resource_ohlcv_candles.volume + EXCLUDED.volume
      `;
    }
  }

  private async bestBook(universeId: string, resource: ResourceType) {
    if (resource === ResourceType.BIOMASS) return { bestBid: 1, bestAsk: 1 };
    const [bid, ask] = await Promise.all([
      this.prisma.resourceMarketOrder.findFirst({
        where: {
          universeId,
          resource,
          side: MarketOrderSide.BUY,
          status: { in: [...ACTIVE_ORDER_STATUSES] },
        },
        orderBy: [{ pricePerUnit: 'desc' }, { createdAt: 'asc' }],
      }),
      this.prisma.resourceMarketOrder.findFirst({
        where: {
          universeId,
          resource,
          side: MarketOrderSide.SELL,
          status: { in: [...ACTIVE_ORDER_STATUSES] },
        },
        orderBy: [{ pricePerUnit: 'asc' }, { createdAt: 'asc' }],
      }),
    ]);
    return { bestBid: bid?.pricePerUnit ?? null, bestAsk: ask?.pricePerUnit ?? null };
  }

  private async spread(
    universeId: string,
    fromResource: ResourceType,
    toResource: ResourceType,
  ): Promise<number> {
    const changes = await Promise.all(
      [fromResource, toResource]
        .filter((resource) => resource !== ResourceType.BIOMASS)
        .map((resource) => this.compute24hChange(universeId, resource)),
    );
    const volatility = Math.max(0, ...changes.map((change) => Math.abs(change ?? 0) / 100));
    return Math.min(
      0.35,
      RESOURCE_MARKET_CONFIG.npcBaseSpread +
        volatility * RESOURCE_MARKET_CONFIG.npcVolatilitySpreadFactor,
    );
  }

  private async compute24hChange(
    universeId: string,
    resource: ResourceType,
  ): Promise<number | null> {
    if (resource === ResourceType.BIOMASS) return 0;
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 86_400_000);
    const twoDaysAgo = new Date(now.getTime() - 2 * 86_400_000);
    const [latest, older] = await Promise.all([
      this.prisma.resourceMarketTrade.findFirst({
        where: { universeId, resource },
        orderBy: { executedAt: 'desc' },
      }),
      this.prisma.resourceMarketTrade.findFirst({
        where: { universeId, resource, executedAt: { lt: dayAgo, gte: twoDaysAgo } },
        orderBy: { executedAt: 'desc' },
      }),
    ]);
    if (!latest || !older) return null;
    return ((latest.price - older.price) / older.price) * 100;
  }

  private assertTradable(resource: ResourceType): void {
    if (!RESOURCE_MARKET_CONFIG.tradableResources.includes(resource as never)) {
      throw new BadRequestException('Cette ressource ne possède pas de carnet de marché.');
    }
  }

  private resourceAmount(
    planet: { biomass: number; sap: number; minerals: number; spores: number },
    resource: ResourceType,
  ): number {
    if (resource === ResourceType.BIOMASS) return planet.biomass;
    if (resource === ResourceType.SAP) return planet.sap;
    if (resource === ResourceType.MINERALS) return planet.minerals;
    return planet.spores;
  }

  private resourceDelta(resource: ResourceType, amount: number): Prisma.PlanetUpdateInput {
    const op = amount >= 0 ? { increment: amount } : { decrement: Math.abs(amount) };
    if (resource === ResourceType.BIOMASS) return { biomass: op };
    if (resource === ResourceType.SAP) return { sap: op };
    if (resource === ResourceType.MINERALS) return { minerals: op };
    return { spores: op };
  }

  private resourceName(resource: ResourceType): string {
    return resource === ResourceType.BIOMASS
      ? 'Biomasse'
      : resource === ResourceType.SAP
        ? 'Sève'
        : resource === ResourceType.MINERALS
          ? 'Minéraux'
          : 'Spores';
  }

  private toOrderView(
    order: {
      id: string;
      resource: string;
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
  ): ResourceMarketOrderView {
    return {
      id: order.id,
      resource: order.resource as ResourceType,
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
