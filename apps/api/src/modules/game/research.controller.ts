import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import {
  startResearchSchema,
  type AuthUser,
  type JobView,
  type ResearchOverview,
  type StartResearchDto,
} from '@arborisis/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ResearchService } from './research.service';

@Controller('research')
export class ResearchController {
  constructor(private readonly research: ResearchService) {}

  @Get(':planetId')
  overview(
    @CurrentUser() user: AuthUser,
    @Param('planetId', ParseUUIDPipe) planetId: string,
  ): Promise<ResearchOverview> {
    return this.research.getOverview(user.id, planetId);
  }

  @Post()
  start(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(startResearchSchema)) dto: StartResearchDto,
  ): Promise<JobView> {
    return this.research.start(user.id, dto.planetId, dto.type);
  }
}
