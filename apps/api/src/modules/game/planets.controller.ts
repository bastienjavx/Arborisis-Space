import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import type { AuthUser, PlanetDetail, PlanetSummary } from '@arborisis/shared';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PlanetsService } from './planets.service';

@Controller('planets')
export class PlanetsController {
  constructor(private readonly planets: PlanetsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser): Promise<PlanetSummary[]> {
    return this.planets.listPlanets(user.id);
  }

  @Get(':id')
  detail(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PlanetDetail> {
    return this.planets.getPlanetDetail(user.id, id);
  }
}
