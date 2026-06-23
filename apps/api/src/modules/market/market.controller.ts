import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  ItemKey,
  placeMarketOrderSchema,
  type PlaceMarketOrderDto,
} from '@arborisis/shared';
import { MarketService } from './market.service';

@Controller('market')
export class MarketController {
  constructor(private readonly market: MarketService) {}

  @Get('summaries')
  getSummaries(@Req() req: Request) {
    return this.market.getMarketSummaries(req.user!.universeId!);
  }

  @Get(':itemKey/orderbook')
  getOrderBook(@Req() req: Request, @Param('itemKey') itemKey: ItemKey) {
    return this.market.getOrderBook(req.user!.universeId!, itemKey);
  }

  @Get(':itemKey/candles')
  getCandles(
    @Req() req: Request,
    @Param('itemKey') itemKey: ItemKey,
    @Query('interval') interval: '1h' | '4h' | '1d' = '1h',
    @Query('limit') limit?: string,
  ) {
    return this.market.getCandles(
      req.user!.universeId!,
      itemKey,
      interval,
      limit ? Number(limit) : 200,
    );
  }

  @Get(':itemKey/orders')
  getOrdersForItem(@Req() req: Request, @Param('itemKey') itemKey: ItemKey) {
    return this.market.getOrdersForItem(req.user!.universeId!, itemKey, req.user!.id);
  }

  @Get('my/orders')
  getMyOrders(@Req() req: Request) {
    return this.market.getMyOrders(req.user!.id, req.user!.universeId!);
  }

  @Get('my/trades')
  getMyTrades(@Req() req: Request) {
    return this.market.getMyTrades(req.user!.id, req.user!.universeId!);
  }

  @Post('orders')
  placeOrder(
    @Req() req: Request,
    @Body(new ZodValidationPipe(placeMarketOrderSchema)) dto: PlaceMarketOrderDto,
  ) {
    return this.market.placeOrder(req.user!.id, req.user!.universeId!, dto);
  }

  @Delete('orders/:id')
  cancelOrder(@Req() req: Request, @Param('id') id: string) {
    return this.market.cancelOrder(req.user!.id, id);
  }
}
