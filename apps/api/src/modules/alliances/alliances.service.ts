import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AllianceRole as PrismaAllianceRole,
  ApplicationStatus as PrismaApplicationStatus,
  Prisma,
} from '@prisma/client';
import type {
  AllianceApplicationView,
  AllianceDetailView,
  AllianceMemberView,
  AllianceView,
  ApplyAllianceDto,
  AuthUser,
  CreateAllianceDto,
  DecideApplicationDto,
} from '@arborisis/shared';
import {
  AllianceRole,
  ALLIANCE_CREATION_COST,
  ApplicationStatus,
  canAfford,
  RaceType,
} from '@arborisis/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { GameEngineService } from '../game/game-engine.service';

interface UserWithScore {
  planets: { buildings: { level: number }[]; ships: { quantity: number }[] }[];
  researchLevels: { level: number }[];
  expeditionReports: { id: string }[];
}

const userScoreInclude = {
  planets: {
    select: {
      buildings: { select: { level: true } },
      ships: { select: { quantity: true } },
    },
  },
  researchLevels: { select: { level: true } },
  expeditionReports: { select: { id: true } },
} as const;

@Injectable()
export class AlliancesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly engine: GameEngineService,
  ) {}

  async create(user: AuthUser, dto: CreateAllianceDto): Promise<AllianceView> {
    const existing = await this.prisma.allianceMember.findUnique({
      where: { userId: user.id },
      include: { alliance: true },
    });
    if (existing) {
      throw new ConflictException('Vous appartenez déjà à une alliance.');
    }

    const tagTaken = await this.prisma.alliance.findUnique({ where: { tag: dto.tag } });
    if (tagTaken) throw new ConflictException('Ce tag est déjà utilisé.');

    const homeworld = await this.prisma.planet.findFirst({
      where: { ownerId: user.id, isHomeworld: true },
    });
    if (!homeworld) throw new NotFoundException('Noyau-Monde introuvable.');

    const settled = await this.engine.settlePlanet(homeworld.id);
    const resources = this.engine.buildResourceState(settled);
    if (!canAfford(resources.amounts, ALLIANCE_CREATION_COST)) {
      throw new BadRequestException('Ressources insuffisantes pour fonder une alliance.');
    }

    const alliance = await this.prisma.optimistic(async (tx) => {
      const settledTx = await this.engine.settlePlanet(homeworld.id, new Date(), tx);
      const resTx = this.engine.buildResourceState(settledTx);
      if (!canAfford(resTx.amounts, ALLIANCE_CREATION_COST)) {
        throw new BadRequestException('Ressources insuffisantes pour fonder une alliance.');
      }
      await this.engine.spend(homeworld.id, ALLIANCE_CREATION_COST, tx, settledTx.planet.version);

      const created = await tx.alliance.create({
        data: {
          tag: dto.tag,
          name: dto.name,
          description: dto.description ?? null,
          bannerColor: dto.bannerColor ?? '#22c55e',
          leaderId: user.id,
        },
      });

      await tx.allianceMember.create({
        data: {
          allianceId: created.id,
          userId: user.id,
          role: PrismaAllianceRole.LEADER,
        },
      });

      return created;
    });

    return this.toAllianceView(alliance.id);
  }

  async myAlliance(userId: string): Promise<AllianceDetailView | null> {
    const membership = await this.prisma.allianceMember.findUnique({
      where: { userId },
    });
    if (!membership) return null;
    return this.getDetail(userId, membership.allianceId);
  }

  async search(search?: string): Promise<AllianceView[]> {
    const where: Prisma.AllianceWhereInput = search
      ? {
          OR: [
            { tag: { contains: search, mode: 'insensitive' } },
            { name: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};

    const alliances = await this.prisma.alliance.findMany({
      where,
      include: { members: { include: { user: { include: userScoreInclude } } } },
      orderBy: { createdAt: 'desc' },
    });

    return alliances.map((a) => this.mapAllianceWithMembers(a));
  }

  async getDetail(userId: string, allianceId: string): Promise<AllianceDetailView> {
    const alliance = await this.prisma.alliance.findUnique({
      where: { id: allianceId },
      include: {
        members: { include: { user: { include: userScoreInclude } } },
        applications: {
          where: { status: PrismaApplicationStatus.PENDING },
          include: { user: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!alliance) throw new NotFoundException('Alliance introuvable.');

    const membership = await this.prisma.allianceMember.findUnique({
      where: { userId },
    });
    const canSeeApplications =
      membership?.allianceId === alliance.id &&
      (membership.role === PrismaAllianceRole.LEADER ||
        membership.role === PrismaAllianceRole.OFFICER);

    return {
      ...this.mapAllianceWithMembers(alliance),
      members: alliance.members.map((m) => this.mapMember(m)),
      applications: canSeeApplications
        ? alliance.applications.map((app) => this.mapApplication(app))
        : undefined,
    };
  }

  async apply(userId: string, allianceId: string, dto: ApplyAllianceDto): Promise<void> {
    const membership = await this.prisma.allianceMember.findUnique({ where: { userId } });
    if (membership) throw new ConflictException('Vous appartenez déjà à une alliance.');

    const alliance = await this.prisma.alliance.findUnique({ where: { id: allianceId } });
    if (!alliance) throw new NotFoundException('Alliance introuvable.');

    try {
      await this.prisma.allianceApplication.create({
        data: {
          allianceId,
          userId,
          message: dto.message ?? null,
        },
      });
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException('Vous avez déjà une candidature active pour cette alliance.');
      }
      throw error;
    }
  }

  async listApplications(userId: string): Promise<AllianceApplicationView[]> {
    const membership = await this.requireOfficerOrLeader(userId);

    const applications = await this.prisma.allianceApplication.findMany({
      where: { allianceId: membership.allianceId, status: PrismaApplicationStatus.PENDING },
      include: { user: true },
      orderBy: { createdAt: 'asc' },
    });

    return applications.map((app) => this.mapApplication(app));
  }

  async decideApplication(
    userId: string,
    applicationId: string,
    dto: DecideApplicationDto,
  ): Promise<void> {
    const membership = await this.requireOfficerOrLeader(userId);

    await this.prisma.serializable(async (tx) => {
      const application = await tx.allianceApplication.findUnique({
        where: { id: applicationId },
      });
      if (!application || application.allianceId !== membership.allianceId) {
        throw new NotFoundException('Candidature introuvable.');
      }
      if (application.status !== PrismaApplicationStatus.PENDING) {
        throw new ConflictException('Cette candidature a déjà été traitée.');
      }

      if (dto.decision === 'ACCEPT') {
        const alreadyMember = await tx.allianceMember.findUnique({
          where: { userId: application.userId },
        });
        if (alreadyMember) {
          await tx.allianceApplication.update({
            where: { id: applicationId },
            data: { status: PrismaApplicationStatus.REJECTED },
          });
          throw new ConflictException('Le joueur a rejoint une autre alliance entre-temps.');
        }

        await tx.allianceApplication.update({
          where: { id: applicationId },
          data: { status: PrismaApplicationStatus.ACCEPTED },
        });
        await tx.allianceMember.create({
          data: {
            allianceId: membership.allianceId,
            userId: application.userId,
            role: PrismaAllianceRole.MEMBER,
          },
        });
      } else {
        await tx.allianceApplication.update({
          where: { id: applicationId },
          data: { status: PrismaApplicationStatus.REJECTED },
        });
      }
    });
  }

  async leave(userId: string): Promise<void> {
    const membership = await this.prisma.allianceMember.findUnique({
      where: { userId },
      include: { alliance: true },
    });
    if (!membership) throw new BadRequestException("Vous n'appartenez à aucune alliance.");
    if (membership.role === PrismaAllianceRole.LEADER) {
      throw new ForbiddenException(
        'Le chef doit transférer son leadership ou dissoudre l’alliance.',
      );
    }

    await this.prisma.allianceMember.delete({ where: { id: membership.id } });
  }

  async kick(userId: string, allianceId: string, targetUserId: string): Promise<void> {
    const membership = await this.requireOfficerOrLeader(userId);
    if (membership.allianceId !== allianceId) {
      throw new ForbiddenException("Cette alliance n'est pas la vôtre.");
    }

    const target = await this.prisma.allianceMember.findUnique({
      where: { userId: targetUserId },
    });
    if (!target || target.allianceId !== allianceId) {
      throw new NotFoundException('Membre introuvable.');
    }
    if (target.role === PrismaAllianceRole.LEADER) {
      throw new ForbiddenException('Le chef ne peut pas être expulsé.');
    }
    if (
      membership.role === PrismaAllianceRole.OFFICER &&
      target.role === PrismaAllianceRole.OFFICER
    ) {
      throw new ForbiddenException('Un officier ne peut pas expulser un autre officier.');
    }

    await this.prisma.allianceMember.delete({ where: { id: target.id } });
  }

  async promote(userId: string, allianceId: string, targetUserId: string): Promise<void> {
    const membership = await this.prisma.allianceMember.findUnique({ where: { userId } });
    if (!membership || membership.allianceId !== allianceId) {
      throw new ForbiddenException("Vous n'appartenez pas à cette alliance.");
    }

    const target = await this.prisma.allianceMember.findUnique({
      where: { userId: targetUserId },
    });
    if (!target || target.allianceId !== allianceId) {
      throw new NotFoundException('Membre introuvable.');
    }

    if (target.role === PrismaAllianceRole.MEMBER) {
      if (
        membership.role !== PrismaAllianceRole.LEADER &&
        membership.role !== PrismaAllianceRole.OFFICER
      ) {
        throw new ForbiddenException('Seuls les chefs et officiers peuvent promouvoir un membre.');
      }
      await this.prisma.allianceMember.update({
        where: { id: target.id },
        data: { role: PrismaAllianceRole.OFFICER },
      });
    } else if (target.role === PrismaAllianceRole.OFFICER) {
      if (membership.role !== PrismaAllianceRole.LEADER) {
        throw new ForbiddenException('Seul le chef peut nommer un successeur.');
      }
      await this.prisma.serializable(async (tx) => {
        await tx.allianceMember.update({
          where: { id: target.id },
          data: { role: PrismaAllianceRole.LEADER },
        });
        await tx.allianceMember.update({
          where: { id: membership.id },
          data: { role: PrismaAllianceRole.OFFICER },
        });
        await tx.alliance.update({
          where: { id: allianceId },
          data: { leaderId: target.userId },
        });
      });
    } else {
      throw new BadRequestException('Impossible de promouvoir ce membre.');
    }
  }

  async demote(userId: string, allianceId: string, targetUserId: string): Promise<void> {
    const membership = await this.prisma.allianceMember.findUnique({ where: { userId } });
    if (!membership || membership.allianceId !== allianceId) {
      throw new ForbiddenException("Vous n'appartenez pas à cette alliance.");
    }

    const target = await this.prisma.allianceMember.findUnique({
      where: { userId: targetUserId },
    });
    if (!target || target.allianceId !== allianceId) {
      throw new NotFoundException('Membre introuvable.');
    }
    if (target.role === PrismaAllianceRole.LEADER) {
      throw new ForbiddenException('Le chef ne peut pas être rétrogradé.');
    }
    if (target.role === PrismaAllianceRole.MEMBER) {
      throw new BadRequestException('Ce membre est déjà au rang le plus bas.');
    }

    if (membership.role === PrismaAllianceRole.OFFICER) {
      throw new ForbiddenException('Un officier ne peut pas rétrograder un autre officier.');
    }

    await this.prisma.allianceMember.update({
      where: { id: target.id },
      data: { role: PrismaAllianceRole.MEMBER },
    });
  }

  async disband(userId: string, allianceId: string): Promise<void> {
    const membership = await this.prisma.allianceMember.findUnique({
      where: { userId },
      include: { alliance: true },
    });
    if (!membership || membership.allianceId !== allianceId) {
      throw new ForbiddenException("Vous n'appartenez pas à cette alliance.");
    }
    if (membership.role !== PrismaAllianceRole.LEADER) {
      throw new ForbiddenException('Seul le chef peut dissoudre l’alliance.');
    }

    await this.prisma.alliance.delete({ where: { id: allianceId } });
  }

  private async requireOfficerOrLeader(userId: string) {
    const membership = await this.prisma.allianceMember.findUnique({ where: { userId } });
    if (!membership) throw new ForbiddenException("Vous n'appartenez à aucune alliance.");
    if (membership.role === PrismaAllianceRole.MEMBER) {
      throw new ForbiddenException('Seuls les chefs et officiers peuvent gérer les candidatures.');
    }
    return membership;
  }

  private async toAllianceView(allianceId: string): Promise<AllianceView> {
    const alliance = await this.prisma.alliance.findUnique({
      where: { id: allianceId },
      include: { members: { include: { user: { include: userScoreInclude } } } },
    });
    if (!alliance) throw new NotFoundException('Alliance introuvable.');
    return this.mapAllianceWithMembers(alliance);
  }

  private mapAllianceWithMembers(
    alliance: Prisma.AllianceGetPayload<{
      include: { members: { include: { user: { include: typeof userScoreInclude } } } };
    }>,
  ): AllianceView {
    const totalScore = alliance.members.reduce(
      (sum, m) => sum + this.userScore(m.user as unknown as UserWithScore),
      0,
    );
    return {
      id: alliance.id,
      tag: alliance.tag,
      name: alliance.name,
      description: alliance.description,
      bannerColor: alliance.bannerColor,
      leaderId: alliance.leaderId,
      memberCount: alliance.members.length,
      totalScore,
    };
  }

  private mapMember(
    member: Prisma.AllianceMemberGetPayload<{ include: { user: true } }>,
  ): AllianceMemberView {
    return {
      userId: member.userId,
      username: member.user.username,
      displayName: member.user.displayName,
      race: member.user.race as RaceType,
      role: member.role as AllianceRole,
      joinedAt: member.joinedAt.toISOString(),
    };
  }

  private mapApplication(
    application: Prisma.AllianceApplicationGetPayload<{ include: { user: true } }>,
  ): AllianceApplicationView {
    return {
      id: application.id,
      userId: application.userId,
      username: application.user.username,
      message: application.message,
      status: application.status as ApplicationStatus,
      createdAt: application.createdAt.toISOString(),
    };
  }

  private userScore(user: {
    planets: { buildings: { level: number }[]; ships: { quantity: number }[] }[];
    researchLevels: { level: number }[];
    expeditionReports: { id: string }[];
  }): number {
    const buildingScore = user.planets
      .flatMap((p) => p.buildings)
      .reduce((sum, b) => sum + b.level * 10, 0);
    const researchScore = user.researchLevels.reduce((sum, r) => sum + r.level * 100, 0);
    const colonies = user.planets.length;
    const ships = user.planets.flatMap((p) => p.ships).reduce((sum, s) => sum + s.quantity, 0);
    return (
      buildingScore +
      researchScore +
      colonies * 500 +
      ships * 5 +
      user.expeditionReports.length * 20
    );
  }

  private isUniqueViolation(error: unknown): boolean {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
  }
}
