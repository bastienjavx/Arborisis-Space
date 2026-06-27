import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { JobStatus, TransferPhase } from '@prisma/client';
import { Queue, type JobsOptions } from 'bullmq';
import { randomUUID } from 'node:crypto';
import {
  COLONIZATION_QUEUE,
  CONSTRUCTION_QUEUE,
  EXPEDITION_QUEUE,
  FINALIZE_JOB,
  GAME_EVENT_QUEUE,
  MARKET_EXPIRY_QUEUE,
  MYCOSYNTH_TICK_INTERVAL_MS,
  MYCOSYNTH_TICK_JOB,
  NOTIFICATIONS_QUEUE,
  NPC_QUEUE,
  PRODUCTION_LINE_QUEUE,
  PVE_QUEUE,
  PVP_QUEUE,
  RESEARCH_QUEUE,
  SHIP_PRODUCTION_QUEUE,
  SPAWN_NPC_JOB,
  TRADE_ROUTE_QUEUE,
  TRANSFER_QUEUE,
  TRIGGER_EVENT_JOB,
  type FinalizeJobData,
} from './queue.constants';
import { getDefaultUniverseId } from '../../common/prisma/default-universe.helper';
import { NPC_SPAWN_INTERVAL_MS } from '@arborisis/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { getCurrentUniverseId } from '../universe/universe-context';

const RECONCILE_LOCK_TTL_MS = 300_000;
const RECONCILE_LOCK_KEY = 'boot:reconcile:lock';
const RECONCILE_CHUNK_SIZE = 100;

/**
 * Planifie la finalisation différée des jobs métier (construction, recherche,
 * essaimage) à leur échéance via BullMQ. La finalisation reste idempotente :
 * une lecture peut finaliser un job avant que le worker ne se déclenche.
 */
@Injectable()
export class GameQueueService {
  private readonly logger = new Logger(GameQueueService.name);

  constructor(
    @InjectQueue(CONSTRUCTION_QUEUE) private readonly construction: Queue<FinalizeJobData>,
    @InjectQueue(RESEARCH_QUEUE) private readonly research: Queue<FinalizeJobData>,
    @InjectQueue(COLONIZATION_QUEUE) private readonly colonization: Queue<FinalizeJobData>,
    @InjectQueue(SHIP_PRODUCTION_QUEUE) private readonly shipProduction: Queue<FinalizeJobData>,
    @InjectQueue(EXPEDITION_QUEUE) private readonly expedition: Queue<FinalizeJobData>,
    @InjectQueue(PVE_QUEUE) private readonly pve: Queue<FinalizeJobData>,
    @InjectQueue(PVP_QUEUE) private readonly pvp: Queue<FinalizeJobData>,
    @InjectQueue(GAME_EVENT_QUEUE) private readonly eventQueue: Queue,
    @InjectQueue(TRANSFER_QUEUE) private readonly transferQueue: Queue<FinalizeJobData>,
    @InjectQueue(MARKET_EXPIRY_QUEUE) private readonly marketExpiry: Queue,
    @InjectQueue(PRODUCTION_LINE_QUEUE) private readonly productionLine: Queue,
    @InjectQueue(TRADE_ROUTE_QUEUE) private readonly tradeRoute: Queue,
    @InjectQueue(NOTIFICATIONS_QUEUE) private readonly notificationsQueue: Queue,
    @InjectQueue(NPC_QUEUE) private readonly npcQueue: Queue,
    private readonly prisma: PrismaService,
  ) {}

  private delayFor(finishesAt: Date): number {
    return Math.max(0, finishesAt.getTime() - Date.now());
  }

  private opts(jobId: string, finishesAt: Date): JobsOptions {
    return {
      jobId,
      delay: this.delayFor(finishesAt),
      removeOnComplete: true,
      removeOnFail: 100,
      attempts: 3,
      backoff: { type: 'exponential', delay: 5_000 },
    };
  }

  async scheduleConstruction(jobId: string, finishesAt: Date): Promise<void> {
    await this.safeAdd(this.construction, jobId, finishesAt);
  }

  async scheduleResearch(jobId: string, finishesAt: Date): Promise<void> {
    await this.safeAdd(this.research, jobId, finishesAt);
  }

