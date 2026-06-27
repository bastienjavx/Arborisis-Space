import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import type { Env } from './common/config/env';
import { RuntimeCoreModule } from './runtime/runtime-core.module';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { OriginGuard } from './common/guards/origin.guard';
import { AntiCheatModule } from './modules/anticheat/anticheat.module';
import { UserThrottlerGuard } from './modules/anticheat/user-throttler.guard';
import { AuthModule } from './modules/auth/auth.module';
import { GameModule } from './modules/game/game.module';
import { HealthModule } from './modules/health/health.module';
import { AlliancesModule } from './modules/alliances/alliances.module';
import { PveModule } from './modules/pve/pve.module';
import { PvpModule } from './modules/pvp/pvp.module';
import { UniverseModule } from './modules/universe/universe.module';
import { UsersModule } from './modules/users/users.module';
import { ChatModule } from './modules/chat/chat.module';
import { AdminModule } from './modules/admin/admin.module';
import { MarketModule } from './modules/market/market.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { CraftingModule } from './modules/crafting/crafting.module';
import { ProductionLinesModule } from './modules/production-lines/production-lines.module';
import { TradeRoutesModule } from './modules/trade-routes/trade-routes.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { DiplomacyModule } from './modules/diplomacy/diplomacy.module';
import { CommandersModule } from './modules/commanders/commanders.module';
import { MoonsModule } from './modules/moons/moons.module';
import { DefensesModule } from './modules/defenses/defenses.module';
import { EventsModule } from './modules/events/events.module';

@Module({
  imports: [
    RuntimeCoreModule,
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => {
        return {
          // Stockage Redis partagé : les compteurs sont cohérents entre tous les réplicas.
          // Sans ça, chaque réplica a son propre compteur → la limite réelle est limit × numReplicas.
          storage: new ThrottlerStorageRedisService(config.get('REDIS_URL', { infer: true })),
          throttlers: [{ ttl: 60_000, limit: 100 }],
        };
      },
    }),
    AntiCheatModule,
    HealthModule,
    AuthModule,
    UsersModule,
    ChatModule,
    AdminModule,
    GameModule,
    AlliancesModule,
    PveModule,
    PvpModule,
    MarketModule,
    InventoryModule,
    CraftingModule,
    ProductionLinesModule,
    TradeRoutesModule,
    NotificationsModule,
    DiplomacyModule,
    CommandersModule,
    MoonsModule,
    DefensesModule,
    UniverseModule,
    EventsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: OriginGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: UserThrottlerGuard },
  ],
})
export class AppModule {}
