import { Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch } from '@nestjs/common';
import type { AuthUser, NotificationView, UnreadCountView } from '@arborisis/shared';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly svc: NotificationsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser): Promise<NotificationView[]> {
    return this.svc.list(user.id);
  }

  @Get('unread-count')
  unreadCount(@CurrentUser() user: AuthUser): Promise<UnreadCountView> {
    return this.svc.unreadCount(user.id);
  }

  @Patch(':id/read')
  @HttpCode(204)
  async markRead(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.svc.markRead(user.id, id);
  }

  @Patch('read-all')
  @HttpCode(204)
  async markAllRead(@CurrentUser() user: AuthUser): Promise<void> {
    await this.svc.markAllRead(user.id);
  }

  @Delete('old')
  @HttpCode(204)
  async deleteOld(@CurrentUser() user: AuthUser): Promise<void> {
    await this.svc.deleteOld(user.id);
  }
}
