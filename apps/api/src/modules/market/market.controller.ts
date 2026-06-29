import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  claimBondSchema,
  exchangeResourcesSchema,
  ItemKey,
  placeResourceMarketOrderSchema,
  placeMarketOrderSchema,
  resourceQuoteSchema,
  ResourceType,
  subscribeBondSchema,
  type AuthUser,
  type ClaimBondDto,
  type ExchangeResourcesDto,
  type PlaceMarketOrderDto,
  type PlaceResourceMarketOrderDto,
  type ResourceQuoteDto,
  type SubscribeBondDto,
} from '@arborisis/shared';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { BondService } from './bond.service';
import { MarketService } from './market.service';
import { ResourceMarketService } from './resource-market.service';

@Controller('market')
export class MarketController {
  constructor(
    private readonly market: MarketService,
    private readonly resourceMarket: ResourceMarketService,
    private readonly bonds: BondService,
  ) {}

  @Get('summaries')
  getSummaries(@CurrentUser() user: AuthUser) {
    return this.market.getMarketSummaries(user.universeId!);
  }

  @Get('my/orders')
  getMyOrders(@CurrentUser() user: AuthUser) {
    return this.market.getMyOrders(user.id, user.universeId!);
  }

  @Get('my/trades')
  getMyTrades(@CurrentUser() user: AuthUser) {
    return this.market.getMyTrades(user.id, user.universeId!);
  }

  @Get('resources/summaries')
  getResourceSummaries(@CurrentUser() user: AuthUser) {
    return this.resourceMarket.getSummaries(user.universeId!);
  }

  @Get('resources/quotes')
  getResourceQuote(
    @CurrentUser() user: AuthUser,
    @Query(new ZodValidationPipe(resourceQuoteSchema)) dto: ResourceQuoteDto,
  ) {
    return this.resourceMarket.getQuote(user.universeId!, dto);
  }

  @Post('resources/exchange')
  exchangeResources(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(exchangeResourcesSchema)) dto: ExchangeResourcesDto,
  ) {
    return this.resourceMarket.exchange(user.id, user.universeId!, dto);
  }

  @Get('resources/my/orders')
  getMyResourceOrders(@CurrentUser() user: AuthUser) {
    return this.resourceMarket.getMyOrders(user.id, user.universeId!);
  }

  @Get('resources/my/trades')
  getMyResourceTrades(@CurrentUser() user: AuthUser) {
    return this.resourceMarket.getMyTrades(user.id, user.universeId!);
  }

  @Get('resources/:resource/orderbook')
  getResourceOrderBook(@CurrentUser() user: AuthUser, @Param('resource') resource: ResourceType) {
    return this.resourceMarket.getOrderBook(user.universeId!, resource);
  }

  @Get('resources/:resource/candles')
  getResourceCandles(
    @CurrentUser() user: AuthUser,
    @Param('resource') resource: ResourceType,
    @Query('interval') interval: '1h' | '4h' | '1d' = '1h',
    @Query('limit') limit?: string,
  ) {
    return this.resourceMarket.getCandles(
      user.universeId!,
      resource,
      interval,
      limit ? Number(limit) : 200,
    );
  }

  @Post('resources/orders')
  placeResourceOrder(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(placeResourceMarketOrderSchema)) dto: PlaceResourceMarketOrderDto,
  ) {
    return this.resourceMarket.placeOrder(user.id, user.universeId!, dto);
  }

  @Delete('resources/orders/:id')
  cancelResourceOrder(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.resourceMarket.cancelOrder(user.id, id);
  }

  @Get('bonds/offerings')
  getBondOfferings(@CurrentUser() user: AuthUser) {
    return this.bonds.getOfferings(user.universeId!);
  }

  @Get('bonds/my')
  getMyBonds(@CurrentUser() user: AuthUser) {
    return this.bonds.getMyPositions(user.id, user.universeId!);
  }

  @Post('bonds/subscribe')
  subscribeBond(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(subscribeBondSchema)) dto: SubscribeBondDto,
  ) {
    return this.bonds.subscribe(user.id, user.universeId!, dto);
  }

  @Post('bonds/:id/claim')
  claimBond(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(claimBondSchema)) dto: ClaimBondDto,
  ) {
    return this.bonds.claim(user.id, id, dto);
  }

  @Get(':itemKey/orderbook')
  getOrderBook(@CurrentUser() user: AuthUser, @Param('itemKey') itemKey: ItemKey) {
    return this.market.getOrderBook(user.universeId!, itemKey);
  }

  @Get(':itemKey/candles')
  getCandles(
    @CurrentUser() user: AuthUser,
    @Param('itemKey') itemKey: ItemKey,
    @Query('interval') interval: '1h' | '4h' | '1d' = '1h',
    @Query('limit') limit?: string,
  ) {
    return this.market.getCandles(user.universeId!, itemKey, interval, limit ? Number(limit) : 200);
  }

  @Get(':itemKey/orders')
  getOrdersForItem(@CurrentUser() user: AuthUser, @Param('itemKey') itemKey: ItemKey) {
    return this.market.getOrdersForItem(user.universeId!, itemKey, user.id);
  }

  @Post('orders')
  placeOrder(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(placeMarketOrderSchema)) dto: PlaceMarketOrderDto,
  ) {
    return this.market.placeOrder(user.id, user.universeId!, dto);
  }

  @Delete('orders/:id')
  cancelOrder(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.market.cancelOrder(user.id, id);
  }
}