  async scheduleColonization(jobId: string, finishesAt: Date): Promise<void> {
    await this.safeAdd(this.colonization, jobId, finishesAt);
  }

  async scheduleShipProduction(jobId: string, finishesAt: Date): Promise<void> {
    await this.safeAdd(this.shipProduction, jobId, finishesAt);
  }

  async scheduleNextEvent(): Promise<void> {
    const delayMs = (4 + Math.random() * 4) * 3_600_000;
    const universeId = await this.resolveUniverseId();
    const dueSlot = Math.floor((Date.now() + delayMs) / 3_600_000);
    await this.safeAddEvent(
      TRIGGER_EVENT_JOB,
      { universeId },
      delayMs,
      `event-${universeId}-${dueSlot}`,
    );
  }

  async scheduleNextMycosynthTick(
    delayMs = MYCOSYNTH_TICK_INTERVAL_MS,
    singleton = false,
  ): Promise<void> {
    const universeId = await this.resolveUniverseId();
    const singletonId = `mycosynth-tick-${universeId}`;
    if (singleton) {
      const existing = await this.npcQueue.getJob(singletonId);
      const state = existing ? await existing.getState() : null;
      if (existing && (state === 'delayed' || state === 'waiting')) return;
      await this.safeAddToQueue(this.npcQueue, MYCOSYNTH_TICK_JOB, { universeId }, delayMs, singletonId);
      return;
    }
    const dueSlot = Math.floor((Date.now() + delayMs) / MYCOSYNTH_TICK_INTERVAL_MS);
    await this.safeAddToQueue(
      this.npcQueue,
      MYCOSYNTH_TICK_JOB,
      { universeId },
      delayMs,
      `${singletonId}-${dueSlot}`,
    );
  }

  async scheduleNextNpcSpawn(delayMs = NPC_SPAWN_INTERVAL_MS, singleton = false): Promise<void> {
    const universeId = await this.resolveUniverseId();
    const singletonId = `npc-spawn-${universeId}`;
    if (singleton) {
      const existing = await this.eventQueue.getJob(singletonId);
      const state = existing ? await existing.getState() : null;
      if (existing && (state === 'delayed' || state === 'waiting')) {
        return;
      }
      await this.safeAddEvent(SPAWN_NPC_JOB, { universeId }, delayMs, singletonId);
      return;
    }
    // Identifiant par fenêtre temporelle : évite les chaînes parallèles de spawns
    // tout en permettant au job actif de planifier la prochaine occurrence.
    const dueSlot = Math.floor((Date.now() + delayMs) / NPC_SPAWN_INTERVAL_MS);
    await this.safeAddEvent(SPAWN_NPC_JOB, { universeId }, delayMs, `${singletonId}-${dueSlot}`);
  }

  async scheduleTransfer(jobId: string, arrivesAt: Date): Promise<void> {
    await this.safeAdd(this.transferQueue, jobId, arrivesAt);
  }

  async scheduleExpedition(jobId: string, phase: string, finishesAt: Date): Promise<void> {
    // BullMQ interdit « : » dans les identifiants personnalisés.
    await this.safeAdd(this.expedition, jobId, finishesAt, `${jobId}-${phase}`);
  }

  async schedulePve(jobId: string, phase: string, finishesAt: Date): Promise<void> {
    await this.safeAdd(this.pve, jobId, finishesAt, `${jobId}-${phase}`);
  }

  async schedulePvp(jobId: string, phase: string, finishesAt: Date): Promise<void> {
    await this.safeAdd(this.pvp, jobId, finishesAt, `${jobId}-${phase}`);
  }

  async removeMarketExpiryJob(orderId: string): Promise<void> {
    await this.removeJobById(this.marketExpiry, `expire-${orderId}`);
  }

  async removeProductionLineJob(lineId: string, nextRunAt: Date): Promise<void> {
    await this.removeJobById(
      this.productionLine,
      `production-line-${lineId}-${nextRunAt.getTime()}`,
    );
  }

  async removeTradeRouteJob(routeId: string, nextRunAt: Date): Promise<void> {
    await this.removeJobById(this.tradeRoute, `route-${routeId}-${nextRunAt.getTime()}`);
  }

  async removeNotificationJob(jobId: string): Promise<void> {
    await this.removeJobById(this.notificationsQueue, jobId);
  }

