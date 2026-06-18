import {
  BASE_STORAGE,
  PASSIVE_PRODUCTION,
  STORAGE_FACTOR,
} from './constants';
import { BuildingType, ResearchType, ResourceType } from './enums';
import {
  bundleAdd,
  bundleSubtract,
  buildTimeSeconds,
  buildingCost,
  canAfford,
  colonizationCost,
  computeProduction,
  maxColonies,
  planetFields,
  researchCost,
  researchTimeSeconds,
  stabilityFactor,
  storageCap,
  unmetBuildingRequirements,
  unmetResearchRequirements,
} from './formulas';

describe('buildingCost', () => {
  it('renvoie le coût de base au niveau 1', () => {
    expect(buildingCost(BuildingType.BIOMASS_SYNTHESIZER, 1)).toEqual({
      [ResourceType.BIOMASS]: 60,
      [ResourceType.MINERALS]: 15,
    });
  });

  it('croît géométriquement avec le niveau', () => {
    const l1 = buildingCost(BuildingType.BIOMASS_SYNTHESIZER, 1)[ResourceType.BIOMASS]!;
    const l2 = buildingCost(BuildingType.BIOMASS_SYNTHESIZER, 2)[ResourceType.BIOMASS]!;
    expect(l2).toBe(Math.floor(l1 * 1.5));
  });

  it('renvoie un bundle vide pour un niveau invalide', () => {
    expect(buildingCost(BuildingType.SAP_WELL, 0)).toEqual({});
  });
});

describe('buildTimeSeconds', () => {
  it('respecte un plancher minimal', () => {
    expect(buildTimeSeconds(BuildingType.BIOMASS_SYNTHESIZER, 1)).toBeGreaterThanOrEqual(5);
  });

  it('diminue quand le Cœur Symbiotique monte', () => {
    const t0 = buildTimeSeconds(BuildingType.MINERAL_VEIN, 5, 0);
    const t1 = buildTimeSeconds(BuildingType.MINERAL_VEIN, 5, 1);
    expect(t1).toBeLessThan(t0);
  });
});

describe('storageCap', () => {
  it('vaut la base au niveau 0', () => {
    expect(storageCap(0)).toBe(BASE_STORAGE);
  });
  it('croît avec le facteur de stockage', () => {
    expect(storageCap(1)).toBe(Math.floor(BASE_STORAGE * STORAGE_FACTOR));
  });
});

describe('stabilityFactor', () => {
  it('vaut 1 à stabilité maximale', () => {
    expect(stabilityFactor(100)).toBeCloseTo(1);
  });
  it('vaut le plancher à 0', () => {
    expect(stabilityFactor(0)).toBeCloseTo(0.5);
  });
  it('borne les valeurs hors limites', () => {
    expect(stabilityFactor(999)).toBeCloseTo(1);
    expect(stabilityFactor(-50)).toBeCloseTo(0.5);
  });
});

describe('computeProduction', () => {
  it('ne renvoie que la production passive sans bâtiment', () => {
    const r = computeProduction({ buildings: {}, research: {}, stability: 100 });
    expect(r.perHour[ResourceType.BIOMASS]).toBe(PASSIVE_PRODUCTION[ResourceType.BIOMASS]);
    expect(r.energyRatio).toBe(1);
  });

  it('augmente la production avec le niveau de bâtiment', () => {
    const base = computeProduction({ buildings: {}, research: {}, stability: 100 });
    const withMine = computeProduction({
      buildings: {
        [BuildingType.BIOMASS_SYNTHESIZER]: 3,
        [BuildingType.PHOTOSYNTHETIC_CANOPY]: 5,
      },
      research: {},
      stability: 100,
    });
    expect(withMine.perHour[ResourceType.BIOMASS]).toBeGreaterThan(
      base.perHour[ResourceType.BIOMASS],
    );
  });

  it('réduit la production en cas de déficit énergétique', () => {
    const sansEnergie = computeProduction({
      buildings: { [BuildingType.BIOMASS_SYNTHESIZER]: 5 },
      research: {},
      stability: 100,
    });
    const avecEnergie = computeProduction({
      buildings: {
        [BuildingType.BIOMASS_SYNTHESIZER]: 5,
        [BuildingType.PHOTOSYNTHETIC_CANOPY]: 10,
      },
      research: {},
      stability: 100,
    });
    expect(sansEnergie.energyRatio).toBeLessThan(1);
    expect(avecEnergie.perHour[ResourceType.BIOMASS]).toBeGreaterThan(
      sansEnergie.perHour[ResourceType.BIOMASS],
    );
  });

  it('le Génie génétique augmente la production', () => {
    const sansRecherche = computeProduction({
      buildings: { [BuildingType.BIOMASS_SYNTHESIZER]: 3, [BuildingType.PHOTOSYNTHETIC_CANOPY]: 5 },
      research: {},
      stability: 100,
    });
    const avecRecherche = computeProduction({
      buildings: { [BuildingType.BIOMASS_SYNTHESIZER]: 3, [BuildingType.PHOTOSYNTHETIC_CANOPY]: 5 },
      research: { [ResearchType.GENETIC_ENGINEERING]: 10 },
      stability: 100,
    });
    expect(avecRecherche.perHour[ResourceType.BIOMASS]).toBeGreaterThan(
      sansRecherche.perHour[ResourceType.BIOMASS],
    );
  });
});

