import { Module, Global, Inject, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { Env } from '../config/env';
import { RedisCacheService } from './redis-cache.service';

export const REDIS_CLIENT = Symbol('REDIS_CLIENT');

@Global()
@Module({
  providers: [
    RedisCacheService,
    {
      provide: REDIS_CLIENT,
      useFactory: (config: ConfigService<Env, true>) =>
        new Redis(config.get('REDIS_URL', { infer: true })),
      inject: [ConfigService],
    },
  ],
  exports: [RedisCacheService, REDIS_CLIENT],
})
export class RedisModule implements OnApplicationShutdown {
  constructor(@Inject(REDIS_CLIENT) private readonly client: Redis) {}

  onApplicationShutdown(): void {
    this.client.disconnect();
  }
}
