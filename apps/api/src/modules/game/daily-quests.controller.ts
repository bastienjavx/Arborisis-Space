import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { DailyQuestsService } from './daily-quests.service';

@Controller('daily-quests')
@UseGuards(JwtAuthGuard)
export class DailyQuestsController {
  constructor(private readonly service: DailyQuestsService) {}

  @Get()
  async getQuests(@CurrentUser('userId') userId: string) {
    return this.service.getDailyQuests(userId);
  }

  @Post(':id/claim')
  async claimQuest(@CurrentUser('userId') userId: string, @Param('id') questId: string) {
    return this.service.claimDailyQuest(userId, questId);
  }

  @Post('weekly-bonus/claim')
  async claimWeeklyBonus(@CurrentUser('userId') userId: string) {
    await this.service.claimWeeklyBonus(userId);
    return this.service.getDailyQuests(userId);
  }
}
