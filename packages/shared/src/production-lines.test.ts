import { PRODUCTION_LINE_RECIPES } from './constants';
import { ITEM_KEYS, ItemKey, RESOURCE_TYPES } from './enums';

describe('PRODUCTION_LINE_RECIPES', () => {
  it('produit uniquement des objets existants non rares de la v1', () => {
    const allowed = new Set([
      ItemKey.MYCELIAL_FIBER,
      ItemKey.BIOLUMINESCENT_GEL,
      ItemKey.CHITIN_SHARD,
      ItemKey.SPORE_ESSENCE,
    ]);

    for (const recipe of PRODUCTION_LINE_RECIPES) {
      expect(ITEM_KEYS).toContain(recipe.outputKey);
      expect(allowed.has(recipe.outputKey)).toBe(true);
      expect(recipe.outputQty).toBeGreaterThan(0);
      expect(recipe.cycleSeconds).toBeGreaterThan(0);
    }
  });

  it('consomme uniquement des ressources de jeu positives', () => {
    for (const recipe of PRODUCTION_LINE_RECIPES) {
      expect(Object.keys(recipe.inputs).length).toBeGreaterThan(0);
      for (const [resource, quantity] of Object.entries(recipe.inputs)) {
        expect(RESOURCE_TYPES).toContain(resource);
        expect(quantity).toBeGreaterThan(0);
      }
    }
  });
});
