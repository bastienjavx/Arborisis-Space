import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import type { AuthUser, SeasonOverview } from '@arborisis/shared';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SeasonsService } from './seasons.service';

@Controller('seasons')
@UseGuards(JwtAuthGuard)
export class SeasonsController {
  constructor(private readonly seasons: SeasonsService) {}

  @Get()
  getOverview(@CurrentUser() user: AuthUser): Promise<SeasonOverview> {
    return this.seasons.getOverview(user.id);
  }

  @Post('claim')
  claim(@CurrentUser() user: AuthUser): Promise<SeasonOverview> {
    return this.seasons.claim(user.id);
  }
}
