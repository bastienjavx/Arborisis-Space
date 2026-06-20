import { Body, Controller, Get, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  transferResourcesSchema,
  type AuthUser,
  type ResourceTransferMissionView,
  type TransferResourcesDto,
} from '@arborisis/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { TransferService } from './transfer.service';

@Controller('transfer')
export class TransferController {
  constructor(private readonly transfer: TransferService) {}

  @Throttle({ default: { limit: 30, ttl: 10_000 } })
  @Post()
  launch(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(transferResourcesSchema)) dto: TransferResourcesDto,
  ): Promise<ResourceTransferMissionView> {
    return this.transfer.launch(user.id, dto);
  }

  @Get()
  list(@CurrentUser() user: AuthUser): Promise<ResourceTransferMissionView[]> {
    return this.transfer.listMissions(user.id);
  }
}
