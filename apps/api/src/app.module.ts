import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { validateEnv, type Env } from './common/config/env';
import { PrismaModule } from './common/prisma/prisma.module';
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
import { ProcessorsModule } from './modules/queue/processors.module';
import { ProvisioningModule } from './modules/provisioning/provisioning.module';
import { UniverseModule } from './modules/universe/universe.module';
import { UsersModule } from './modules/users/users.module';
import { ChatModule } from './modules/chat/chat.module';
import { AdminModule } from './modules/admin/admin.module';
import { MarketModule } from './modules/market/market.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { CraftingModule } from './modules/crafting/crafting.module';
import { TradeRoutesModule } from './modules/trade-routes/trade-routes.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => {
        const isProd = config.get('NODE_ENV', { infer: true }) === 'production';
        return {
          pinoHttp: {
            level: isProd ? 'info' : 'debug',
            transport: isProd
              ? undefined
              : { target: 'pino-pretty', options: { singleLine: true } },
            // Ne jamais journaliser les secrets.
            redact: [
              'req.headers.cookie',
              'req.headers.authorization',
              'res.headers["set-cookie"]',
            ],
            autoLogging: true,
          },
        };
      },
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => {
        const url = new URL(config.get('REDIS_URL', { infer: true }));
        return {
          connection: {
            host: url.hostname,
            port: Number(url.port) || 6379,
            username: url.username || undefined,
            password: url.password || undefined,
            db: url.pathname ? Number(url.pathname.slice(1)) || 0 : 0,
            // Requis par les workers BullMQ.
            maxRetriesPerRequest: null,
          },
        };
      },
    }),
    PrismaModule,
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
    TradeRoutesModule,
    ProcessorsModule,
    ProvisioningModule,
    UniverseModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: OriginGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: UserThrottlerGuard },
  ],
})
export class AppModule {}
