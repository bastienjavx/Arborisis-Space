import { Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, type Universe, UniverseStatus } from '@prisma/client';
import type {
  CreateUniverseDto,
  ListUniversesView,
  UniverseSummaryView,
  UniverseView,
} from '@arborisis/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { Env } from '../../common/config/env';

const DEFAULT_UNIVERSE_SLUG = 'default';

@Injectable()
export class UniverseService implements OnApplicationBootstrap {
  private readonly logger = new Logger(UniverseService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  /**
   * Réaligne l'`internalApiUrl` de l'univers par défaut sur `API_INTERNAL_URL`.
   * La migration insère un placeholder `http://localhost:4000` : en production ce
   * placeholder ferait échouer le proxy web. Réconciliation idempotente au boot.
   */
  async onApplicationBootstrap(): Promise<void> {
    const internalApiUrl = this.config.get('API_INTERNAL_URL', { infer: true });
    if (!internalApiUrl) return;

    try {
      const universe = await this.prisma.universe.findUnique({
        where: { slug: DEFAULT_UNIVERSE_SLUG },
      });
      if (!universe || universe.internalApiUrl === internalApiUrl) return;

      await this.prisma.universe.update({
        where: { slug: DEFAULT_UNIVERSE_SLUG },
        data: { internalApiUrl },
      });
      this.logger.log(
        `Univers par défaut réaligné : internalApiUrl = ${internalApiUrl} (était ${universe.internalApiUrl}).`,
      );
    } catch (error) {
      this.logger.warn(
        `Échec du réalignement de l'univers par défaut : ${(error as Error).message}`,
      );
    }
  }

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

  /**
   * Indique si l'univers a franchi le seuil de pré-provisioning (par défaut 90 %).
   * À ce stade on prépare un nouveau node AVANT la saturation totale, afin qu'il
   * soit chaud et `ACTIVE` quand le dernier emplacement est consommé.
   */
  shouldProvision(universe: Pick<Universe, 'playerCount' | 'maxPlayers'>): boolean {
    const threshold = this.config.get('UNIVERSE_PROVISION_THRESHOLD', { infer: true });
    return universe.playerCount >= universe.maxPlayers * threshold;
  }

  /**
   * Sélectionne l'univers `ACTIVE` le plus ancien disposant encore d'un emplacement
   * libre (stratégie *fill-then-spill* : on densifie les mondes les plus anciens).
   * Verrou `FOR UPDATE SKIP LOCKED` pour éviter qu'une inscription concurrente ne
   * dépasse `maxPlayers`. Retourne `null` si tous les univers actifs sont pleins.
   *
   * À utiliser DANS une transaction (`tx`) qui incrémente ensuite `playerCount`.
   */
  async pickAvailableUniverse(tx: Prisma.TransactionClient): Promise<Universe | null> {
    const rows = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM "universes"
      WHERE status = ${UniverseStatus.ACTIVE}::"UniverseStatus"
        AND "playerCount" < "maxPlayers"
      ORDER BY "createdAt" ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    `;
    const picked = rows[0];
    if (!picked) return null;
    return tx.universe.findUnique({ where: { id: picked.id } });
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
