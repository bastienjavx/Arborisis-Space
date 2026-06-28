import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';

export async function requireModerator(prisma: PrismaService, userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, universeId: true },
  });
  if (!user) throw new NotFoundException('Utilisateur introuvable.');
  if (user.role !== UserRole.ADMIN && user.role !== UserRole.MODERATOR) {
    throw new ForbiddenException('Accès réservé à la modération.');
  }
  return user;
}

export async function requireAdmin(prisma: PrismaService, userId: string) {
  const user = await requireModerator(prisma, userId);
  if (user.role !== UserRole.ADMIN) {
    throw new ForbiddenException('Accès réservé aux administrateurs.');
  }
  return user;
}
