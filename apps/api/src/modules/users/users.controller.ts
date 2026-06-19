import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import type { AuthUser, PublicProfile, UpdateProfileDto } from '@arborisis/shared';
import { updateProfileSchema } from '@arborisis/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Patch('me')
  async updateProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(updateProfileSchema)) dto: UpdateProfileDto,
  ): Promise<{ user: AuthUser }> {
    return { user: await this.usersService.updateProfile(user.id, dto) };
  }

  @Get(':id/profile')
  async getPublicProfile(@Param('id') id: string): Promise<PublicProfile> {
    return this.usersService.getPublicProfile(id);
  }
}
