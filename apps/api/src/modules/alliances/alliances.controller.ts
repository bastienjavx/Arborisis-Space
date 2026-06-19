import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import type {
  AllianceApplicationView,
  AllianceDetailView,
  AllianceView,
  ApplyAllianceDto,
  AuthUser,
  CreateAllianceDto,
  DecideApplicationDto,
} from '@arborisis/shared';
import {
  allianceMemberActionSchema,
  applyAllianceSchema,
  createAllianceSchema,
  decideApplicationSchema,
} from '@arborisis/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AlliancesService } from './alliances.service';

@Controller('alliances')
export class AlliancesController {
  constructor(private readonly alliancesService: AlliancesService) {}

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(createAllianceSchema)) dto: CreateAllianceDto,
  ): Promise<AllianceView> {
    return this.alliancesService.create(user, dto);
  }

  @Get()
  search(@Query('search') search?: string): Promise<AllianceView[]> {
    return this.alliancesService.search(search);
  }

  @Get('me')
  myAlliance(@CurrentUser() user: AuthUser): Promise<AllianceDetailView | null> {
    return this.alliancesService.myAlliance(user.id);
  }

  @Get('applications')
  listApplications(@CurrentUser() user: AuthUser): Promise<AllianceApplicationView[]> {
    return this.alliancesService.listApplications(user.id);
  }

  @Patch('applications/:id')
  decideApplication(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(decideApplicationSchema)) dto: DecideApplicationDto,
  ): Promise<void> {
    return this.alliancesService.decideApplication(user.id, id, dto);
  }

  @Post('leave')
  @HttpCode(204)
  async leave(@CurrentUser() user: AuthUser): Promise<void> {
    await this.alliancesService.leave(user.id);
  }

  @Get(':id')
  getDetail(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<AllianceDetailView> {
    return this.alliancesService.getDetail(user.id, id);
  }

  @Post(':id/apply')
  @HttpCode(204)
  async apply(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(applyAllianceSchema)) dto: ApplyAllianceDto,
  ): Promise<void> {
    await this.alliancesService.apply(user.id, id, dto);
  }

  @Post(':id/kick')
  @HttpCode(204)
  async kick(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(allianceMemberActionSchema)) dto: { userId: string },
  ): Promise<void> {
    await this.alliancesService.kick(user.id, id, dto.userId);
  }

  @Post(':id/promote')
  @HttpCode(204)
  async promote(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(allianceMemberActionSchema)) dto: { userId: string },
  ): Promise<void> {
    await this.alliancesService.promote(user.id, id, dto.userId);
  }

  @Post(':id/demote')
  @HttpCode(204)
  async demote(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(allianceMemberActionSchema)) dto: { userId: string },
  ): Promise<void> {
    await this.alliancesService.demote(user.id, id, dto.userId);
  }

  @Post(':id/disband')
  @HttpCode(204)
  async disband(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.alliancesService.disband(user.id, id);
  }
}
