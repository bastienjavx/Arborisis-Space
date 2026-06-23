import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import type { AuthUser, CreateFleetPresetDto, FleetPresetView } from '@arborisis/shared';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { FleetPresetsService } from './fleet-presets.service';

@Controller('fleet-presets')
export class FleetPresetsController {
  constructor(private readonly svc: FleetPresetsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser): Promise<FleetPresetView[]> {
    return this.svc.list(user.id);
  }

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateFleetPresetDto,
  ): Promise<FleetPresetView> {
    return this.svc.create(user.id, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Partial<CreateFleetPresetDto>,
  ): Promise<FleetPresetView> {
    return this.svc.update(user.id, id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  async delete(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.svc.delete(user.id, id);
  }
}
