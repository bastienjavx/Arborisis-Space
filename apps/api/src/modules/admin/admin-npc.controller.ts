import { Controller, Get, Query } from '@nestjs/common';
import {
  npcActionLogQuerySchema,
  type NpcActionLogQueryDto,
  type NpcActionLogView,
  type NpcActionStatsView,
} from '@arborisis/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { AdminNpcService } from './admin-npc.service';

@Controller('admin/npc-actions')
export class AdminNpcController {
  constructor(private readonly adminNpc: AdminNpcService) {}

  @Get()
  logs(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(npcActionLogQuerySchema)) query: NpcActionLogQueryDto,
  ): Promise<NpcActionLogView[]> {
    return this.adminNpc.logs(user.id, query);
  }

  @Get('stats')
  stats(@CurrentUser() user: AuthenticatedUser): Promise<NpcActionStatsView> {
    return this.adminNpc.stats(user.id);
  }
}
