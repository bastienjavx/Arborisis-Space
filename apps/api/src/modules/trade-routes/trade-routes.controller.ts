import { Body, Controller, Delete, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  createTradeRouteSchema,
  updateTradeRouteStatusSchema,
  type CreateTradeRouteDto,
  type UpdateTradeRouteStatusDto,
} from '@arborisis/shared';
import { TradeRoutesService } from './trade-routes.service';

@Controller('trade-routes')
export class TradeRoutesController {
  constructor(private readonly tradeRoutes: TradeRoutesService) {}

  @Get()
  getAll(@Req() req: Request) {
    return this.tradeRoutes.getRoutes(req.user!.id);
  }

  @Post()
  create(
    @Req() req: Request,
    @Body(new ZodValidationPipe(createTradeRouteSchema)) dto: CreateTradeRouteDto,
  ) {
    return this.tradeRoutes.createRoute(req.user!.id, dto);
  }

  @Patch(':id/status')
  updateStatus(
    @Req() req: Request,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateTradeRouteStatusSchema)) dto: UpdateTradeRouteStatusDto,
  ) {
    return this.tradeRoutes.updateStatus(req.user!.id, id, dto.status);
  }

  @Delete(':id')
  delete(@Req() req: Request, @Param('id') id: string) {
    return this.tradeRoutes.deleteRoute(req.user!.id, id);
  }
}
