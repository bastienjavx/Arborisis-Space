import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ChatScope as PrismaChatScope, ModerationActionType, UserRole } from '@prisma/client';
import type { ChatContactView, ChatMessageView, SendChatMessageDto } from '@arborisis/shared';
import { ChatScope } from '@arborisis/shared';
import { PrismaService } from '../../common/prisma/prisma.service';

const authorSelect = {
  id: true,
  username: true,
  displayName: true,
  role: true,
  race: true,
  bannerColor: true,
} as const;

@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string, scope: ChatScope, peerId?: string): Promise<ChatMessageView[]> {
    const user = await this.viewer(userId);
    const where = await this.scopeWhere(user, scope, peerId);
    const messages = await this.prisma.chatMessage.findMany({
      where,
      include: { author: { select: authorSelect } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return messages.reverse().map((message) => this.toView(message));
  }

  async send(userId: string, dto: SendChatMessageDto): Promise<ChatMessageView> {
    const user = await this.viewer(userId);
    if (user.mutedUntil && user.mutedUntil > new Date()) {
      throw new ForbiddenException(`Vous êtes muet jusqu'au ${user.mutedUntil.toISOString()}.`);
    }

    let allianceId: string | null = null;
    let recipientId: string | null = null;
    if (dto.scope === ChatScope.ALLIANCE) {
      allianceId = user.allianceMembership?.allianceId ?? null;
      if (!allianceId) throw new ForbiddenException('Vous devez appartenir à une alliance.');
    }
    if (dto.scope === ChatScope.PRIVATE) {
      if (dto.recipientId === userId) {
        throw new BadRequestException('Vous ne pouvez pas vous écrire à vous-même.');
      }
      const recipient = await this.prisma.user.findFirst({
        where: { id: dto.recipientId, universeId: user.universeId },
        select: { id: true },
      });
      if (!recipient) throw new NotFoundException('Destinataire introuvable.');
      recipientId = recipient.id;
    }

    const message = await this.prisma.chatMessage.create({
      data: {
        universeId: user.universeId,
        authorId: userId,
        scope: dto.scope as PrismaChatScope,
        allianceId,
        recipientId,
        content: dto.content,
      },
      include: { author: { select: authorSelect } },
    });
    return this.toView(message);
  }

  async contacts(userId: string, search = ''): Promise<ChatContactView[]> {
    const user = await this.viewer(userId);
    const users = await this.prisma.user.findMany({
      where: {
        universeId: user.universeId,
        id: { not: userId },
        ...(search
          ? {
              OR: [
                { username: { contains: search, mode: 'insensitive' as const } },
                { displayName: { contains: search, mode: 'insensitive' as const } },
              ],
            }
          : {}),
      },
      select: { ...authorSelect, mutedUntil: true },
      orderBy: { username: 'asc' },
      take: 30,
    });
    return users.map((contact) => ({
      ...contact,
      role: contact.role as ChatContactView['role'],
      race: contact.race as ChatContactView['race'],
      mutedUntil: contact.mutedUntil?.toISOString() ?? null,
    }));
  }

  async remove(userId: string, messageId: string, reason?: string): Promise<void> {
    const [actor, message] = await Promise.all([
      this.viewer(userId),
      this.prisma.chatMessage.findUnique({ where: { id: messageId } }),
    ]);
    if (!message || message.universeId !== actor.universeId) {
      throw new NotFoundException('Message introuvable.');
    }
    const isModerator = actor.role === UserRole.ADMIN || actor.role === UserRole.MODERATOR;
    if (message.authorId !== userId && !isModerator) {
      throw new ForbiddenException('Action réservée à la modération.');
    }
    if (message.deletedAt) return;

    await this.prisma.$transaction(async (tx) => {
      await tx.chatMessage.update({
        where: { id: messageId },
        data: { deletedAt: new Date(), deletedById: userId },
      });
      if (isModerator && message.authorId !== userId) {
        await tx.moderationAction.create({
          data: {
            universeId: actor.universeId,
            moderatorId: userId,
            targetUserId: message.authorId,
            messageId,
            action: ModerationActionType.DELETE_MESSAGE,
            reason: reason?.trim() || null,
          },
        });
      }
    });
  }

  private async viewer(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { allianceMembership: true },
    });
    if (!user) throw new NotFoundException('Utilisateur introuvable.');
    return user;
  }

  private async scopeWhere(
    user: Awaited<ReturnType<ChatService['viewer']>>,
    scope: ChatScope,
    peerId?: string,
  ) {
    if (scope === ChatScope.GLOBAL) {
      return { universeId: user.universeId, scope: PrismaChatScope.GLOBAL };
    }
    if (scope === ChatScope.ALLIANCE) {
      const allianceId = user.allianceMembership?.allianceId;
      if (!allianceId) throw new ForbiddenException('Vous devez appartenir à une alliance.');
      return { universeId: user.universeId, scope: PrismaChatScope.ALLIANCE, allianceId };
    }
    if (!peerId) throw new BadRequestException('Sélectionnez un correspondant.');
    const peer = await this.prisma.user.findFirst({
      where: { id: peerId, universeId: user.universeId },
      select: { id: true },
    });
    if (!peer) throw new NotFoundException('Correspondant introuvable.');
    return {
      universeId: user.universeId,
      scope: PrismaChatScope.PRIVATE,
      OR: [
        { authorId: user.id, recipientId: peerId },
        { authorId: peerId, recipientId: user.id },
      ],
    };
  }

  private toView(message: {
    id: string;
    scope: PrismaChatScope;
    content: string;
    recipientId: string | null;
    allianceId: string | null;
    createdAt: Date;
    deletedAt: Date | null;
    author: {
      id: string;
      username: string;
      displayName: string | null;
      role: UserRole;
      race: string;
      bannerColor: string | null;
    };
  }): ChatMessageView {
    return {
      id: message.id,
      scope: message.scope as ChatScope,
      content: message.deletedAt ? 'Message supprimé par la modération.' : message.content,
      author: {
        ...message.author,
        role: message.author.role as ChatMessageView['author']['role'],
        race: message.author.race as ChatMessageView['author']['race'],
      },
      recipientId: message.recipientId,
      allianceId: message.allianceId,
      createdAt: message.createdAt.toISOString(),
      deletedAt: message.deletedAt?.toISOString() ?? null,
    };
  }
}
