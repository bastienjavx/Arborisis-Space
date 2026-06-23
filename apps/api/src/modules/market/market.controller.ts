import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  ItemKey,
  placeMarketOrderSchema,
  type AuthUser,
  type PlaceMarketOrderDto,
} from '@arborisis/shared';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { MarketService } from './market.service';

@Controller('market')
export class MarketController {
  constructor(private readonly market: MarketService) {}

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
