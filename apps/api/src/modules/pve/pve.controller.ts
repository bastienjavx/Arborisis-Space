import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import {
  attackEncounterSchema,
  type AttackEncounterDto,
  type AuthUser,
  type NpcEncounterView,
  type PveMissionView,
} from '@arborisis/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { PveService } from './pve.service';

@Controller('pve')
export class PveController {
  constructor(private readonly pve: PveService) {}

  @Get('encounters')
  encounters(): Promise<NpcEncounterView[]> {
    return this.pve.listEncounters();
  }

  @Post('encounters/:id/attack')
  attack(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(attackEncounterSchema)) dto: AttackEncounterDto,
  ): Promise<PveMissionView> {
    return this.pve.attack(user.id, id, dto);
  }

  @Get('missions')
  missions(@CurrentUser() user: AuthUser): Promise<PveMissionView[]> {
    return this.pve.listMissions(user.id);
  }
}
