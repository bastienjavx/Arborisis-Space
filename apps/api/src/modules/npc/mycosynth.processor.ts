import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { PrismaService } from '../../common/prisma/prisma.service';
import { GameQueueService } from '../queue/game-queue.service';
import { runWithUniverse } from '../queue/processors/run-with-universe';
import { MYCOSYNTH_TICK_JOB, NPC_QUEUE } from '../queue/queue.constants';
import { MycosynthService } from './mycosynth.service';

@Processor(NPC_QUEUE, { concurrency: 1 })
export class MycosynthProcessor extends WorkerHost {
  private readonly logger = new Logger(MycosynthProcessor.name);

  constructor(
    private readonly mycosynth: MycosynthService,
    private readonly queue: GameQueueService,
    private readonly prisma: PrismaService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name !== MYCOSYNTH_TICK_JOB) return;

    try {
      await runWithUniverse(this.prisma, job.data.universeId, async () => {
        await this.mycosynth.tick(job.data.universeId as string);
      });
    } finally {
      // Planifier le prochain tick en chaîne, même si le tick courant échoue,
      // pour éviter que l'IA MYCOSYNTH ne s'arrête après une erreur.
      await this.queue
        .scheduleNextMycosynthTick(undefined, true)
        .catch((e: unknown) =>
          this.logger.warn({ err: e }, 'Impossible de planifier le prochain tick MYCOSYNTH'),
        );
    }
  }
}
