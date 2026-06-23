import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DiplomaticOfferStatus as PrismaDiplomaticOfferStatus,
  DiplomaticStatus as PrismaDiplomaticStatus,
} from '@prisma/client';
import type {
  AuthUser,
  CreateDiplomaticOfferDto,
  DecideDiplomaticOfferDto,
  DiplomaticOfferView,
  DiplomaticRelationView,
} from '@arborisis/shared';
import { DiplomaticOfferStatus, DiplomaticStatus } from '@arborisis/shared';
import { PrismaService } from '../../common/prisma/prisma.service';

const OFFER_EXPIRY_HOURS = 72;

@Injectable()
export class DiplomacyService {
  constructor(private readonly prisma: PrismaService) {}

  private async getMyAlliance(userId: string) {
    const member = await this.prisma.allianceMember.findUnique({
      where: { userId },
      include: { alliance: true },
    });
    if (!member) throw new ForbiddenException("Vous ne faites pas partie d'une alliance.");
    return member;
  }

  async getRelations(user: AuthUser): Promise<DiplomaticRelationView[]> {
    const member = await this.getMyAlliance(user.id);
    const allianceId = member.allianceId;

    const relations = await this.prisma.diplomaticRelation.findMany({
      where: {
        OR: [{ alliance1Id: allianceId }, { alliance2Id: allianceId }],
      },
    });

    const otherIds = relations.map((r) =>
      r.alliance1Id === allianceId ? r.alliance2Id : r.alliance1Id,
    );

    const alliances = await this.prisma.alliance.findMany({
      where: { id: { in: otherIds } },
    });
    const allianceMap = new Map(alliances.map((a) => [a.id, a]));

    return relations.map((r) => {
      const otherId = r.alliance1Id === allianceId ? r.alliance2Id : r.alliance1Id;
      const other = allianceMap.get(otherId);
      return {
        id: r.id,
        allianceId: otherId,
        allianceName: other?.name ?? '?',
        allianceTag: other?.tag ?? '?',
        allianceBannerColor: other?.bannerColor ?? '#22c55e',
        status: r.status as unknown as DiplomaticStatus,
        startedAt: r.startedAt.toISOString(),
        expiresAt: r.expiresAt?.toISOString() ?? null,
      };
    });
  }

  async getOffers(user: AuthUser): Promise<DiplomaticOfferView[]> {
    const member = await this.getMyAlliance(user.id);
    const allianceId = member.allianceId;

    const offers = await this.prisma.diplomaticOffer.findMany({
      where: {
        OR: [{ fromAllianceId: allianceId }, { toAllianceId: allianceId }],
        status: PrismaDiplomaticOfferStatus.PENDING,
        expiresAt: { gt: new Date() },
      },
    });

    const ids = [...new Set([...offers.map((o) => o.fromAllianceId), ...offers.map((o) => o.toAllianceId)])];
    const alliances = await this.prisma.alliance.findMany({ where: { id: { in: ids } } });
    const allianceMap = new Map(alliances.map((a) => [a.id, a]));

    return offers.map((o) => {
      const from = allianceMap.get(o.fromAllianceId);
      const to = allianceMap.get(o.toAllianceId);
      return {
        id: o.id,
        fromAllianceId: o.fromAllianceId,
        fromAllianceName: from?.name ?? '?',
        fromAllianceTag: from?.tag ?? '?',
        fromAllianceBannerColor: from?.bannerColor ?? '#22c55e',
        toAllianceId: o.toAllianceId,
        toAllianceName: to?.name ?? '?',
        toAllianceTag: to?.tag ?? '?',
        proposedStatus: o.proposedStatus as unknown as DiplomaticStatus,
        message: o.message,
        status: o.status as unknown as DiplomaticOfferStatus,
        createdAt: o.createdAt.toISOString(),
        expiresAt: o.expiresAt.toISOString(),
      };
    });
  }

