import { NPC_ARCHETYPES, NpcArchetype } from '@arborisis/shared';
import { composeLine, NpcChatEvent } from './npc-chat';

describe('composeLine', () => {
  it('produit une ligne stable pour une même graine', () => {
    const a = composeLine(
      NpcChatEvent.WAR_DECLARED,
      NpcArchetype.RAIDER,
      { target: 'NOVA' },
      'seed',
    );
    const b = composeLine(
      NpcChatEvent.WAR_DECLARED,
      NpcArchetype.RAIDER,
      { target: 'NOVA' },
      'seed',
    );
    expect(a).toBe(b);
  });

  it('interpole la cible et l’alliance', () => {
    const line = composeLine(
      NpcChatEvent.OFFER_ACCEPTED,
      NpcArchetype.ECONOMIST,
      { target: 'NOVA' },
      's',
    );
    expect(line).toContain('NOVA');
    expect(line).not.toContain('{target}');
  });

  it('fournit un repli neutre quand une variable manque', () => {
    const line = composeLine(NpcChatEvent.RAID_TAUNT, NpcArchetype.RAIDER, {}, 's');
    expect(line).not.toContain('{target}');
    expect(line.length).toBeGreaterThan(0);
  });

  it('couvre chaque archétype et chaque évènement sans gabarit vide', () => {
    for (const archetype of NPC_ARCHETYPES) {
      for (const event of Object.values(NpcChatEvent)) {
        const line = composeLine(event, archetype, { target: 'X', alliance: 'Y' }, 'seed');
        expect(line.trim().length).toBeGreaterThan(0);
        expect(line).not.toMatch(/\{(target|alliance)\}/);
        expect(line.length).toBeLessThanOrEqual(1000);
      }
    }
  });
});
