import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { JobStatus } from '@prisma/client';
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
  TRIGGER_EVENT_JOB,
  type FinalizeJobData,
} from './queue.constants';
import { PrismaService } from '../../common/prisma/prisma.service';
import { getActiveUniverseId } from '../../common/prisma/universe-scope.storage';

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
    await this.eventQueue.add(
      TRIGGER_EVENT_JOB,
      {},
      {
        delay: delayMs,
        removeOnComplete: true,
        removeOnFail: 10,
        attempts: 3,
        backoff: { type: 'exponential' as const, delay: 5_000 },
      },
    );
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
    ]);
  }

  private async safeAdd(
    queue: Queue<FinalizeJobData>,
    jobId: string,
    finishesAt: Date,
    queueJobId = jobId,
  ): Promise<void> {
    try {
      const universeId = getActiveUniverseId() ?? 'default';
      await queue.add(FINALIZE_JOB, { jobId, universeId }, this.opts(queueJobId, finishesAt));
    } catch (error) {
      this.logger.error(
        { err: error, queue: queue.name, jobId },
        'Planification BullMQ impossible ; le réconciliateur réessaiera.',
      );
    }
  }
}
