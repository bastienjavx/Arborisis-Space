import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import {
  startExpeditionSchema,
  type AuthUser,
  type ExpeditionReportView,
  type ExpeditionView,
  type StartExpeditionDto,
} from '@arborisis/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ExpeditionsService } from './expeditions.service';

@Controller('expeditions')
export class ExpeditionsController {
  constructor(private readonly expeditions: ExpeditionsService) {}

  @Get()
  active(@CurrentUser() user: AuthUser): Promise<ExpeditionView[]> {
    return this.expeditions.listActive(user.id);
  }

  @Post()
  start(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(startExpeditionSchema)) dto: StartExpeditionDto,
  ): Promise<ExpeditionView> {
    return this.expeditions.start(user.id, dto);
  }

  @Get('reports')
  reports(@CurrentUser() user: AuthUser): Promise<ExpeditionReportView[]> {
    return this.expeditions.listReports(user.id);
  }

  @Patch('reports/:id/read')
  read(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ExpeditionReportView> {
    return this.expeditions.markReportRead(user.id, id);
  }
}
