import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { AdminUniverseController, UniverseController } from './universe.controller';
import { UniverseGuard } from './universe.guard';
import { UniverseInterceptor } from './universe.interceptor';
import { UniverseService } from './universe.service';

@Module({
  imports: [PrismaModule],
  controllers: [UniverseController, AdminUniverseController],
  providers: [
    UniverseService,
    UniverseGuard,
    { provide: APP_INTERCEPTOR, useClass: UniverseInterceptor },
  ],
  exports: [UniverseService, UniverseGuard],
})
export class UniverseModule {}
