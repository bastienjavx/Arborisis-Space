import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import {
  buildDefenseSchema,
  type AuthUser,
  type BuildDefenseDto,
  type PlanetDefensesView,
} from '@arborisis/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { DefensesService } from './defenses.service';

@Controller('planets/:planetId/defenses')
export class DefensesController {
  constructor(private readonly defenses: DefensesService) {}

  @Get()
  getDefenses(
    @CurrentUser() user: AuthUser,
    @Param('planetId') planetId: string,
  ): Promise<PlanetDefensesView> {
    return this.defenses.getDefenses(user.id, planetId);
  }

  @Post('build')
  build(
    @CurrentUser() user: AuthUser,
    @Param('planetId') planetId: string,
    @Body(new ZodValidationPipe(buildDefenseSchema)) dto: BuildDefenseDto,
  ): Promise<PlanetDefensesView> {
    return this.defenses.build(user.id, planetId, dto.defenseType, dto.quantity);
  }
}