  async reconcilePending(): Promise<void> {
    const redis = await this.construction.client;
    const owner = randomUUID();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const acquired = await (redis as any).set(
      RECONCILE_LOCK_KEY,
      owner,
      'NX',
      'PX',
      RECONCILE_LOCK_TTL_MS,
    );
    if (!acquired) {
      this.logger.log('reconcilePending ignoré : verrou détenu par un autre réplica.');
      return;
    }

    const refreshLock = async () => {
      try {
        await (redis as any).eval(
          'if redis.call("get", KEYS[1]) == ARGV[1] then return redis.call("pexpire", KEYS[1], ARGV[2]) else return 0 end',
          1,
          RECONCILE_LOCK_KEY,
          owner,
          String(RECONCILE_LOCK_TTL_MS),
        );
      } catch {
        // Le verrou expirera naturellement si le rafraîchissement échoue.
      }
    };

    try {
      const now = new Date();
      const universeId = await this.resolveUniverseId();

      const construction = await this.prisma.constructionJob.findMany({
        where: { status: JobStatus.PENDING },
      });
      const research = await this.prisma.researchJob.findMany({
        where: { status: JobStatus.PENDING },
      });
      const colonization = await this.prisma.colonizationJob.findMany({
        where: { status: JobStatus.PENDING },
      });
      const shipProduction = await this.prisma.shipProductionJob.findMany({
        where: { status: JobStatus.PENDING },
      });
      const outbound = await this.prisma.expeditionMission.findMany({
        where: { phase: 'OUTBOUND' },
      });
      const returning = await this.prisma.expeditionMission.findMany({
        where: { phase: 'RETURNING' },
      });
      const pveTravel = await this.prisma.pveMission.findMany({ where: { phase: 'TRAVEL' } });
      const pveCombat = await this.prisma.pveMission.findMany({ where: { phase: 'COMBAT' } });
      const pveReturning = await this.prisma.pveMission.findMany({ where: { phase: 'RETURNING' } });
      const pvpOutbound = await this.prisma.pvpMission.findMany({ where: { phase: 'OUTBOUND' } });
      const pvpReturning = await this.prisma.pvpMission.findMany({ where: { phase: 'RETURNING' } });
      const transfers = await this.prisma.resourceTransferMission.findMany({
        where: { phase: TransferPhase.OUTBOUND },
      });

      const jobFor = (jobId: string, finishesAt: Date) => ({
        name: FINALIZE_JOB,
        data: { jobId, universeId },
        opts: this.opts(jobId, finishesAt),
      });

      await this.addBulkInChunks(
        this.construction,
        construction.map((job) => jobFor(job.id, job.finishesAt)),
        refreshLock,
      );
      await this.addBulkInChunks(
        this.research,
        research.map((job) => jobFor(job.id, job.finishesAt)),
        refreshLock,
      );
      await this.addBulkInChunks(
        this.colonization,
        colonization.map((job) => jobFor(job.id, job.finishesAt)),
        refreshLock,
      );
      await this.addBulkInChunks(
        this.shipProduction,
        shipProduction.map((job) => jobFor(job.id, job.finishesAt)),
        refreshLock,
      );
      await this.addBulkInChunks(
        this.expedition,
        [
          ...outbound.map((mission) => jobFor(`${mission.id}-OUTBOUND`, mission.arrivesAt)),
          ...returning.map((mission) => jobFor(`${mission.id}-RETURNING`, mission.returnsAt)),
        ],
        refreshLock,
      );
      await this.addBulkInChunks(
        this.pve,
        [
          ...pveTravel.map((mission) => jobFor(`${mission.id}-TRAVEL`, mission.travelArrivesAt)),
          ...pveCombat.map((mission) => jobFor(`${mission.id}-COMBAT`, mission.combatEndsAt)),
          ...pveReturning.map((mission) => jobFor(`${mission.id}-RETURNING`, mission.returnsAt)),
        ],
        refreshLock,
      );
      await this.addBulkInChunks(
        this.pvp,
        [
          ...pvpOutbound.map((mission) => jobFor(`${mission.id}-OUTBOUND`, mission.arrivesAt)),
          ...pvpReturning.map((mission) => jobFor(`${mission.id}-RETURNING`, mission.returnsAt)),
        ],
        refreshLock,
      );
      await this.addBulkInChunks(
        this.transferQueue,
        transfers.map((mission) => jobFor(mission.id, mission.arrivesAt)),
        refreshLock,
      );

      await this.prisma.session.deleteMany({
        where: { OR: [{ expiresAt: { lte: now } }, { revokedAt: { not: null } }] },
      });

      const spawnJobId = `npc-spawn-${universeId}`;
      const spawnJob = await this.eventQueue.getJob(spawnJobId);
      if (!spawnJob) {
        await this.scheduleNextNpcSpawn(0, true);
      }
    } catch (error) {
      this.logger.error(error, 'Échec de la réconciliation des jobs en attente.');
    } finally {
      try {
        await (redis as any).eval(
          'if redis.call("get", KEYS[1]) == ARGV[1] then return redis.call("del", KEYS[1]) else return 0 end',
          1,
          RECONCILE_LOCK_KEY,
          owner,
        );
      } catch {
        // Ignorer ; le verrou expirera.
      }
    }
  }

