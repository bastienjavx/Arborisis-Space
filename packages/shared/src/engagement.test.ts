import { ACHIEVEMENTS, DAILY_REWARDS, QUESTS, type ResourceBundle } from './constants';
import { AchievementType, RESOURCE_TYPES } from './enums';
import { claimQuestSchema } from './schemas';

const bundleTotal = (bundle: ResourceBundle) =>
  RESOURCE_TYPES.reduce((sum, r) => sum + (bundle[r] ?? 0), 0);

describe('récompenses de succès', () => {
  it('chaque succès octroie un butin concret non vide', () => {
    for (const type of Object.values(AchievementType)) {
      expect(bundleTotal(ACHIEVEMENTS[type].reward)).toBeGreaterThan(0);
    }
  });
});

describe('chaîne de quêtes', () => {
  it('a des identifiants uniques', () => {
    const ids = QUESTS.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('a des ordres strictement croissants', () => {
    const orders = QUESTS.map((q) => q.order);
    const sorted = [...orders].sort((a, b) => a - b);
    expect(orders).toEqual(sorted);
    expect(new Set(orders).size).toBe(orders.length);
  });

  it('définit une cible positive et un butin pour chaque quête', () => {
    for (const quest of QUESTS) {
      expect(quest.target).toBeGreaterThan(0);
      expect(bundleTotal(quest.reward)).toBeGreaterThan(0);
    }
  });
});

describe('récompenses quotidiennes', () => {
  it('définit un cycle de 7 jours', () => {
    expect(DAILY_REWARDS).toHaveLength(7);
  });

  it('octroie un butin non vide chaque jour', () => {
    for (const reward of DAILY_REWARDS) {
      expect(bundleTotal(reward)).toBeGreaterThan(0);
    }
  });
});

describe('claimQuestSchema', () => {
  it('accepte un questId valide', () => {
    expect(claimQuestSchema.parse({ questId: 'first-build' })).toEqual({ questId: 'first-build' });
  });

  it('refuse un questId vide', () => {
    expect(claimQuestSchema.safeParse({ questId: '' }).success).toBe(false);
  });
});
