import { DEFENSES } from './constants';
import { DefenseType, ResourceType } from './enums';
import { buildDefenseSchema } from './schemas';

describe('buildDefenseSchema', () => {
  it('accepte une construction de défense valide', () => {
    expect(buildDefenseSchema.parse({ defenseType: DefenseType.ION_CANNON, quantity: 12 })).toEqual(
      { defenseType: DefenseType.ION_CANNON, quantity: 12 },
    );
  });

  it('rejette les quantités invalides', () => {
    expect(
      buildDefenseSchema.safeParse({ defenseType: DefenseType.ION_CANNON, quantity: 0 }).success,
    ).toBe(false);
    expect(
      buildDefenseSchema.safeParse({ defenseType: DefenseType.ION_CANNON, quantity: 10_001 })
        .success,
    ).toBe(false);
    expect(
      buildDefenseSchema.safeParse({ defenseType: DefenseType.ION_CANNON, quantity: 1.5 }).success,
    ).toBe(false);
  });
});

describe('DEFENSES balance', () => {
  it('rend les premières défenses accessibles plus tôt', () => {
    expect(DEFENSES[DefenseType.ION_CANNON].cost).toMatchObject({
      [ResourceType.BIOMASS]: 180,
      [ResourceType.MINERALS]: 180,
    });
    expect(DEFENSES[DefenseType.SPORE_NET].cost).toMatchObject({
      [ResourceType.BIOMASS]: 240,
      [ResourceType.SAP]: 120,
    });
  });
});