  private async resolveUniverseId(): Promise<string> {
    const current = getCurrentUniverseId();
    if (current !== undefined && current.length > 0) {
      return current;
    }
    return getDefaultUniverseId(this.prisma);
  }

  async runWithDistributedLock<T>(
    lockKey: string,
    ttlMs: number,
    task: () => Promise<T>,
  ): Promise<T | undefined> {
    const redis = await this.construction.client;
    const owner = randomUUID();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const acquired = await (redis as any).set(lockKey, owner, 'NX', 'PX', ttlMs);
    if (!acquired) return undefined;

    try {
      return await task();
    } finally {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (redis as any).eval(
          'if redis.call("get", KEYS[1]) == ARGV[1] then return redis.call("del", KEYS[1]) else return 0 end',
          1,
          lockKey,
          owner,
        );
      } catch {
        // Ignorer ; le verrou expirera.
      }
    }
  }

  private async safeAdd(
    queue: Queue<FinalizeJobData>,
    jobId: string,
    finishesAt: Date,
    queueJobId = jobId,
  ): Promise<void> {
    try {
      const universeId = await this.resolveUniverseId();
      await queue.add(FINALIZE_JOB, { jobId, universeId }, this.opts(queueJobId, finishesAt));
    } catch (error) {
      this.logger.error(
        { err: error, queue: queue.name, jobId },
        'Planification BullMQ impossible ; le réconciliateur réessaiera.',
      );
    }
  }

  private async safeAddEvent(
    name: string,
    data: unknown,
    delayMs: number,
    jobId?: string,
  ): Promise<void> {
    await this.safeAddToQueue(this.eventQueue, name, data, delayMs, jobId);
  }

  private async safeAddToQueue(
    queue: Queue,
    name: string,
    data: unknown,
    delayMs: number,
    jobId?: string,
  ): Promise<void> {
    try {
      await queue.add(name, data, {
        ...(jobId ? { jobId } : {}),
        delay: delayMs,
        removeOnComplete: true,
        removeOnFail: 10,
        attempts: 3,
        backoff: { type: 'exponential' as const, delay: 5_000 },
      });
    } catch (error) {
      this.logger.debug(
        { err: error, queue: queue.name, name, jobId },
        'Job déjà planifié ou erreur de duplication.',
      );
    }
  }

  private async removeJobById(queue: Queue, jobId: string): Promise<void> {
    try {
      const job = await queue.getJob(jobId);
      if (job) await job.remove();
    } catch (error) {
      this.logger.warn({ err: error, queue: queue.name, jobId }, 'Impossible de supprimer le job.');
    }
  }

  private async addBulkInChunks<T>(
    queue: Queue<T>,
    jobs: { name: string; data: T; opts: JobsOptions }[],
    refreshLock: () => Promise<void>,
    chunkSize = RECONCILE_CHUNK_SIZE,
  ): Promise<void> {
    for (let i = 0; i < jobs.length; i += chunkSize) {
      const chunk = jobs.slice(i, i + chunkSize);
      if (chunk.length === 0) continue;
      try {
        await queue.addBulk(chunk as never);
      } catch (error) {
        this.logger.error(
          { err: error, queue: queue.name },
          'Échec addBulk ; les jobs seront récupérés au prochain cycle.',
        );
      }
      await refreshLock();
    }
  }
}
