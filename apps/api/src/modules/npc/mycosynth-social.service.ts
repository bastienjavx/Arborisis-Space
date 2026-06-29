import { Injectable, Logger } from '@nestjs/common';
import {
  DiplomaticOfferStatus as PrismaDiplomaticOfferStatus,
  DiplomaticStatus as PrismaDiplomaticStatus,
  Prisma,
  UserRole,
} from '@prisma/client';
import {
  ChatScope,
  DiplomaticStatus,
  MYCOSYNTH_BRAIN_CONFIG,
  NpcActionLogStatus,
  NpcActionType,
  NpcArchetype,
  NpcMood,
  SHIPS,
  ShipRole,
  ShipType,
  type AuthUser,
  type NpcTraitVector,
} from '@arborisis/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ChatService } from '../chat/chat.service';
import { DiplomacyService } from '../diplomacy/diplomacy.service';
import { decideOfferResponse, proposeDiplomacy, type AllianceCandidate } from './npc-diplomacy';
import { composeLine, NpcChatEvent } from './npc-chat';
import { getRelation, totalThreat, type NpcMemoryState } from './npc-memory';

/**
 * Couche sociale des bots MYCOSYNTH : diplomatie (réponses aux offres, pactes,
 * alliances commerciales, déclarations de guerre) et chat (taunts, recrutement,
 * annonces). Branchée sur `thinkForBot`, elle est cadencée par un cooldown
 * propre (anti-spam) stocké dans `NpcProfile.goalProgress.lastSocialAt`.
 *
 * Rappel : la diplomatie du jeu est alliance↔alliance ; un bot doit donc être
 * membre d'une alliance (amorcées par `MycosynthService.ensureBotAlliances`).
 * Les décisions pures vivent dans `npc-diplomacy.ts` / `npc-chat.ts`.
 */

/** Contexte minimal passé par le service principal (découplage de BotSnapshot). */
export interface SocialContext {
  userId: string;
  username: string;
  universeId: string;
  archetype: NpcArchetype;
  traits: NpcTraitVector;
  mood: NpcMood;
  memory: NpcMemoryState;
}

const COMBAT_ROLES = [ShipRole.COMBAT, ShipRole.DEFENSE, ShipRole.SUPPORT];

@Injectable()
export class MycosynthSocialService {
  private readonly logger = new Logger(MycosynthSocialService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly chat: ChatService,
    private readonly diplomacy: DiplomacyService,
  ) {}

  /** Point d'entrée : au plus une initiative sociale par bot et par cooldown. */
  async maybeAct(ctx: SocialContext): Promise<void> {
    const membership = await this.prisma.allianceMember.findUnique({
      where: { userId: ctx.userId },
      select: { allianceId: true, role: true },
    });
    if (!membership) return; // pas d'alliance → pas de diplomatie possible

    const profile = await this.prisma.npcProfile.findUnique({
      where: { userId: ctx.userId },
      select: { goalProgress: true },
    });
    const progress = parseProgress(profile?.goalProgress);
    const now = new Date();
    const intervalMs = MYCOSYNTH_BRAIN_CONFIG.social.actionIntervalHours * 3_600_000;
    if (progress.lastSocialAt && now.getTime() - progress.lastSocialAt.getTime() < intervalMs) {
      return;
    }

    try {
      const acted =
        (await this.handleIncomingOffer(ctx, membership.allianceId)) ||
        (await this.handleProactive(ctx, membership.allianceId));
      if (!acted) await this.maybeTaunt(ctx);
    } catch (err) {
      this.logger.debug({ err }, `Action sociale ignorée pour ${ctx.username}`);
    } finally {
      await this.touchCooldown(ctx.userId, progress, now);
    }
  }

  // ─────────────────────────── Diplomatie réactive ───────────────────────────

