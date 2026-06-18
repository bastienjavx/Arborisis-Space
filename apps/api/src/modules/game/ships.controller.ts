import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import {
  produceShipsSchema,
  type AuthUser,
  type FleetOverview,
  type ProduceShipsDto,
  type ShipProductionJobView,
} from '@arborisis/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ShipsService } from './ships.service';

@Controller()
export class ShipsController {
  constructor(private readonly ships: ShipsService) {}

  @Get('fleets/:planetId')
  overview(
    @CurrentUser() user: AuthUser,
    @Param('planetId', ParseUUIDPipe) planetId: string,
  ): Promise<FleetOverview> {
    return this.ships.overview(user.id, planetId);
  }

  @Post('ships')
  produce(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(produceShipsSchema)) dto: ProduceShipsDto,
  ): Promise<ShipProductionJobView> {
    return this.ships.produce(user.id, dto);
  }
}
