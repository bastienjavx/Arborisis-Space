import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  createTradeRouteSchema,
  updateTradeRouteStatusSchema,
  type AuthUser,
  type CreateTradeRouteDto,
  type UpdateTradeRouteStatusDto,
} from '@arborisis/shared';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { TradeRoutesService } from './trade-routes.service';

@Controller('trade-routes')
export class TradeRoutesController {
  constructor(private readonly tradeRoutes: TradeRoutesService) {}

  @Get()
  getAll(@CurrentUser() user: AuthUser) {
    return this.tradeRoutes.getRoutes(user.id);
  }

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(createTradeRouteSchema)) dto: CreateTradeRouteDto,
  ) {
    return this.tradeRoutes.createRoute(user.id, dto);
  }

  @Patch(':id/status')
  updateStatus(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateTradeRouteStatusSchema)) dto: UpdateTradeRouteStatusDto,
  ) {
    return this.tradeRoutes.updateStatus(user.id, id, dto.status);
  }

  @Delete(':id')
  delete(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.tradeRoutes.deleteRoute(user.id, id);
  }
}
