import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import {
  claimQuestSchema,
  type AuthUser,
  type ClaimQuestDto,
  type QuestsOverview,
} from '@arborisis/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { QuestsService } from './quests.service';

@Controller('quests')
@UseGuards(JwtAuthGuard)
export class QuestsController {
  constructor(private readonly quests: QuestsService) {}

  @Get()
  getQuests(@CurrentUser() user: AuthUser): Promise<QuestsOverview> {
    return this.quests.getQuests(user.id);
  }

  @Post('claim')
  claim(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(claimQuestSchema)) dto: ClaimQuestDto,
  ): Promise<QuestsOverview> {
    return this.quests.claim(user.id, dto.questId);
  }
}
