import {
  NPC_ARCHETYPES,
  NpcActionCategory,
  NpcArchetype,
  NpcGoal,
  NpcMood,
} from '@arborisis/shared';
import { assignArchetype, deriveTraits, parseTraits } from './npc-personality';
import {
  decayMemory,
  emptyMemory,
  getRelation,
  recordBattleResult,
  recordIncomingAttack,
  recordOutgoingAttack,
  topGrudge,
  totalThreat,
} from './npc-memory';
import { deriveMood, goalUtility, selectGoal, type NpcGoalContext } from './npc-goals';
import { actionUtility, effectiveAttackRatio } from './npc-utility';

function baseContext(overrides: Partial<NpcGoalContext> = {}): NpcGoalContext {
  return {
    archetype: NpcArchetype.OPPORTUNIST,
    traits: { aggression: 0.5, greed: 0.5, caution: 0.5, ambition: 0.5, curiosity: 0.5 },
    mood: NpcMood.CALM,
    colonies: 1,
    maxColonies: 4,
    combatShips: 0,
    minCombatForAttack: 30,
    totalThreat: 0,
    hasGrudgeTarget: false,
    economyScore: 0.5,
    researchBacklog: false,
    ...overrides,
  };
}

describe('NPC personality', () => {
  it('assigns a stable archetype for the same key', () => {
    const a = assignArchetype('MYCO-01');
    const b = assignArchetype('MYCO-01');
    expect(a).toBe(b);
    expect(NPC_ARCHETYPES).toContain(a);
  });

  it('spreads archetypes across the population', () => {
    const seen = new Set<NpcArchetype>();
    for (let i = 0; i < 50; i++) seen.add(assignArchetype(`BOT-${i}`));
    expect(seen.size).toBeGreaterThanOrEqual(4);
  });

  it('derives bounded, deterministic traits near the archetype baseline', () => {
    const traits = deriveTraits(NpcArchetype.RAIDER, 'MYCO-01');
    const again = deriveTraits(NpcArchetype.RAIDER, 'MYCO-01');
    expect(traits).toEqual(again);
    for (const value of Object.values(traits)) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
    // Le raider reste nettement agressif malgré le bruit.
    expect(traits.aggression).toBeGreaterThan(0.7);
  });

  it('parses persisted traits and falls back on garbage', () => {
    const fallback = deriveTraits(NpcArchetype.TURTLE, 'k');
    expect(parseTraits(null, fallback)).toEqual(fallback);
    expect(parseTraits({ aggression: 0.9 }, fallback).aggression).toBe(0.9);
  });
});

describe('NPC memory', () => {
  it('raises threat and grudge on incoming attacks', () => {
    let mem = emptyMemory();
    mem = recordIncomingAttack(mem, 'enemy', '2026-06-28T00:00:00Z');
    mem = recordIncomingAttack(mem, 'enemy', '2026-06-28T01:00:00Z');
    const relation = getRelation(mem, 'enemy');
    expect(relation.threat).toBe(2);
    expect(relation.grudge).toBe(2);
    expect(totalThreat(mem)).toBe(2);
  });

  it('lowers grudge when retaliating and tracks battle outcomes', () => {
    let mem = emptyMemory();
    mem = recordIncomingAttack(mem, 'enemy', '2026-06-28T00:00:00Z', 2);
    mem = recordOutgoingAttack(mem, 'enemy', '2026-06-28T02:00:00Z');
    mem = recordBattleResult(mem, 'enemy', true);
    const relation = getRelation(mem, 'enemy');
    expect(relation.grudge).toBe(1);
    expect(relation.battlesWon).toBe(1);
  });

  it('decays and forgets negligible relations', () => {
    let mem = emptyMemory();
    mem = recordIncomingAttack(mem, 'weak', '2026-06-28T00:00:00Z', 0.06);
    mem = decayMemory(mem, 0.5);
    expect(mem.relations.weak).toBeUndefined();
  });

  it('reports the top grudge target', () => {
    let mem = emptyMemory();
    mem = recordIncomingAttack(mem, 'a', 't', 1);
    mem = recordIncomingAttack(mem, 'b', 't', 3);
    expect(topGrudge(mem)?.playerId).toBe('b');
  });
});

