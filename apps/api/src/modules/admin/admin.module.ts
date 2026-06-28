import { Module } from '@nestjs/common';
import { AdminNpcController } from './admin-npc.controller';
import { AdminNpcService } from './admin-npc.service';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  controllers: [AdminController, AdminNpcController],
  providers: [AdminService, AdminNpcService],
})
export class AdminModule {}
