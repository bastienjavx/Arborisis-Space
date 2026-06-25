import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { EngagementService } from './engagement.service';

@Controller('engagement')
@UseGuards(JwtAuthGuard)
export class EngagementController {
  constructor(private readonly service: EngagementService) {}

  @Get()
  async getEngagement(@CurrentUser('userId') userId: string) {
    return this.service.getEngagement(userId);
  }

  @Post('heartbeat')
  async heartbeat(@CurrentUser('userId') userId: string) {
    return this.service.incrementSessionTime(userId, 5);
  }
}