  async createOffer(user: AuthUser, dto: CreateDiplomaticOfferDto): Promise<DiplomaticOfferView> {
    const member = await this.getMyAlliance(user.id);
    if (member.role === 'MEMBER') {
      throw new ForbiddenException('Seuls les officiers et le chef peuvent faire des offres.');
    }
    const fromAllianceId = member.allianceId;

    if (dto.toAllianceId === fromAllianceId) {
      throw new BadRequestException('Impossible de faire une offre à sa propre alliance.');
    }

    const target = await this.prisma.alliance.findUnique({ where: { id: dto.toAllianceId } });
    if (!target) throw new NotFoundException('Alliance cible introuvable.');

    const existing = await this.prisma.diplomaticOffer.findFirst({
      where: {
        OR: [
          { fromAllianceId, toAllianceId: dto.toAllianceId },
          { fromAllianceId: dto.toAllianceId, toAllianceId: fromAllianceId },
        ],
        status: PrismaDiplomaticOfferStatus.PENDING,
      },
    });
    if (existing) throw new ConflictException('Une offre diplomatique est déjà en cours.');

    const universe = await this.prisma.universe.findFirst({ orderBy: { createdAt: 'asc' } });
    const universeId = universe?.id ?? 'default';
    const expiresAt = new Date(Date.now() + OFFER_EXPIRY_HOURS * 3600 * 1000);
    const offer = await this.prisma.diplomaticOffer.create({
      data: {
        universeId,
        fromAllianceId,
        toAllianceId: dto.toAllianceId,
        proposedStatus: dto.proposedStatus as PrismaDiplomaticStatus,
        message: dto.message ?? null,
        expiresAt,
      },
    });

    const from = member.alliance;
    return {
      id: offer.id,
      fromAllianceId,
      fromAllianceName: from.name,
      fromAllianceTag: from.tag,
      fromAllianceBannerColor: from.bannerColor,
      toAllianceId: dto.toAllianceId,
      toAllianceName: target.name,
      toAllianceTag: target.tag,
      proposedStatus: dto.proposedStatus,
      message: offer.message,
      status: DiplomaticOfferStatus.PENDING,
      createdAt: offer.createdAt.toISOString(),
      expiresAt: offer.expiresAt.toISOString(),
    };
  }

  async decideOffer(
    user: AuthUser,
    offerId: string,
    dto: DecideDiplomaticOfferDto,
  ): Promise<void> {
    const member = await this.getMyAlliance(user.id);
    if (member.role === 'MEMBER') {
      throw new ForbiddenException('Seuls les officiers et le chef peuvent répondre aux offres.');
    }

    const offer = await this.prisma.diplomaticOffer.findUnique({ where: { id: offerId } });
    if (!offer || offer.status !== PrismaDiplomaticOfferStatus.PENDING) {
      throw new NotFoundException('Offre introuvable ou déjà traitée.');
    }
    if (offer.toAllianceId !== member.allianceId) {
      throw new ForbiddenException('Cette offre ne vous est pas destinée.');
    }

    if (!dto.accept) {
      await this.prisma.diplomaticOffer.update({
        where: { id: offerId },
        data: { status: PrismaDiplomaticOfferStatus.REJECTED },
      });
      return;
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.diplomaticOffer.update({
        where: { id: offerId },
        data: { status: PrismaDiplomaticOfferStatus.ACCEPTED },
      });

      const sorted = [offer.fromAllianceId, offer.toAllianceId].sort();
      const id1 = sorted[0]!;
      const id2 = sorted[1]!;
      const univ = await tx.universe.findFirst({ orderBy: { createdAt: 'asc' } });
      await tx.diplomaticRelation.upsert({
        where: { alliance1Id_alliance2Id: { alliance1Id: id1, alliance2Id: id2 } },
        create: {
          universeId: univ?.id ?? offer.universeId,
          alliance1Id: id1,
          alliance2Id: id2,
          status: offer.proposedStatus,
        },
        update: { status: offer.proposedStatus },
      });
    });
  }

  async withdrawOffer(user: AuthUser, offerId: string): Promise<void> {
    const member = await this.getMyAlliance(user.id);
    const offer = await this.prisma.diplomaticOffer.findUnique({ where: { id: offerId } });
    if (!offer || offer.fromAllianceId !== member.allianceId) {
      throw new ForbiddenException('Offre introuvable ou non autorisée.');
    }
    await this.prisma.diplomaticOffer.update({
      where: { id: offerId },
      data: { status: PrismaDiplomaticOfferStatus.WITHDRAWN },
    });
  }

  async breakRelation(user: AuthUser, relationId: string): Promise<void> {
    const member = await this.getMyAlliance(user.id);
    if (member.role === 'MEMBER') {
      throw new ForbiddenException('Seuls les officiers et le chef peuvent rompre les relations.');
    }

    const rel = await this.prisma.diplomaticRelation.findUnique({ where: { id: relationId } });
    if (
      !rel ||
      (rel.alliance1Id !== member.allianceId && rel.alliance2Id !== member.allianceId)
    ) {
      throw new NotFoundException('Relation introuvable.');
    }

    if (rel.status === PrismaDiplomaticStatus.WAR) {
      await this.prisma.diplomaticRelation.delete({ where: { id: relationId } });
    } else {
      await this.prisma.diplomaticRelation.update({
        where: { id: relationId },
        data: { status: PrismaDiplomaticStatus.WAR },
      });
    }
  }
}
