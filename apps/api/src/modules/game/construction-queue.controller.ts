import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import type { AddToQueueDto, AuthUser, ConstructionQueueItemView } from '@arborisis/shared';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ConstructionQueueService } from './construction-queue.service';

@Controller('construction-queue')
export class ConstructionQueueController {
  constructor(private readonly svc: ConstructionQueueService) {}

  @Get()
  getQueue(
    @CurrentUser() user: AuthUser,
    @Query('planetId') planetId: string,
  ): Promise<ConstructionQueueItemView[]> {
    return this.svc.getQueue(user.id, planetId);
  }

  @Post()
  addToQueue(
    @CurrentUser() user: AuthUser,
    @Body() dto: AddToQueueDto,
  ): Promise<ConstructionQueueItemView> {
    return this.svc.addToQueue(user.id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.svc.removeFromQueue(user.id, id);
  }
}