  /** Répond à l'offre en attente la plus ancienne, le cas échéant. */
  private async handleIncomingOffer(ctx: SocialContext, myAllianceId: string): Promise<boolean> {
    const offer = await this.prisma.diplomaticOffer.findFirst({
      where: {
        toAllianceId: myAllianceId,
        status: PrismaDiplomaticOfferStatus.PENDING,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'asc' },
      select: { id: true, fromAllianceId: true, proposedStatus: true },
    });
    if (!offer) return false;

    const [myPower, theirPower, fromMembers, fromName] = await Promise.all([
      this.alliancePower(myAllianceId),
      this.alliancePower(offer.fromAllianceId),
      this.allianceMemberIds(offer.fromAllianceId),
      this.allianceName(offer.fromAllianceId),
    ]);

    const decision = decideOfferResponse({
      proposedStatus: offer.proposedStatus as unknown as DiplomaticStatus,
      myAlliancePower: myPower,
      theirAlliancePower: theirPower,
      traits: ctx.traits,
      mood: ctx.mood,
      grudgeToward: grudgeTowardMembers(ctx.memory, fromMembers),
    });

    await this.diplomacy.decideOffer(authUser(ctx), offer.id, { accept: decision.accept });
    await this.log(ctx, NpcActionType.DIPLOMATIC_RESPONSE, NpcActionLogStatus.SUCCESS, {
      offerId: offer.id,
      fromAllianceId: offer.fromAllianceId,
      proposedStatus: offer.proposedStatus,
      accept: decision.accept,
      reason: decision.reason,
    });

    await this.say(
      ctx,
      decision.accept ? NpcChatEvent.OFFER_ACCEPTED : NpcChatEvent.OFFER_REJECTED,
      ChatScope.GLOBAL,
      { target: fromName },
    );
    return true;
  }

  // ────────────────────────── Diplomatie proactive ───────────────────────────

  /** Émet au plus une initiative : guerre, NAP ou alliance commerciale. */
  private async handleProactive(ctx: SocialContext, myAllianceId: string): Promise<boolean> {
    const myPower = await this.alliancePower(myAllianceId);
    const candidates = await this.buildCandidates(ctx, myAllianceId);
    const intent = proposeDiplomacy({
      myAlliancePower: myPower,
      traits: ctx.traits,
      mood: ctx.mood,
      totalThreat: totalThreat(ctx.memory),
      candidates,
    });
    if (!intent) return false;

    const targetName = await this.allianceName(intent.targetAllianceId);

    if (intent.kind === 'WAR') {
      await this.declareWar(ctx, myAllianceId, intent.targetAllianceId);
      await this.log(ctx, NpcActionType.WAR_DECLARATION, NpcActionLogStatus.SUCCESS, {
        targetAllianceId: intent.targetAllianceId,
        reason: intent.reason,
      });
      await this.say(ctx, NpcChatEvent.WAR_DECLARED, ChatScope.GLOBAL, { target: targetName });
      return true;
    }

    try {
      await this.diplomacy.createOffer(authUser(ctx), {
        toAllianceId: intent.targetAllianceId,
        proposedStatus: intent.status,
        message: composeLine(
          NpcChatEvent.RECRUIT,
          ctx.archetype,
          { alliance: targetName },
          ctx.userId,
        ),
      });
      await this.log(ctx, NpcActionType.DIPLOMATIC_OFFER, NpcActionLogStatus.SUCCESS, {
        toAllianceId: intent.targetAllianceId,
        proposedStatus: intent.status,
        reason: intent.reason,
      });
      return true;
    } catch {
      // Conflit probable (offre déjà en cours) : on n'insiste pas ce tick.
      return false;
    }
  }

  /** Pose (ou bascule en) relation WAR avec l'alliance cible. */
  private async declareWar(
    ctx: SocialContext,
    myAllianceId: string,
    targetAllianceId: string,
  ): Promise<void> {
    const [a, b] = [myAllianceId, targetAllianceId].sort();
    await this.prisma.diplomaticRelation.upsert({
      where: { alliance1Id_alliance2Id: { alliance1Id: a!, alliance2Id: b! } },
      create: {
        universeId: ctx.universeId,
        alliance1Id: a!,
        alliance2Id: b!,
        status: PrismaDiplomaticStatus.WAR,
      },
      update: { status: PrismaDiplomaticStatus.WAR },
    });
  }

