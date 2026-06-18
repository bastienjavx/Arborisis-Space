import { Injectable, Logger } from '@nestjs/common';
import { JobStatus } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { WorldFactoryService } from './world-factory.service';

/**
 * Finalise les jobs temporisés (construction, recherche, essaimage).
 * Toutes les méthodes sont IDEMPOTENTES et défensives : elles vérifient le
 * statut et l'échéance, de sorte qu'un worker BullMQ ET une finalisation
 * paresseuse (au moment d'une lecture) puissent coexister sans double effet.
 */
@Injectable()
export class FinalizationService {
  private readonly logger = new Logger(FinalizationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly worldFactory: WorldFactoryService,
  ) {}

  async finalizeConstruction(jobId: string, now = new Date()): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const job = await tx.constructionJob.findUnique({ where: { id: jobId } });
      if (!job || job.status !== JobStatus.PENDING || job.finishesAt > now) return;

      await tx.planetBuilding.update({
        where: { planetId_type: { planetId: job.planetId, type: job.buildingType } },
        data: { level: job.targetLevel },
      });
      await tx.constructionJob.update({
        where: { id: jobId },
        data: { status: JobStatus.COMPLETED },
      });
    });
  }

  async finalizeResearch(jobId: string, now = new Date()): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const job = await tx.researchJob.findUnique({ where: { id: jobId } });
      if (!job || job.status !== JobStatus.PENDING || job.finishesAt > now) return;

      await tx.researchLevel.update({
        where: { userId_type: { userId: job.userId, type: job.researchType } },
        data: { level: job.targetLevel },
      });
      await tx.researchJob.update({
        where: { id: jobId },
        data: { status: JobStatus.COMPLETED },
      });
    });
  }

  async finalizeColonization(jobId: string, now = new Date()): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const job = await tx.colonizationJob.findUnique({ where: { id: jobId } });
      if (!job || job.status !== JobStatus.PENDING || job.finishesAt > now) return;

      const occupied = await tx.planet.findUnique({
        where: {
          galaxy_system_position: {
            galaxy: job.targetGalaxy,
            system: job.targetSystem,
            position: job.targetPosition,
          },
        },
      });

      if (occupied) {
        // Emplacement pris entre-temps : essaimage annulé.
        await tx.colonizationJob.update({ where: { id: jobId }, data: { status: JobStatus.CANCELLED } });
        this.logger.warn(`Essaimage ${jobId} annulé : emplacement occupé.`);
        return;
      }

      await this.worldFactory.createColony(tx, job.userId, {
        galaxy: job.targetGalaxy,
        system: job.targetSystem,
        position: job.targetPosition,
      });
      await tx.colonizationJob.update({ where: { id: jobId }, data: { status: JobStatus.COMPLETED } });
    });
  }

  // ── Finalisation paresseuse (défensive, lors des lectures) ──

  async finalizeDueForPlanet(planetId: string, now = new Date()): Promise<void> {
    const due = await this.prisma.constructionJob.findMany({
      where: { planetId, status: JobStatus.PENDING, finishesAt: { lte: now } },
    });
    for (const job of due) await this.finalizeConstruction(job.id, now);
  }

  async finalizeDueResearchForUser(userId: string, now = new Date()): Promise<void> {
    const due = await this.prisma.researchJob.findMany({
      where: { userId, status: JobStatus.PENDING, finishesAt: { lte: now } },
    });
    for (const job of due) await this.finalizeResearch(job.id, now);
  }

  async finalizeDueColonizationForUser(userId: string, now = new Date()): Promise<void> {
    const due = await this.prisma.colonizationJob.findMany({
      where: { userId, status: JobStatus.PENDING, finishesAt: { lte: now } },
    });
    for (const job of due) await this.finalizeColonization(job.id, now);
  }

  /** Balayage de récupération au démarrage : finalise tout job échu. */
  async sweepAllDue(now = new Date()): Promise<void> {
    const [c, r, col] = await Promise.all([
      this.prisma.constructionJob.findMany({ where: { status: JobStatus.PENDING, finishesAt: { lte: now } } }),
      this.prisma.researchJob.findMany({ where: { status: JobStatus.PENDING, finishesAt: { lte: now } } }),
      this.prisma.colonizationJob.findMany({ where: { status: JobStatus.PENDING, finishesAt: { lte: now } } }),
    ]);
    for (const j of c) await this.finalizeConstruction(j.id, now);
    for (const j of r) await this.finalizeResearch(j.id, now);
    for (const j of col) await this.finalizeColonization(j.id, now);
    if (c.length + r.length + col.length > 0) {
      this.logger.log(`Balayage : ${c.length} construction(s), ${r.length} recherche(s), ${col.length} essaimage(s) finalisé(s).`);
    }
  }
}
