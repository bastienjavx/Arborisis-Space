import { Body, Controller, Delete, HttpCode, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import {
  buildBuildingSchema,
  type AuthUser,
  type BuildBuildingDto,
  type JobView,
} from '@arborisis/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { BuildingsService } from './buildings.service';

@Controller('buildings')
export class BuildingsController {
  constructor(private readonly buildings: BuildingsService) {}

  @Post()
  upgrade(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(buildBuildingSchema)) dto: BuildBuildingDto,
  ): Promise<JobView> {
    return this.buildings.upgrade(user.id, dto.planetId, dto.type);
  }

  @Delete(':planetId')
  @HttpCode(204)
  async cancel(
    @CurrentUser() user: AuthUser,
    @Param('planetId', ParseUUIDPipe) planetId: string,
  ): Promise<void> {
    await this.buildings.cancel(user.id, planetId);
  }
}