  // ──────────────────────────────── Chat ─────────────────────────────────────

  /** Taunt d'ambiance occasionnel, gated par la sociabilité de l'archétype. */
  private async maybeTaunt(ctx: SocialContext): Promise<void> {
    const cfg = MYCOSYNTH_BRAIN_CONFIG.social;
    const sociability = cfg.sociability[ctx.archetype] ?? 0.5;
    const event =
      ctx.mood === NpcMood.THREATENED || ctx.mood === NpcMood.VENGEFUL
        ? NpcChatEvent.THREATENED_WARNING
        : NpcChatEvent.RAID_TAUNT;
    // Tirage déterministe par fenêtre horaire pour éviter le spam tout en variant.
    const window = Math.floor(Date.now() / 3_600_000);
    const roll = (hash(`${ctx.userId}:taunt:${window}`) % 1000) / 1000;
    if (roll > sociability * cfg.chatTauntChance) return;
    await this.say(ctx, event, ChatScope.GLOBAL, {});
  }

  /** Envoie une réplique persona, best-effort (les messages sont secondaires). */
  private async say(
    ctx: SocialContext,
    event: NpcChatEvent,
    scope: ChatScope,
    vars: { target?: string; alliance?: string },
  ): Promise<void> {
    const seed = `${ctx.userId}:${event}:${Math.floor(Date.now() / 3_600_000)}`;
    const content = composeLine(event, ctx.archetype, vars, seed);
    try {
      await this.chat.send(ctx.userId, { scope, content });
      await this.log(ctx, NpcActionType.CHAT_MESSAGE, NpcActionLogStatus.SUCCESS, { event, scope });
    } catch (err) {
      this.logger.debug({ err }, `Chat NPC ignoré pour ${ctx.username}`);
    }
  }

  // ─────────────────────────────── Agrégats ──────────────────────────────────

  /** Construit la liste des alliances tierces candidates avec leurs métriques. */
  private async buildCandidates(
    ctx: SocialContext,
    myAllianceId: string,
  ): Promise<AllianceCandidate[]> {
    const alliances = await this.prisma.alliance.findMany({
      where: { id: { not: myAllianceId } },
      select: {
        id: true,
        members: { select: { userId: true, user: { select: { role: true } } } },
      },
      take: 30,
    });

    const rels = await this.prisma.diplomaticRelation.findMany({
      where: { OR: [{ alliance1Id: myAllianceId }, { alliance2Id: myAllianceId }] },
      select: { alliance1Id: true, alliance2Id: true, status: true },
    });
    const statusByAlliance = new Map<string, DiplomaticStatus>();
    for (const r of rels) {
      const other = r.alliance1Id === myAllianceId ? r.alliance2Id : r.alliance1Id;
      statusByAlliance.set(other, r.status as unknown as DiplomaticStatus);
    }

    const powerByOwner = await this.powerByOwner(
      alliances.flatMap((a) => a.members.map((m) => m.userId)),
    );

    return alliances.map((a) => {
      const memberIds = a.members.map((m) => m.userId);
      const power = memberIds.reduce((sum, id) => sum + (powerByOwner.get(id) ?? 0), 0);
      const isBotAlliance =
        a.members.length > 0 && a.members.every((m) => m.user.role === UserRole.NPC);
      return {
        allianceId: a.id,
        power,
        isBotAlliance,
        grudgeToward: grudgeTowardMembers(ctx.memory, memberIds),
        currentStatus: statusByAlliance.get(a.id) ?? null,
      } satisfies AllianceCandidate;
    });
  }

