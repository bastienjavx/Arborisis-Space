import { Controller, Get, UseGuards } from '@nestjs/common';
import type { AuthUser, AchievementView } from '@arborisis/shared';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AchievementsService } from './achievements.service';

@Controller('achievements')
@UseGuards(JwtAuthGuard)
export class AchievementsController {
  constructor(private readonly achievements: AchievementsService) {}

  @Get()
  getAchievements(@CurrentUser() user: AuthUser): Promise<AchievementView[]> {
    return this.achievements.getAchievements(user.id);
  }
}
