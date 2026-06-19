import { Injectable, NotFoundException } from '@nestjs/common';
import type { AuthUser, PublicProfile, UpdateProfileDto } from '@arborisis/shared';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<AuthUser> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        displayName: dto.displayName ?? undefined,
        bio: dto.bio ?? undefined,
        bannerColor: dto.bannerColor ?? undefined,
        avatarSeed: dto.avatarSeed ?? undefined,
      },
    });
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role as AuthUser['role'],
      race: user.race as AuthUser['race'],
      universeId: user.universeId,
      displayName: user.displayName,
      bannerColor: user.bannerColor,
      avatarSeed: user.avatarSeed,
      totpEnabled: user.totpEnabled,
    };
  }

  async getPublicProfile(userId: string): Promise<PublicProfile> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        _count: { select: { planets: true } },
        planets: { select: { _count: { select: { ships: true } } } },
        allianceMembership: { include: { alliance: true } },
      },
    });
    if (!user) throw new NotFoundException('Utilisateur introuvable.');

    const totalShips = user.planets.reduce((sum, planet) => sum + planet._count.ships, 0);

    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      race: user.race as PublicProfile['race'],
      bannerColor: user.bannerColor,
      bio: user.bio,
      allianceTag: user.allianceMembership?.alliance.tag ?? null,
      allianceName: user.allianceMembership?.alliance.name ?? null,
      colonies: user._count.planets,
      totalShips,
      score: 0,
    };
  }
}
