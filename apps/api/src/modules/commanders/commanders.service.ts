import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  COMMANDERS,
  commanderXpToNextLevel,
  COMMANDER_TALENT_BRANCHES,
  maxActiveCommanders,
  CommanderStatus,
  CommanderType,
  CommanderTalentBranch,
  BuildingType,
  type CommanderView,
  type CommandersOverview,
  type CommanderTalentBranchView,
  type TalentNodeView,
} from '@arborisis/shared';
import { PrismaService } from '../../common/prisma/prisma.service';
import { GameEngineService } from '../game/game-engine.service';
import { PlanetsService } from '../game/planets.service';

type PrismaCommander = {
  id: string;
  userId: string;
  type: string;
  rarity: string;
  level: number;
  xp: number;
  talentPoints: number;
  status: string;
  assignedToPlanetId: string | null;
  talentInvestments: { branch: string; nodeId: string; pointsInvested: number }[];
};

@Injectable()
export class CommandersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly engine: GameEngineService,
    private readonly planets: PlanetsService,
  ) {}

  async overview(userId: string): Promise<CommandersOverview> {
    // Détermine le niveau du Cœur Symbiotique pour savoir combien de commandants actifs sont permis.
    const homeworld = await this.prisma.planet.findFirst({
      where: { ownerId: userId, isHomeworld: true },
      include: { buildings: true },
    });
    const coreLevel =
      homeworld?.buildings.find((b) => b.type === BuildingType.SYMBIOTIC_CORE)?.level ?? 0;
    const maxActive = maxActiveCommanders(coreLevel);

    const commanders = await this.prisma.commander.findMany({
      where: { userId },
      include: { talentInvestments: true },
      orderBy: { createdAt: 'asc' },
    });

    const activeCount = commanders.filter((c) => c.status !== CommanderStatus.IDLE).length;

    return {
      commanders: commanders.map((c) => this.toView(c as unknown as PrismaCommander)),
      maxActive,
      canRecruit: commanders.length < 12,
    };
  }

  async recruit(userId: string, type: CommanderType): Promise<CommanderView> {
    const config = COMMANDERS[type];
    if (!config) throw new BadRequestException('Type de commandant invalide.');

    // Un seul commandant de chaque type par joueur.
    const existing = await this.prisma.commander.findFirst({
      where: { userId, type: type as any },
    });
    if (existing) throw new ConflictException('Vous possédez déjà ce commandant.');

    // Vérifier que le joueur peut se payer le recrutement.
    const homeworld = await this.prisma.planet.findFirstOrThrow({
      where: { ownerId: userId, isHomeworld: true },
    });
    const settled = await this.engine.settlePlanet(homeworld.id);
    const amounts = this.engine.buildResourceState(settled).amounts;
    for (const [res, cost] of Object.entries(config.recruitCost)) {
      if ((amounts[res as keyof typeof amounts] ?? 0) < (cost ?? 0)) {
        throw new BadRequestException(`Ressources insuffisantes : ${res}`);
      }
    }

    // Déduire le coût du Noyau-Monde.
    await this.prisma.planet.update({
      where: { id: homeworld.id },
      data: {
        biomass: { decrement: config.recruitCost.BIOMASS ?? 0 },
        sap: { decrement: config.recruitCost.SAP ?? 0 },
        minerals: { decrement: config.recruitCost.MINERALS ?? 0 },
        spores: { decrement: config.recruitCost.SPORES ?? 0 },
      },
    });

    const created = await this.prisma.commander.create({
      data: {
        userId,
        type: type as any,
        rarity: config.rarity as any,
        level: 1,
        xp: 0,
        talentPoints: 0,
        status: CommanderStatus.IDLE as any,
      },
      include: { talentInvestments: true },
    });

    return this.toView(created as unknown as PrismaCommander);
  }

  async assignToPlanet(
    userId: string,
    commanderId: string,
    planetId: string | null,
  ): Promise<CommanderView> {
    const commander = await this.assertOwnership(userId, commanderId);
    if (planetId) {
      await this.planets.assertOwnership(userId, planetId);
    }
    const updated = await this.prisma.commander.update({
      where: { id: commanderId },
      data: {
        status: planetId
          ? (CommanderStatus.ASSIGNED_TO_PLANET as any)
          : (CommanderStatus.IDLE as any),
        assignedToPlanetId: planetId,
      },
      include: { talentInvestments: true },
    });
    return this.toView(updated as unknown as PrismaCommander);
  }

  async investTalent(
    userId: string,
    commanderId: string,
    branch: CommanderTalentBranch,
    nodeId: string,
  ): Promise<CommanderView> {
    const commander = await this.assertOwnership(userId, commanderId);
    const config = COMMANDERS[commander.type as CommanderType];
    if (!config) throw new BadRequestException('Commandant invalide.');
    if (!config.talentBranches.includes(branch)) {
      throw new BadRequestException(
        `Branche de talent ${branch} non disponible pour ce commandant.`,
      );
    }
    if (commander.talentPoints <= 0) {
      throw new BadRequestException('Aucun point de talent disponible.');
    }
    const branchConfig = COMMANDER_TALENT_BRANCHES[branch];
    const node = branchConfig.nodes.find((n) => n.id === nodeId);
    if (!node) throw new NotFoundException('Nœud de talent introuvable.');

    // Vérifier les prérequis.
    if (node.requires && node.requires.length > 0) {
      const investments = (commander as any).talentInvestments as {
        branch: string;
        nodeId: string;
        pointsInvested: number;
      }[];
      for (const req of node.requires) {
        const hasReq = investments.some((inv) => inv.branch === branch && inv.nodeId === req);
        if (!hasReq) throw new BadRequestException(`Prérequis non satisfait : ${req}`);
      }
    }

    // Vérifier que le max n'est pas atteint.
    const existing = (commander as any).talentInvestments.find(
      (inv: any) => inv.branch === branch && inv.nodeId === nodeId,
    );
    const current = existing?.pointsInvested ?? 0;
    if (current >= node.maxPoints) {
      throw new BadRequestException('Nœud de talent déjà au maximum.');
    }

    await this.prisma.$transaction([
      this.prisma.commanderTalentInvestment.upsert({
        where: {
          commanderId_branch_nodeId: {
            commanderId,
            branch: branch as any,
            nodeId,
          },
        },
        update: { pointsInvested: { increment: 1 } },
        create: {
          commanderId,
          branch: branch as any,
          nodeId,
          pointsInvested: 1,
        },
      }),
      this.prisma.commander.update({
        where: { id: commanderId },
        data: { talentPoints: { decrement: 1 } },
      }),
    ]);

    const updated = await this.prisma.commander.findUniqueOrThrow({
      where: { id: commanderId },
      include: { talentInvestments: true },
    });
    return this.toView(updated as unknown as PrismaCommander);
  }

  /** Ajoute de l'XP à un commandant (appelé après batailles/expéditions). */
  async addXp(commanderId: string, xpGained: number): Promise<void> {
    const commander = await this.prisma.commander.findUniqueOrThrow({
      where: { id: commanderId },
    });
    const config = COMMANDERS[commander.type as CommanderType];
    let newXp = commander.xp + xpGained;
    let newLevel = commander.level;
    let talentPointsEarned = 0;

    while (newLevel < config.maxLevel) {
      const xpNeeded = commanderXpToNextLevel(config.baseXpPerLevel, newLevel);
      if (newXp >= xpNeeded) {
        newXp -= xpNeeded;
        newLevel++;
        talentPointsEarned++;
      } else {
        break;
      }
    }

    await this.prisma.commander.update({
      where: { id: commanderId },
      data: {
        xp: newXp,
        level: newLevel,
        talentPoints: { increment: talentPointsEarned },
      },
    });
  }

  /** Récupère les bonus actifs d'un commandant assigné à une planète. */
  async getPlanetCommanderBonus(planetId: string): Promise<Record<string, number>> {
    const commander = await this.prisma.commander.findFirst({
      where: {
        assignedToPlanetId: planetId,
        status: CommanderStatus.ASSIGNED_TO_PLANET as any,
      },
      include: { talentInvestments: true },
    });
    if (!commander) return {};
    return this.computeActiveBonus(commander as unknown as PrismaCommander);
  }

  private async assertOwnership(userId: string, commanderId: string): Promise<PrismaCommander> {
    const commander = await this.prisma.commander.findUnique({
      where: { id: commanderId },
      include: { talentInvestments: true },
    });
    if (!commander) throw new NotFoundException('Commandant introuvable.');
    if (commander.userId !== userId)
      throw new BadRequestException('Ce commandant ne vous appartient pas.');
    return commander as unknown as PrismaCommander;
  }

  private computeActiveBonus(commander: PrismaCommander): Record<string, number> {
    const config = COMMANDERS[commander.type as CommanderType];
    const bonus: Record<string, number> = { ...config.baseBonus };

    for (const inv of commander.talentInvestments) {
      const branchCfg = COMMANDER_TALENT_BRANCHES[inv.branch as CommanderTalentBranch];
      if (!branchCfg) continue;
      const node = branchCfg.nodes.find((n) => n.id === inv.nodeId);
      if (!node) continue;
      bonus[node.effectKey] = (bonus[node.effectKey] ?? 0) + node.effectValue * inv.pointsInvested;
    }

    return bonus;
  }

  private toView(commander: PrismaCommander): CommanderView {
    const config = COMMANDERS[commander.type as CommanderType];
    const investments = commander.talentInvestments;
    const activeBonus = this.computeActiveBonus(commander);
    const xpToNextLevel = commanderXpToNextLevel(config.baseXpPerLevel, commander.level);

    const talentBranches: CommanderTalentBranchView[] = config.talentBranches.map((branch) => {
      const branchCfg = COMMANDER_TALENT_BRANCHES[branch];
      const nodes: TalentNodeView[] = branchCfg.nodes.map((node) => {
        const inv = investments.find((i) => i.branch === branch && i.nodeId === node.id);
        const pointsInvested = inv?.pointsInvested ?? 0;
        const unlocked = pointsInvested > 0;
        const prereqsMet =
          !node.requires ||
          node.requires.every((req) =>
            investments.some((i) => i.branch === branch && i.nodeId === req),
          );
        return {
          id: node.id,
          name: node.name,
          description: node.description,
          maxPoints: node.maxPoints,
          pointsInvested,
          effectKey: node.effectKey,
          effectValue: node.effectValue,
          unlocked,
          available: !unlocked && prereqsMet && commander.talentPoints > 0,
          requires: node.requires ?? [],
        };
      });
      return { branch, name: branchCfg.name, nodes };
    });

    return {
      id: commander.id,
      type: commander.type as CommanderType,
      name: config.name,
      lore: config.lore,
      rarity: commander.rarity as any,
      level: commander.level,
      xp: commander.xp,
      xpToNextLevel,
      talentPoints: commander.talentPoints,
      status: commander.status as any,
      assignedToPlanetId: commander.assignedToPlanetId,
      assignedToPlanetName: null,
      talentBranches,
      activeBonus,
      stats: config.baseStats,
    };
  }
}
