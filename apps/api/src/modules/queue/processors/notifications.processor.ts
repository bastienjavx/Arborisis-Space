import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { NOTIFICATIONS_QUEUE, SEND_NOTIFICATION_JOB } from '../queue.constants';

@Processor(NOTIFICATIONS_QUEUE, { concurrency: 10 })
export class NotificationsProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationsProcessor.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job<Prisma.NotificationCreateManyInput[]>): Promise<void> {
    if (job.name !== SEND_NOTIFICATION_JOB || !Array.isArray(job.data)) return;
    const inserted = await this.prisma.notification.createMany({
      data: job.data,
      skipDuplicates: true,
    });
    this.logger.debug(`Notifications insérées : ${inserted.count}`);
  }
}
