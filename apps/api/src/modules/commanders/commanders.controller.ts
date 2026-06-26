import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import {
  CommanderTalentBranch,
  CommanderType,
  type AuthUser,
  type CommanderView,
  type CommandersOverview,
} from '@arborisis/shared';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CommandersService } from './commanders.service';

@Controller('commanders')
export class CommandersController {
  constructor(private readonly commanders: CommandersService) {}

  @Get()
  overview(@CurrentUser() user: AuthUser): Promise<CommandersOverview> {
    return this.commanders.overview(user.id);
  }

  @Post('recruit')
  recruit(
    @CurrentUser() user: AuthUser,
    @Body('type') type: CommanderType,
  ): Promise<CommanderView> {
    return this.commanders.recruit(user.id, type);
  }

  @Patch(':id/assign')
  assign(
    @CurrentUser() user: AuthUser,
    @Param('id') commanderId: string,
    @Body('planetId') planetId: string | null,
  ): Promise<CommanderView> {
    return this.commanders.assignToPlanet(user.id, commanderId, planetId ?? null);
  }

  @Post(':id/talent')
  investTalent(
    @CurrentUser() user: AuthUser,
    @Param('id') commanderId: string,
    @Body('branch') branch: CommanderTalentBranch,
    @Body('nodeId') nodeId: string,
  ): Promise<CommanderView> {
    return this.commanders.investTalent(user.id, commanderId, branch, nodeId);
  }
}
