import { Global, Module, OnModuleInit } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { RedisCacheService } from '../redis/redis-cache.service';
import { setDefaultUniverseCache } from './default-universe.helper';

@Global()
@Module({
  providers: [
    PrismaService,
    {
      provide: 'DefaultUniverseCacheInit',
      useFactory: (cache: RedisCacheService) => {
        setDefaultUniverseCache(cache);
        return {};
      },
      inject: [RedisCacheService],
    },
  ],
  exports: [PrismaService],
})
export class PrismaModule implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    await this.prisma.$connect();
  }
}
