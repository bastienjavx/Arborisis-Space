import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { UniverseModule } from '../universe/universe.module';
import { QueueModule } from '../queue/queue.module';
import { ProvisioningService } from './provisioning.service';
import { ProvisioningProcessor } from './provisioning.processor';

/**
 * Module d'auto-provisioning Railway des univers saturés.
 */
@Module({
  imports: [PrismaModule, UniverseModule, QueueModule],
  providers: [ProvisioningService, ProvisioningProcessor],
  exports: [ProvisioningService],
})
export class ProvisioningModule {}
