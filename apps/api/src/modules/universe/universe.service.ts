import { Injectable } from '@nestjs/common';
import { Prisma, type Universe, UniverseStatus } from '@prisma/client';
import type {
  CreateUniverseDto,
  ListUniversesView,
  UniverseSummaryView,
  UniverseView,
} from '@arborisis/shared';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class UniverseService {
  constructor(private readonly prisma: PrismaService) {}

  async listActive(): Promise<ListUniversesView> {
    const rows = await this.prisma.universe.findMany({
      where: {
        status: {
          in: [UniverseStatus.ACTIVE, UniverseStatus.PROVISIONING],
        },
      },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((u) => this.toSummaryView(u));
  }

  async findById(id: string): Promise<Universe | null> {
    return this.prisma.universe.findUnique({ where: { id } });
  }

  async findBySlug(slug: string): Promise<Universe | null> {
    return this.prisma.universe.findUnique({ where: { slug } });
  }

  async incrementPlayerCount(tx: Prisma.TransactionClient, universeId: string): Promise<Universe> {
    return tx.universe.update({
      where: { id: universeId },
      data: { playerCount: { increment: 1 } },
    });
  }

  isSaturated(universe: Pick<Universe, 'playerCount' | 'maxPlayers'>): boolean {
    return universe.playerCount >= universe.maxPlayers;
  }

  async create(dto: CreateUniverseDto): Promise<Universe> {
    return this.prisma.universe.create({
      data: {
        slug: dto.slug,
        name: dto.name,
        internalApiUrl: dto.internalApiUrl,
        maxPlayers: dto.maxPlayers,
        status: UniverseStatus.ACTIVE,
      },
    });
  }

  toSummaryView(universe: Universe): UniverseSummaryView {
    return {
      id: universe.id,
      slug: universe.slug,
      name: universe.name,
      playerCount: universe.playerCount,
      maxPlayers: universe.maxPlayers,
      status: universe.status as UniverseSummaryView['status'],
    };
  }

  toView(universe: Universe): UniverseView {
    return {
      ...this.toSummaryView(universe),
      internalApiUrl: universe.internalApiUrl,
      createdAt: universe.createdAt.toISOString(),
    };
  }
}
