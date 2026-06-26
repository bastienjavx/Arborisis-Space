import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { Env } from '../config/env';

/**
 * Cache Redis générique pour les données de jeu quasi-statiques
 * (événement galactique, univers par défaut, recherches).
 *
 * TTL court avec invalidation explicite ; en cas d'indisponibilité de Redis,
 * le service retombe silencieusement sur la base de données.
 */
@Injectable()
export class RedisCacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisCacheService.name);
  private client?: Redis;
  private enabled = false;

  constructor(private readonly config: ConfigService<Env, true>) {}

  async onModuleInit(): Promise<void> {
    const url = this.config.get('REDIS_URL', { infer: true });
    try {
      this.client = new Redis(url, {
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
        lazyConnect: true,
      });
      await this.client.connect();
      this.enabled = true;
      this.logger.log('Cache Redis connecté.');
    } catch (error) {
      this.logger.warn(
        { err: error },
        'Connexion Redis impossible ; le cache est désactivé et les appels retomberont sur la DB.',
      );
      this.enabled = false;
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.client?.quit().catch(() => void 0);
  }

  private key(namespace: string, id: string): string {
    return `arborisis:${namespace}:${id}`;
  }

  async get<T>(namespace: string, id: string): Promise<T | null> {
    if (!this.enabled || !this.client) return null;
    try {
      const raw = await this.client.get(this.key(namespace, id));
      if (!raw) return null;
      return JSON.parse(raw) as T;
    } catch (error) {
      this.logger.warn({ err: error }, 'Échec lecture cache Redis');
      return null;
    }
  }

  async set<T>(namespace: string, id: string, value: T, ttlSeconds: number): Promise<void> {
    if (!this.enabled || !this.client) return;
    try {
      await this.client.setex(
        this.key(namespace, id),
        Math.max(1, ttlSeconds),
        JSON.stringify(value),
      );
    } catch (error) {
      this.logger.warn({ err: error }, 'Échec écriture cache Redis');
    }
  }

  async del(namespace: string, id: string): Promise<void> {
    if (!this.enabled || !this.client) return;
    try {
      await this.client.del(this.key(namespace, id));
    } catch (error) {
      this.logger.warn({ err: error }, 'Échec suppression cache Redis');
    }
  }

  async getOrLoad<T>(
    namespace: string,
    id: string,
    loader: () => Promise<T | null>,
    ttlSeconds: number,
  ): Promise<T | null> {
    const cached = await this.get<T>(namespace, id);
    if (cached !== null) return cached;
    const value = await loader();
    if (value !== null) {
      await this.set(namespace, id, value, ttlSeconds);
    }
    return value;
  }
}
