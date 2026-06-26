import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { UniverseStatus } from '@prisma/client';
import { Job } from 'bullmq';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  PROVISION_UNIVERSE_JOB,
  PROVISIONING_QUEUE,
  RECONCILE_UNIVERSES_JOB,
} from '../queue/queue.constants';
import { ProvisioningService } from './provisioning.service';

/**
 * Worker BullMQ qui consomme les jobs de provisioning d'univers.
 */
@Processor(PROVISIONING_QUEUE, { concurrency: 2, lockDuration: 300_000 })
export class ProvisioningProcessor extends WorkerHost {
  private readonly logger = new Logger(ProvisioningProcessor.name);

  constructor(
    private readonly provisioningService: ProvisioningService,
    private readonly prisma: PrismaService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    switch (job.name) {
      case PROVISION_UNIVERSE_JOB:
        this.logger.debug({ jobId: job.id }, "Démarrage du provisioning d'univers.");
        await this.provisioningService.provisionUniverse();
        return;
      case RECONCILE_UNIVERSES_JOB:
        this.logger.debug({ jobId: job.id }, 'Réconciliation de la capacité des univers.');
        await this.provisioningService.reconcile();
        return;
      default:
        this.logger.warn({ jobName: job.name }, 'Job de provisioning ignoré.');
    }
  }

  @OnWorkerEvent('failed')
  async onFailed(job: Job | undefined, error: Error): Promise<void> {
    // Seul l'échec du provisioning doit marquer un univers FAILED ; un échec du
    // réconciliateur (lecture seule) ne doit pas toucher au statut des univers.
    if (job?.name !== PROVISION_UNIVERSE_JOB) {
      this.logger.warn({ jobId: job?.id, jobName: job?.name, err: error }, 'Job échoué.');
      return;
    }

    const attempts = job?.opts?.attempts ?? 1;
    const attemptsMade = job?.attemptsMade ?? 0;

    if (attemptsMade < attempts) {
      this.logger.warn(
        { jobId: job?.id, attemptsMade, attempts, err: error },
        'Tentative de provisioning échouée ; nouvelle tentative programmée.',
      );
      return;
    }

    this.logger.error(
      { jobId: job?.id, attemptsMade, err: error },
      "Provisioning échoué après toutes les tentatives ; passage de l'univers en FAILED.",
    );

    try {
      await this.prisma.universe.updateMany({
        where: { status: UniverseStatus.PROVISIONING },
        data: { status: UniverseStatus.FAILED },
      });
    } catch (updateError) {
      this.logger.error(
        { jobId: job?.id, err: updateError },
        "Impossible de marquer l'univers en FAILED.",
      );
    }
  }
}
