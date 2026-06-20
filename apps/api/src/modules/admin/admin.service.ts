import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ModerationActionType, UserRole } from '@prisma/client';
import type {
  AdminUserView,
  ChangeUserRoleDto,
  ModerateUserDto,
  ModerationActionView,
} from '@arborisis/shared';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async users(actorId: string, search = ''): Promise<AdminUserView[]> {
    const actor = await this.requireModerator(actorId);
    const users = await this.prisma.user.findMany({
      where: {
        universeId: actor.universeId,
        ...(search
          ? {
              OR: [
                { username: { contains: search, mode: 'insensitive' as const } },
                { displayName: { contains: search, mode: 'insensitive' as const } },
                { email: { contains: search, mode: 'insensitive' as const } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        email: true,
        role: true,
        race: true,
        bannerColor: true,
        title: true,
        mutedUntil: true,
        createdAt: true,
      },
      orderBy: [{ role: 'desc' }, { username: 'asc' }],
      take: 100,
    });
    return users.map((user) => ({
      ...user,
      role: user.role as AdminUserView['role'],
      race: user.race as AdminUserView['race'],
      mutedUntil: user.mutedUntil?.toISOString() ?? null,
      createdAt: user.createdAt.toISOString(),
    }));
  }

  async changeRole(actorId: string, targetId: string, dto: ChangeUserRoleDto): Promise<void> {
    const actor = await this.requireAdmin(actorId);
    const target = await this.targetInUniverse(targetId, actor.universeId);
    if (target.role === UserRole.ADMIN) {
      throw new ForbiddenException('Le rôle d’un administrateur ne peut pas être modifié ici.');
    }
    const nextRole = dto.role as UserRole;
    if (target.role === nextRole) return;
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: targetId }, data: { role: nextRole } }),
      this.prisma.moderationAction.create({
        data: {
          universeId: actor.universeId,
          moderatorId: actorId,
          targetUserId: targetId,
          action: ModerationActionType.ROLE_CHANGE,
          reason: `${target.role} → ${nextRole}`,
        },
      }),
    ]);
  }

  async moderate(actorId: string, targetId: string, dto: ModerateUserDto): Promise<void> {
    const actor = await this.requireModerator(actorId);
    const target = await this.targetInUniverse(targetId, actor.universeId);
    if (
      target.role === UserRole.ADMIN ||
      (target.role === UserRole.MODERATOR && actor.role !== UserRole.ADMIN)
    ) {
      throw new ForbiddenException('Vous ne pouvez pas modérer cet utilisateur.');
    }
    const mutedUntil = dto.mutedUntil ? new Date(dto.mutedUntil) : null;
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: targetId }, data: { mutedUntil } }),
      this.prisma.moderationAction.create({
        data: {
          universeId: actor.universeId,
          moderatorId: actorId,
          targetUserId: targetId,
          action: mutedUntil ? ModerationActionType.MUTE : ModerationActionType.UNMUTE,
          reason: dto.reason?.trim() || null,
        },
      }),
    ]);
  }

  async actions(actorId: string): Promise<ModerationActionView[]> {
    const actor = await this.requireModerator(actorId);
    const actions = await this.prisma.moderationAction.findMany({
      where: { universeId: actor.universeId },
      include: {
        moderator: { select: { id: true, username: true, displayName: true } },
        targetUser: { select: { id: true, username: true, displayName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return actions.map((action) => ({
      id: action.id,
      action: action.action as ModerationActionView['action'],
      moderator: action.moderator,
      target: action.targetUser,
      messageId: action.messageId,
      reason: action.reason,
      createdAt: action.createdAt.toISOString(),
    }));
  }

  private async requireModerator(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Utilisateur introuvable.');
    if (user.role !== UserRole.ADMIN && user.role !== UserRole.MODERATOR) {
      throw new ForbiddenException('Accès réservé à la modération.');
    }
    return user;
  }

  private async requireAdmin(userId: string) {
    const user = await this.requireModerator(userId);
    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Accès réservé aux administrateurs.');
    }
    return user;
  }

  private async targetInUniverse(userId: string, universeId: string) {
    const user = await this.prisma.user.findFirst({ where: { id: userId, universeId } });
    if (!user) throw new NotFoundException('Utilisateur introuvable.');
    return user;
  }
}
