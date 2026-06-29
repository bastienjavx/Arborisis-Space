import { DiplomaticStatus, NpcMood, type NpcTraitVector } from '@arborisis/shared';
import { decideOfferResponse, proposeDiplomacy, type AllianceCandidate } from './npc-diplomacy';

function traits(overrides: Partial<NpcTraitVector> = {}): NpcTraitVector {
  return { aggression: 0.5, greed: 0.5, caution: 0.5, ambition: 0.5, curiosity: 0.5, ...overrides };
}

describe('decideOfferResponse', () => {
  it('refuse toute offre quand la rancune envers le proposant est mûre', () => {
    const decision = decideOfferResponse({
      proposedStatus: DiplomaticStatus.NON_AGGRESSION_PACT,
      myAlliancePower: 100,
      theirAlliancePower: 100,
      traits: traits({ caution: 1 }),
      mood: NpcMood.THREATENED,
      grudgeToward: 10,
    });
    expect(decision.accept).toBe(false);
    expect(decision.reason).toBe('standing_grudge');
  });

  it('accepte un NAP quand le bot est prudent, menacé et plus faible', () => {
    const decision = decideOfferResponse({
      proposedStatus: DiplomaticStatus.NON_AGGRESSION_PACT,
      myAlliancePower: 50,
      theirAlliancePower: 200,
      traits: traits({ caution: 0.9, aggression: 0.1 }),
      mood: NpcMood.THREATENED,
      grudgeToward: 0,
    });
    expect(decision.accept).toBe(true);
  });

  it('refuse un NAP quand un dominant agressif veut garder ses proies', () => {
    const decision = decideOfferResponse({
      proposedStatus: DiplomaticStatus.NON_AGGRESSION_PACT,
      myAlliancePower: 300,
      theirAlliancePower: 50,
      traits: traits({ caution: 0.1, aggression: 0.95 }),
      mood: NpcMood.CONFIDENT,
      grudgeToward: 0,
    });
    expect(decision.accept).toBe(false);
  });

  it('accepte une alliance commerciale pour un bot cupide et peu agressif', () => {
    const decision = decideOfferResponse({
      proposedStatus: DiplomaticStatus.TRADE_ALLIANCE,
      myAlliancePower: 100,
      theirAlliancePower: 100,
      traits: traits({ greed: 0.9, aggression: 0.1 }),
      mood: NpcMood.CALM,
      grudgeToward: 0,
    });
    expect(decision.accept).toBe(true);
    expect(decision.reason).toBe('trade_favorable');
  });
});

describe('proposeDiplomacy', () => {
  const neutral = (over: Partial<AllianceCandidate> = {}): AllianceCandidate => ({
    allianceId: 'a1',
    power: 100,
    isBotAlliance: true,
    grudgeToward: 0,
    currentStatus: null,
    ...over,
  });

  it('déclare la guerre sur rancune mûre et supériorité nette', () => {
    const intent = proposeDiplomacy({
      myAlliancePower: 500,
      traits: traits({ aggression: 0.9 }),
      mood: NpcMood.VENGEFUL,
      totalThreat: 0,
      candidates: [neutral({ allianceId: 'foe', power: 100, grudgeToward: 5 })],
    });
    expect(intent).toEqual({ kind: 'WAR', targetAllianceId: 'foe', reason: 'grudge_war' });
  });

  it('ne déclare pas la guerre si le bot est trop faible', () => {
    const intent = proposeDiplomacy({
      myAlliancePower: 50,
      traits: traits({ aggression: 0.9 }),
      mood: NpcMood.VENGEFUL,
      totalThreat: 0,
      candidates: [neutral({ allianceId: 'foe', power: 500, grudgeToward: 5 })],
    });
    expect(intent?.kind).not.toBe('WAR');
  });

  it('cherche un NAP avec la plus forte alliance neutre quand menacé', () => {
    const intent = proposeDiplomacy({
      myAlliancePower: 100,
      traits: traits({ aggression: 0.2, greed: 0.1 }),
      mood: NpcMood.THREATENED,
      totalThreat: 5,
      candidates: [
        neutral({ allianceId: 'weak', power: 120 }),
        neutral({ allianceId: 'strong', power: 400 }),
      ],
    });
    expect(intent).toEqual({
      kind: 'OFFER',
      status: DiplomaticStatus.NON_AGGRESSION_PACT,
      targetAllianceId: 'strong',
      reason: 'seek_protection',
    });
  });

  it('propose une alliance commerciale quand cupide et sans menace', () => {
    const intent = proposeDiplomacy({
      myAlliancePower: 100,
      traits: traits({ aggression: 0.2, greed: 0.9, caution: 0.2 }),
      mood: NpcMood.CALM,
      totalThreat: 0,
      candidates: [neutral({ allianceId: 'peer', power: 90 })],
    });
    expect(intent).toEqual({
      kind: 'OFFER',
      status: DiplomaticStatus.TRADE_ALLIANCE,
      targetAllianceId: 'peer',
      reason: 'commerce',
    });
  });

  it('ne propose rien sans candidat exploitable', () => {
    const intent = proposeDiplomacy({
      myAlliancePower: 100,
      traits: traits({ aggression: 0.2, greed: 0.1, caution: 0.2 }),
      mood: NpcMood.CALM,
      totalThreat: 0,
      candidates: [],
    });
    expect(intent).toBeNull();
  });
});
