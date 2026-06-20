import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AntiCheatInterceptor } from './anticheat.interceptor';
import { AntiCheatService } from './anticheat.service';
import { AntiCheatSweepService } from './anticheat-sweep.service';

/**
 * Module anti-triche transversal. Fournit le journal d'audit / la détection
 * d'anomalies (`AntiCheatService`), le balayage d'intégrité périodique
 * (`AntiCheatSweepService`) et l'intercepteur de suivi d'accès (multi-comptes).
 * Global pour que `AntiCheatService` soit injectable partout sans réimport.
 */
@Global()
@Module({
  providers: [
    AntiCheatService,
    AntiCheatSweepService,
    { provide: APP_INTERCEPTOR, useClass: AntiCheatInterceptor },
  ],
  exports: [AntiCheatService],
})
export class AntiCheatModule {}