  /** Puissance combat agrégée d'une alliance (somme des flottes de ses membres). */
  private async alliancePower(allianceId: string): Promise<number> {
    const memberIds = await this.allianceMemberIds(allianceId);
    if (memberIds.length === 0) return 0;
    const powers = await this.powerByOwner(memberIds);
    return memberIds.reduce((sum, id) => sum + (powers.get(id) ?? 0), 0);
  }

  /** Puissance combat par propriétaire, en une requête pour la liste fournie. */
  private async powerByOwner(ownerIds: string[]): Promise<Map<string, number>> {
    const unique = [...new Set(ownerIds)];
    const result = new Map<string, number>();
    if (unique.length === 0) return result;
    const ships = await this.prisma.planetShip.findMany({
      where: { planet: { ownerId: { in: unique } }, quantity: { gt: 0 } },
      select: { quantity: true, type: true, planet: { select: { ownerId: true } } },
    });
    for (const row of ships) {
      const cfg = SHIPS[row.type as ShipType];
      if (!cfg || !COMBAT_ROLES.includes(cfg.role)) continue;
      const ownerId = row.planet.ownerId;
      result.set(ownerId, (result.get(ownerId) ?? 0) + row.quantity * (cfg.attack + cfg.defense));
    }
    return result;
  }

  private async allianceMemberIds(allianceId: string): Promise<string[]> {
    const members = await this.prisma.allianceMember.findMany({
      where: { allianceId },
      select: { userId: true },
    });
    return members.map((m) => m.userId);
  }

  private async allianceName(allianceId: string): Promise<string> {
    const alliance = await this.prisma.alliance.findUnique({
      where: { id: allianceId },
      select: { name: true },
    });
    return alliance?.name ?? 'cette alliance';
  }

  private async touchCooldown(userId: string, progress: SocialProgress, now: Date): Promise<void> {
    const next: SocialProgress = { ...progress, lastSocialAt: now };
    await this.prisma.npcProfile
      .update({
        where: { userId },
        data: { goalProgress: serializeProgress(next) as Prisma.InputJsonValue },
      })
      .catch(() => void 0);
  }

  private log(
    ctx: SocialContext,
    actionType: NpcActionType,
    status: NpcActionLogStatus,
    detail: Record<string, unknown>,
  ): Promise<void> {
    return this.prisma.npcActionLog
      .create({
        data: {
          universeId: ctx.universeId,
          userId: ctx.userId,
          actionType,
          status,
          detail: detail as Prisma.InputJsonValue,
        },
      })
      .then(() => void 0)
      .catch((err: unknown) => {
        this.logger.warn({ err }, "Échec de journalisation d'action sociale NPC");
      });
  }
}

// ─────────────────────────────── Helpers purs ────────────────────────────────

interface SocialProgress {
  lastSocialAt: Date | null;
}

function parseProgress(raw: unknown): SocialProgress {
  if (!raw || typeof raw !== 'object') return { lastSocialAt: null };
  const value = (raw as Record<string, unknown>).lastSocialAt;
  if (typeof value !== 'string') return { lastSocialAt: null };
  const date = new Date(value);
  return { lastSocialAt: Number.isNaN(date.getTime()) ? null : date };
}

function serializeProgress(progress: SocialProgress): Record<string, unknown> {
  return { lastSocialAt: progress.lastSocialAt?.toISOString() ?? null };
}

/** Rancune agrégée de la mémoire du bot envers une liste de joueurs. */
function grudgeTowardMembers(memory: NpcMemoryState, memberIds: string[]): number {
  return memberIds.reduce((sum, id) => sum + getRelation(memory, id).grudge, 0);
}

/** AuthUser minimal : les services diplomatie ne lisent que `id`. */
function authUser(ctx: SocialContext): AuthUser {
  return { id: ctx.userId } as unknown as AuthUser;
}

/** FNV-1a local (évite un import croisé juste pour le tirage de taunt). */
function hash(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
