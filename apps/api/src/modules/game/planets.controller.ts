import { Body, Controller, Get, Param, ParseUUIDPipe, Patch } from '@nestjs/common';
import {
  renamePlanetSchema,
  type AuthUser,
  type PlanetDetail,
  type PlanetSummary,
  type RenamePlanetDto,
} from '@arborisis/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
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

  @Patch(':id/name')
  rename(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(renamePlanetSchema)) dto: RenamePlanetDto,
  ): Promise<PlanetSummary> {
    return this.planets.renamePlanet(user.id, id, dto.name);
  }
}
