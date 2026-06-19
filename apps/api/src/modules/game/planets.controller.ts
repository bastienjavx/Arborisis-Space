import { Body, Controller, Get, Param, ParseUUIDPipe, Patch } from '@nestjs/common';
import {
  renamePlanetSchema,
  setProductionIntensitiesSchema,
  setSpecializationSchema,
  type AuthUser,
  type PlanetDetail,
  type PlanetSummary,
  type RenamePlanetDto,
  type SetSpecializationDto,
  type SetProductionIntensitiesDto,
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

  @Patch(':id/specialization')
  specialize(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(setSpecializationSchema)) dto: SetSpecializationDto,
  ): Promise<PlanetSummary> {
    return this.planets.setSpecialization(user.id, id, dto.specialization);
  }

  @Patch(':id/production')
  setProductionIntensities(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(setProductionIntensitiesSchema)) dto: SetProductionIntensitiesDto,
  ): Promise<PlanetDetail> {
    return this.planets.setProductionIntensities(user.id, id, dto.intensities);
  }
}
