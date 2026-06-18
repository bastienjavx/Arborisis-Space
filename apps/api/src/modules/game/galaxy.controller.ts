import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import type { AuthUser, GalaxySystemView } from '@arborisis/shared';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { GalaxyService } from './galaxy.service';

@Controller('galaxy')
export class GalaxyController {
  constructor(private readonly galaxy: GalaxyService) {}

  @Get(':galaxy/:system')
  system(
    @CurrentUser() user: AuthUser,
    @Param('galaxy', ParseIntPipe) galaxy: number,
    @Param('system', ParseIntPipe) system: number,
  ): Promise<GalaxySystemView> {
    return this.galaxy.getSystem(user.id, galaxy, system);
  }
}
