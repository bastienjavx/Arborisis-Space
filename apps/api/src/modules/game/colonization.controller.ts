import { Body, Controller, Get, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { colonizeSchema, type AuthUser, type ColonizeDto, type JobView } from '@arborisis/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ColonizationService } from './colonization.service';

@Controller('colonization')
export class ColonizationController {
  constructor(private readonly colonization: ColonizationService) {}

  @Get()
  active(@CurrentUser() user: AuthUser): Promise<JobView[]> {
    return this.colonization.listActive(user.id);
  }

  @Throttle({ default: { limit: 30, ttl: 10_000 } })
  @Post()
  colonize(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(colonizeSchema)) dto: ColonizeDto,
  ): Promise<JobView> {
    return this.colonization.colonize(user.id, dto.sourcePlanetId, dto.target);
  }
}
