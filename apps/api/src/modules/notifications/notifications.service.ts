import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Prisma, NotificationType as PrismaNotificationType } from '@prisma/client';
import { Queue } from 'bullmq';
import { NotificationType, NotificationView, UnreadCountView } from '@arborisis/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EventsGateway } from '../events/events.gateway';
import { NOTIFICATIONS_QUEUE, SEND_NOTIFICATION_JOB } from '../queue/queue.constants';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventsGateway,
    @InjectQueue(NOTIFICATIONS_QUEUE) private readonly queue: Queue,
  ) {}

  async create(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    data: Record<string, unknown> = {},
  ): Promise<void> {
    await this.prisma.notification.create({
      data: {
        userId,
        type: type as PrismaNotificationType,
        title,
        message,
        data: data as Prisma.InputJsonValue,
      },
    });
    this.events.emitToUser(userId, 'notification:new', { type });
  }

  async enqueue(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    data: Record<string, unknown> = {},
  ): Promise<void> {
    const payload: Prisma.NotificationCreateManyInput = {
      userId,
      type: type as PrismaNotificationType,
      title,
      message,
      data: data as Prisma.InputJsonValue,
    };
    await this.queue.add(SEND_NOTIFICATION_JOB, [payload], {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5_000 },
      removeOnComplete: true,
      removeOnFail: 50,
    });
  }

  async list(userId: string, limit = 50): Promise<NotificationView[]> {
    const rows = await this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return rows.map((n) => ({
      id: n.id,
      type: n.type as unknown as NotificationType,
      title: n.title,
      message: n.message,
      read: n.read,
      data: n.data as Record<string, unknown>,
      createdAt: n.createdAt.toISOString(),
    }));
  }

  async unreadCount(userId: string): Promise<UnreadCountView> {
    const count = await this.prisma.notification.count({
      where: { userId, read: false },
    });
    return { count };
  }

  async markRead(userId: string, id: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { id, userId },
      data: { read: true },
    });
  }

  async markAllRead(userId: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
  }

  async deleteOld(userId: string, keepCount = 100): Promise<void> {
    const old = await this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip: keepCount,
      select: { id: true },
    });
    if (old.length > 0) {
      await this.prisma.notification.deleteMany({
        where: { id: { in: old.map((n) => n.id) } },
      });
    }
  }
}
