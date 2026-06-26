import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { MoonBuildingType, type AuthUser, type DebrisFieldView, type MoonView } from '@arborisis/shared';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { MoonsService } from './moons.service';

@Controller()
export class MoonsController {
  constructor(private readonly moons: MoonsService) {}

  @Get('galaxy/:galaxy/system/:system/debris')
  getDebrisFields(
    @Param('galaxy') galaxy: string,
    @Param('system') system: string,
  ): Promise<DebrisFieldView[]> {
    return this.moons.getDebrisFields(Number(galaxy), Number(system));
  }

  @Get('planets/:planetId/moon')
  getMoon(
    @CurrentUser() user: AuthUser,
    @Param('planetId') planetId: string,
  ): Promise<MoonView | null> {
    return this.moons.getMoon(user.id, planetId);
  }

  @Post('planets/:planetId/moon/build')
  buildMoonBuilding(
    @CurrentUser() user: AuthUser,
    @Param('planetId') planetId: string,
    @Body('buildingType') buildingType: MoonBuildingType,
  ): Promise<MoonView> {
    return this.moons.buildMoonBuilding(user.id, planetId, buildingType);
  }
}