describe('NPC goals', () => {
  it('drives raiders without a fleet to build one', () => {
    const goal = selectGoal(
      baseContext({
        archetype: NpcArchetype.RAIDER,
        traits: deriveTraits(NpcArchetype.RAIDER, 'r'),
      }),
      null,
      null,
    );
    expect(goal.goal).toBe(NpcGoal.BUILD_WAR_FLEET);
  });

  it('forces fortification when threatened (non-raider)', () => {
    const goal = selectGoal(
      baseContext({ archetype: NpcArchetype.ECONOMIST, totalThreat: 3 }),
      null,
      null,
    );
    expect(goal.goal).toBe(NpcGoal.FORTIFY);
  });

  it('targets a grudge when the fleet is ready and aggressive enough', () => {
    const goal = selectGoal(
      baseContext({
        traits: { aggression: 0.8, greed: 0.3, caution: 0.2, ambition: 0.5, curiosity: 0.5 },
        combatShips: 40,
        hasGrudgeTarget: true,
      }),
      null,
      'victim',
    );
    expect(goal.goal).toBe(NpcGoal.RAID_TARGET);
    expect(goal.targetId).toBe('victim');
  });

  it('keeps the current goal within the hysteresis margin', () => {
    // Flotte déjà constituée et colonies au plafond : seuls MAX_ECONOMY (0.5) et
    // RESEARCH_PUSH (0.475) restent en lice, à une marge inférieure à HYSTERESIS.
    const ctx = baseContext({
      combatShips: 40,
      colonies: 4,
      maxColonies: 4,
      economyScore: 0.2,
      researchBacklog: true,
    });
    expect(selectGoal(ctx, null, null).goal).toBe(NpcGoal.MAX_ECONOMY);
    // Le but courant proche du vainqueur n'est pas abandonné (anti-oscillation).
    expect(selectGoal(ctx, NpcGoal.RESEARCH_PUSH, null).goal).toBe(NpcGoal.RESEARCH_PUSH);
  });

  it('derives mood from threat and grudges', () => {
    const traits = baseContext().traits;
    expect(
      deriveMood({
        traits,
        totalThreat: 3,
        hasReadyGrudge: false,
        winDelta: 0,
        combatReady: false,
      }),
    ).toBe(NpcMood.THREATENED);
    expect(
      deriveMood({ traits, totalThreat: 3, hasReadyGrudge: true, winDelta: 0, combatReady: true }),
    ).toBe(NpcMood.VENGEFUL);
    expect(
      deriveMood({ traits, totalThreat: 0, hasReadyGrudge: false, winDelta: 3, combatReady: true }),
    ).toBe(NpcMood.CONFIDENT);
  });

  it('scores expansion higher for ambitious bots with room to grow', () => {
    const ctx = baseContext({
      colonies: 1,
      maxColonies: 5,
      traits: { ...baseContext().traits, ambition: 0.9 },
    });
    expect(goalUtility(NpcGoal.EXPAND_COLONIES, ctx)).toBeGreaterThan(
      goalUtility(NpcGoal.EXPAND_COLONIES, baseContext({ colonies: 5, maxColonies: 5 })),
    );
  });
});

describe('NPC utility', () => {
  const score = (archetype: NpcArchetype, category: NpcActionCategory) =>
    actionUtility({ baseScore: 100, category, archetype, goal: null, mood: NpcMood.CALM });

  it('makes raiders prefer warfare over economy', () => {
    expect(score(NpcArchetype.RAIDER, NpcActionCategory.WARFARE)).toBeGreaterThan(
      score(NpcArchetype.RAIDER, NpcActionCategory.ECONOMY),
    );
  });

  it('makes economists prefer economy over warfare', () => {
    expect(score(NpcArchetype.ECONOMIST, NpcActionCategory.ECONOMY)).toBeGreaterThan(
      score(NpcArchetype.ECONOMIST, NpcActionCategory.WARFARE),
    );
  });

  it('amplifies the category serving the current goal', () => {
    const withGoal = actionUtility({
      baseScore: 100,
      category: NpcActionCategory.FLEET,
      archetype: NpcArchetype.OPPORTUNIST,
      goal: NpcGoal.BUILD_WAR_FLEET,
      mood: NpcMood.CALM,
    });
    const without = actionUtility({
      baseScore: 100,
      category: NpcActionCategory.FLEET,
      archetype: NpcArchetype.OPPORTUNIST,
      goal: null,
      mood: NpcMood.CALM,
    });
    expect(withGoal).toBeGreaterThan(without);
  });

  it('lets aggressive and vengeful bots attack at lower power ratios', () => {
    const aggressive = effectiveAttackRatio(
      1.35,
      { aggression: 0.9, greed: 0.3, caution: 0.2, ambition: 0.5, curiosity: 0.5 },
      NpcMood.CALM,
      false,
    );
    const cautious = effectiveAttackRatio(
      1.35,
      { aggression: 0.2, greed: 0.3, caution: 0.9, ambition: 0.5, curiosity: 0.5 },
      NpcMood.CALM,
      false,
    );
    expect(aggressive).toBeLessThan(cautious);

    const vengeful = effectiveAttackRatio(
      1.35,
      { aggression: 0.9, greed: 0.3, caution: 0.2, ambition: 0.5, curiosity: 0.5 },
      NpcMood.VENGEFUL,
      true,
    );
    expect(vengeful).toBeLessThan(aggressive);
  });
});
