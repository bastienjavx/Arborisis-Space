import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import {
  changeUserRoleSchema,
  moderateUserSchema,
  type AdminUserView,
  type ChangeUserRoleDto,
  type ModerateUserDto,
  type ModerationActionView,
} from '@arborisis/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { AdminService } from './admin.service';

@Controller('admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('users')
  users(
    @CurrentUser() user: AuthenticatedUser,
    @Query('search') search = '',
  ): Promise<AdminUserView[]> {
    return this.admin.users(user.id, search.trim());
  }

  @Patch('users/:id/role')
  changeRole(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(changeUserRoleSchema)) dto: ChangeUserRoleDto,
  ): Promise<void> {
    return this.admin.changeRole(user.id, id, dto);
  }

  @Patch('users/:id/moderation')
  moderate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(moderateUserSchema)) dto: ModerateUserDto,
  ): Promise<void> {
    return this.admin.moderate(user.id, id, dto);
  }

  @Get('moderation-actions')
  actions(@CurrentUser() user: AuthenticatedUser): Promise<ModerationActionView[]> {
    return this.admin.actions(user.id);
  }
}
