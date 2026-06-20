import { createHash } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { getCurrentUniverseId } from '../universe/universe-context';
import type { Env } from '../../common/config/env';
import {
  AntiCheatEventType,
  SHARED_IP_THRESHOLD,
  type AntiCheatSeverity,
} from './anticheat.constants';

export interface AntiCheatRecord {
  type: string;
  severity?: AntiCheatSeverity;
  userId?: string | null;
  universeId?: string | null;
  detail: Record<string, unknown>;
}

/**
 * Cœur de la couche anti-triche. **Découplé du gameplay** : aucune méthode ne
 * jette — un échec d'audit ne doit jamais bloquer une action légitime. Sert de
 * point d'entrée unique pour journaliser les anomalies (journal d'audit) et pour
 * la détection de comptes liés (multi-comptes / push) via empreinte IP hachée.
 */
@Injectable()
export class AntiCheatService {
  private readonly logger = new Logger(AntiCheatService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  /** Persiste une anomalie dans le journal d'audit (best-effort). */
  async record(event: AntiCheatRecord): Promise<void> {
    const severity = event.severity ?? 'WARN';
    try {
      await this.prisma.antiCheatEvent.create({
        data: {
          type: event.type,
          severity,
          userId: event.userId ?? null,
          universeId: event.universeId ?? getCurrentUniverseId() ?? null,
          detail: event.detail as Prisma.InputJsonValue,
        },
      });
    } catch (error) {
      this.logger.error(`Échec d'enregistrement anti-triche: ${(error as Error).message}`);
    }
    const line = `[anticheat:${event.type}] ${JSON.stringify(event.detail)}`;
    if (severity === 'CRITICAL') this.logger.error(line);
    else if (severity === 'WARN') this.logger.warn(line);
    else this.logger.log(line);
  }

  /**
   * Rattache une empreinte IP (hachée + poivrée) à un compte et signale si trop
   * de comptes distincts partagent la même IP dans le même univers. L'IP n'est
   * jamais stockée en clair. Best-effort.
   */
  async noteAccess(userId: string, ip: string | undefined, universeId?: string | null): Promise<void> {
    if (!ip) return;
    const ipHash = this.hashIp(ip);
    const scopedUniverse = universeId ?? getCurrentUniverseId() ?? null;
    try {
      await this.prisma.accountIpLink.upsert({
        where: { userId_ipHash: { userId, ipHash } },
        update: { lastSeenAt: new Date(), universeId: scopedUniverse },
        create: { userId, ipHash, universeId: scopedUniverse },
      });

      const links = await this.prisma.accountIpLink.findMany({
        where: { ipHash },
        select: { userId: true, universeId: true },
      });
      const sameUniverse = links.filter((l) => l.universeId === scopedUniverse);
      const distinct = new Set(sameUniverse.map((l) => l.userId));
      if (distinct.size >= SHARED_IP_THRESHOLD) {
        await this.record({
          type: AntiCheatEventType.SHARED_IP,
          severity: 'WARN',
          userId,
          universeId: scopedUniverse,
          detail: { ipHash, linkedAccounts: [...distinct], count: distinct.size },
        });
      }
    } catch (error) {
      this.logger.error(`Échec du suivi d'accès anti-triche: ${(error as Error).message}`);
    }
  }

  /** Hache une IP avec un poivre dérivé d'un secret serveur (non réversible). */
  hashIp(ip: string): string {
    const pepper = this.config.get('JWT_ACCESS_SECRET', { infer: true });
    return createHash('sha256').update(`${pepper}:${ip}`).digest('hex');
  }
}
