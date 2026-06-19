import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { JobStatus, TransferPhase } from '@prisma/client';
import { Queue } from 'bullmq';
import {
  COLONIZATION_QUEUE,
  CONSTRUCTION_QUEUE,
  EXPEDITION_QUEUE,
  FINALIZE_JOB,
  GAME_EVENT_QUEUE,
  PVE_QUEUE,
  PVP_QUEUE,
  RESEARCH_QUEUE,
  SHIP_PRODUCTION_QUEUE,
  SPAWN_NPC_JOB,
  TRANSFER_QUEUE,
  TRIGGER_EVENT_JOB,
  type FinalizeJobData,
} from './queue.constants';
import { getDefaultUniverseId } from '../../common/prisma/default-universe.helper';
import { NPC_SPAWN_INTERVAL_MS } from '@arborisis/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { getCurrentUniverseId } from '../universe/universe-context';

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
    private readonly prisma: PrismaService,
  ) {}

  private delayFor(finishesAt: Date): number {
    return Math.max(0, finishesAt.getTime() - Date.now());
  }

  private opts(jobId: string, finishesAt: Date) {
    return {
      // jobId stable → déduplication, pas de double planification.
      jobId,
      delay: this.delayFor(finishesAt),
      removeOnComplete: true,
      removeOnFail: 100,
      attempts: 3,
      backoff: { type: 'exponential' as const, delay: 5_000 },
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
    await this.eventQueue.add(
      TRIGGER_EVENT_JOB,
      { universeId },
      {
        delay: delayMs,
        removeOnComplete: true,
        removeOnFail: 10,
        attempts: 3,
        backoff: { type: 'exponential' as const, delay: 5_000 },
      },
    );
  }

  async scheduleNextNpcSpawn(delayMs = NPC_SPAWN_INTERVAL_MS): Promise<void> {
    const universeId = await this.resolveUniverseId();
    await this.eventQueue.add(
      SPAWN_NPC_JOB,
      { universeId },
      {
        delay: delayMs,
        removeOnComplete: true,
        removeOnFail: 10,
        attempts: 3,
        backoff: { type: 'exponential' as const, delay: 5_000 },
      },
    );
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

  async reconcilePending(): Promise<void> {
    const now = new Date();
    const [
      construction,
      research,
      colonization,
      shipProduction,
      outbound,
      returning,
      pveTravel,
      pveCombat,
      pveReturning,
      pvpOutbound,
      pvpReturning,
      transfers,
    ] = await Promise.all([
      this.prisma.constructionJob.findMany({ where: { status: JobStatus.PENDING } }),
      this.prisma.researchJob.findMany({ where: { status: JobStatus.PENDING } }),
      this.prisma.colonizationJob.findMany({ where: { status: JobStatus.PENDING } }),
      this.prisma.shipProductionJob.findMany({ where: { status: JobStatus.PENDING } }),
      this.prisma.expeditionMission.findMany({ where: { phase: 'OUTBOUND' } }),
      this.prisma.expeditionMission.findMany({ where: { phase: 'RETURNING' } }),
      this.prisma.pveMission.findMany({ where: { phase: 'TRAVEL' } }),
      this.prisma.pveMission.findMany({ where: { phase: 'COMBAT' } }),
      this.prisma.pveMission.findMany({ where: { phase: 'RETURNING' } }),
      this.prisma.pvpMission.findMany({ where: { phase: 'OUTBOUND' } }),
      this.prisma.pvpMission.findMany({ where: { phase: 'RETURNING' } }),
      this.prisma.resourceTransferMission.findMany({ where: { phase: TransferPhase.OUTBOUND } }),
      this.prisma.session.deleteMany({
        where: { OR: [{ expiresAt: { lte: now } }, { revokedAt: { not: null } }] },
      }),
    ]);
    await Promise.all([
      ...construction.map((job) => this.safeAdd(this.construction, job.id, job.finishesAt)),
      ...research.map((job) => this.safeAdd(this.research, job.id, job.finishesAt)),
      ...colonization.map((job) => this.safeAdd(this.colonization, job.id, job.finishesAt)),
      ...shipProduction.map((job) => this.safeAdd(this.shipProduction, job.id, job.finishesAt)),
      ...outbound.map((mission) =>
        this.safeAdd(this.expedition, mission.id, mission.arrivesAt, `${mission.id}-OUTBOUND`),
      ),
      ...returning.map((mission) =>
        this.safeAdd(this.expedition, mission.id, mission.returnsAt, `${mission.id}-RETURNING`),
      ),
      ...pveTravel.map((mission) =>
        this.safeAdd(this.pve, mission.id, mission.travelArrivesAt, `${mission.id}-TRAVEL`),
      ),
      ...pveCombat.map((mission) =>
        this.safeAdd(this.pve, mission.id, mission.combatEndsAt, `${mission.id}-COMBAT`),
      ),
      ...pveReturning.map((mission) =>
        this.safeAdd(this.pve, mission.id, mission.returnsAt, `${mission.id}-RETURNING`),
      ),
      ...pvpOutbound.map((mission) =>
        this.safeAdd(this.pvp, mission.id, mission.arrivesAt, `${mission.id}-OUTBOUND`),
      ),
      ...pvpReturning.map((mission) =>
        this.safeAdd(this.pvp, mission.id, mission.returnsAt, `${mission.id}-RETURNING`),
      ),
      ...transfers.map((mission) =>
        this.safeAdd(this.transferQueue, mission.id, mission.arrivesAt),
      ),
    ]);

    // S'assure qu'un job de spawn NPC est toujours planifié.
    const eventJobs = await this.eventQueue.getJobs(['delayed', 'wait']);
    const hasSpawnJob = eventJobs.some((job) => job.name === SPAWN_NPC_JOB);
    if (!hasSpawnJob) {
      await this.scheduleNextNpcSpawn(0);
    }
  }

  private async resolveUniverseId(): Promise<string> {
    const current = getCurrentUniverseId();
    if (current !== undefined && current.length > 0) {
      return current;
    }
    return getDefaultUniverseId(this.prisma);
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
}