describe('recherche', () => {
  it('coût croît avec le niveau', () => {
    const l1 = researchCost(ResearchType.BIOENGINEERING, 1)[ResourceType.SPORES]!;
    const l2 = researchCost(ResearchType.BIOENGINEERING, 2)[ResourceType.SPORES]!;
    expect(l2).toBeGreaterThan(l1);
  });
  it('temps réduit par le Noyau de Recherche', () => {
    const t0 = researchTimeSeconds(ResearchType.BIOENGINEERING, 3, 0);
    const t2 = researchTimeSeconds(ResearchType.BIOENGINEERING, 3, 2);
    expect(t2).toBeLessThan(t0);
  });
});

describe('colonisation', () => {
  it('le premier essaimage coûte le coût de base', () => {
    expect(colonizationCost(1)[ResourceType.SPORES]).toBe(500);
  });
  it('le coût augmente avec le nombre de planètes', () => {
    expect(colonizationCost(2)[ResourceType.SPORES]!).toBeGreaterThan(
      colonizationCost(1)[ResourceType.SPORES]!,
    );
  });
  it('le nombre de colonies dépend de la Propulsion sporale', () => {
    expect(maxColonies(0)).toBe(0);
    expect(maxColonies(3)).toBe(3);
  });
});

describe('planetFields', () => {
  it('augmente avec la Terraformation', () => {
    expect(planetFields(2)).toBeGreaterThan(planetFields(0));
  });
});

describe('helpers bundle', () => {
  it('canAfford / bundleSubtract / bundleAdd', () => {
    const have = { [ResourceType.BIOMASS]: 100, [ResourceType.SAP]: 50 };
    const cost = { [ResourceType.BIOMASS]: 60 };
    expect(canAfford(have, cost)).toBe(true);
    expect(canAfford({ [ResourceType.BIOMASS]: 10 }, cost)).toBe(false);
    expect(bundleSubtract(have, cost)[ResourceType.BIOMASS]).toBe(40);
    expect(bundleAdd(have, cost)[ResourceType.BIOMASS]).toBe(160);
  });
});

describe('prérequis', () => {
  it('Sporanges nécessite Bio-ingénierie', () => {
    const unmet = unmetBuildingRequirements(BuildingType.SPORANGE, { buildings: {}, research: {} });
    expect(unmet).toHaveLength(1);
    expect(unmet[0]!.type).toBe(ResearchType.BIOENGINEERING);
  });
  it('satisfait quand le prérequis est atteint', () => {
    const unmet = unmetBuildingRequirements(BuildingType.SPORANGE, {
      buildings: {},
      research: { [ResearchType.BIOENGINEERING]: 1 },
    });
    expect(unmet).toHaveLength(0);
  });
  it('Propulsion sporale nécessite Bio-ingénierie niveau 2', () => {
    const unmet = unmetResearchRequirements(ResearchType.SPORAL_PROPULSION, {
      buildings: {},
      research: { [ResearchType.BIOENGINEERING]: 1 },
    });
    expect(unmet.some((u) => u.type === ResearchType.BIOENGINEERING)).toBe(true);
  });
});
