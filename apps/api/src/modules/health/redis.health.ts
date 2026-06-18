import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HealthCheckError, HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';
import Redis from 'ioredis';
import type { Env } from '../../common/config/env';

@Injectable()
export class RedisHealthIndicator extends HealthIndicator implements OnModuleDestroy {
  private readonly client: Redis;

  constructor(config: ConfigService<Env, true>) {
    super();
    this.client = new Redis(config.get('REDIS_URL', { infer: true }), {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    });
  }

  async pingCheck(key: string): Promise<HealthIndicatorResult> {
    try {
      if (this.client.status !== 'ready') await this.client.connect();
      const pong = await this.client.ping();
      return this.getStatus(key, pong === 'PONG');
    } catch (error) {
      throw new HealthCheckError('Redis indisponible', this.getStatus(key, false, {
        message: (error as Error).message,
      }));
    }
  }

  async onModuleDestroy(): Promise<void> {
    this.client.disconnect();
  }
}
