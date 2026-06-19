import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { UniverseStatus } from '@prisma/client';
import { Job } from 'bullmq';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PROVISION_UNIVERSE_JOB, PROVISIONING_QUEUE } from '../queue/queue.constants';
import { ProvisioningService } from './provisioning.service';

/**
 * Worker BullMQ qui consomme les jobs de provisioning d'univers.
 */
@Processor(PROVISIONING_QUEUE)
export class ProvisioningProcessor extends WorkerHost {
  private readonly logger = new Logger(ProvisioningProcessor.name);

  constructor(
    private readonly provisioningService: ProvisioningService,
    private readonly prisma: PrismaService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name !== PROVISION_UNIVERSE_JOB) {
      this.logger.warn({ jobName: job.name }, 'Job de provisioning ignoré.');
      return;
    }

    this.logger.debug({ jobId: job.id }, "Démarrage du provisioning d'univers.");
    await this.provisioningService.provisionUniverse();
  }

  @OnWorkerEvent('failed')
  async onFailed(job: Job | undefined, error: Error): Promise<void> {
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
