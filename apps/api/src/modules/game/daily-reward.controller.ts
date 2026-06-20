import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import type { AuthUser, DailyRewardView } from '@arborisis/shared';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { DailyRewardService } from './daily-reward.service';

@Controller('daily-reward')
@UseGuards(JwtAuthGuard)
export class DailyRewardController {
  constructor(private readonly dailyReward: DailyRewardService) {}

  @Get()
  getStatus(@CurrentUser() user: AuthUser): Promise<DailyRewardView> {
    return this.dailyReward.getStatus(user.id);
  }

  @Post('claim')
  claim(@CurrentUser() user: AuthUser): Promise<DailyRewardView> {
    return this.dailyReward.claim(user.id);
  }
}
