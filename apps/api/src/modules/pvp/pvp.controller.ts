import { Body, Controller, Get, Post } from '@nestjs/common';
import {
  attackPlanetSchema,
  spyPlanetSchema,
  type AttackPlanetDto,
  type AuthUser,
  type IncomingAttackView,
  type PvpMissionView,
  type PvpReportView,
  type SpyPlanetDto,
} from '@arborisis/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PvpService } from './pvp.service';

@Controller('pvp')
export class PvpController {
  constructor(private readonly pvp: PvpService) {}

  @Post('spy')
  spy(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(spyPlanetSchema)) dto: SpyPlanetDto,
  ): Promise<PvpMissionView> {
    return this.pvp.spy(user.id, dto);
  }

  @Post('attack')
  attack(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(attackPlanetSchema)) dto: AttackPlanetDto,
  ): Promise<PvpMissionView> {
    return this.pvp.attack(user.id, dto);
  }

  @Get('missions')
  missions(@CurrentUser() user: AuthUser): Promise<PvpMissionView[]> {
    return this.pvp.listMissions(user.id);
  }

  @Get('reports')
  reports(@CurrentUser() user: AuthUser): Promise<PvpReportView[]> {
    return this.pvp.listReports(user.id);
  }

  @Get('incoming')
  incoming(@CurrentUser() user: AuthUser): Promise<IncomingAttackView[]> {
    return this.pvp.listIncoming(user.id);
  }
}
