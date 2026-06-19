import { BASE_STORAGE, PASSIVE_PRODUCTION, STORAGE_FACTOR } from './constants';
import {
  BuildingType,
  ExpeditionOutcome,
  RaceType,
  ResearchType,
  ResourceType,
  ShipType,
} from './enums';
import {
  bundleAdd,
  bundleSubtract,
  buildTimeSeconds,
  buildingCost,
  canAfford,
  colonizationCost,
  computeDefensePower,
  computeProduction,
  effectiveStability,
  fleetCombatPower,
  maxColonies,
  npcCombatPower,
  planetFields,
  pveCombatDurationSeconds,
  pveResolve,
  pveTravelTimeSeconds,
  researchCost,
  researchTimeSeconds,
  resolvePvpAttack,
  resolveSpy,
  stabilityFactor,
  storageCap,
  unmetBuildingRequirements,
  unmetResearchRequirements,
  expeditionDistance,
  expeditionIncidentLossPercent,
  expeditionOutcomeFromRoll,
  expeditionTravelTimeSeconds,
  fleetCargo,
  pvpTravelTimeSeconds,
  shipCost,
  shipProductionTimeSeconds,
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

describe('effectiveStability', () => {
  it('plafonne immédiatement la stabilité selon le déficit énergétique', () => {
    expect(effectiveStability(100, 0.65)).toBe(65);
    expect(effectiveStability(82, 1)).toBe(82);
  });
});

describe('computeProduction', () => {
  it('ne renvoie que la production passive sans bâtiment', () => {
    const r = computeProduction({
      buildings: {},
      research: {},
      stability: 100,
      race: RaceType.PHOTOSYNTHEX,
    });
    expect(r.perHour[ResourceType.BIOMASS]).toBe(PASSIVE_PRODUCTION[ResourceType.BIOMASS]);
    expect(r.energyRatio).toBe(1);
  });

  it('applique les bonus raciaux à la production passive', () => {
    const mycelians = computeProduction({
      buildings: {},
      research: {},
      stability: 100,
      race: RaceType.MYCELIANS,
    });
    expect(mycelians.perHour[ResourceType.BIOMASS]).toBe(
      Math.round((PASSIVE_PRODUCTION[ResourceType.BIOMASS] ?? 0) * 1.1),
    );
    const chitinids = computeProduction({
      buildings: {},
      research: {},
      stability: 100,
      race: RaceType.CHITINIDS,
    });
    expect(chitinids.perHour[ResourceType.BIOMASS]).toBe(
      Math.round((PASSIVE_PRODUCTION[ResourceType.BIOMASS] ?? 0) * 0.9),
    );
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

  it('réduit production et consommation selon l’intensité configurée', () => {
    const full = computeProduction({
      buildings: {
        [BuildingType.BIOMASS_SYNTHESIZER]: 5,
        [BuildingType.PHOTOSYNTHETIC_CANOPY]: 5,
      },
      research: {},
      stability: 100,
    });
    const reduced = computeProduction({
      buildings: {
        [BuildingType.BIOMASS_SYNTHESIZER]: 5,
        [BuildingType.PHOTOSYNTHETIC_CANOPY]: 5,
      },
      productionIntensities: { [BuildingType.BIOMASS_SYNTHESIZER]: 50 },
      research: {},
      stability: 100,
    });

    expect(reduced.energyConsumed).toBeCloseTo(full.energyConsumed / 2);
    expect(reduced.perHour[ResourceType.BIOMASS]).toBeLessThan(full.perHour[ResourceType.BIOMASS]);
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

  it('les recherches avancées boostent leurs ressources cibles', () => {
    const base = computeProduction({
      buildings: {
        [BuildingType.BIOMASS_SYNTHESIZER]: 3,
        [BuildingType.SAP_WELL]: 3,
        [BuildingType.SPORANGE]: 3,
        [BuildingType.PHOTOSYNTHETIC_CANOPY]: 5,
      },
      research: {},
      stability: 100,
      race: RaceType.PHOTOSYNTHEX,
    });
    const boosted = computeProduction({
      buildings: {
        [BuildingType.BIOMASS_SYNTHESIZER]: 3,
        [BuildingType.SAP_WELL]: 3,
        [BuildingType.SPORANGE]: 3,
        [BuildingType.PHOTOSYNTHETIC_CANOPY]: 5,
      },
      research: {
        [ResearchType.NUTRIENT_CYCLING]: 5,
        [ResearchType.SUBTERRANEAN_ROOTS]: 5,
        [ResearchType.SPORAL_ECONOMY]: 5,
      },
      stability: 100,
      race: RaceType.PHOTOSYNTHEX,
    });
    expect(boosted.perHour[ResourceType.BIOMASS]).toBeGreaterThan(
      base.perHour[ResourceType.BIOMASS],
    );
    expect(boosted.perHour[ResourceType.SAP]).toBeGreaterThan(base.perHour[ResourceType.SAP]);
    expect(boosted.perHour[ResourceType.SPORES]).toBeGreaterThan(base.perHour[ResourceType.SPORES]);
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

describe('flottes et expéditions', () => {
  const fleet = {
    [ShipType.SPORAL_SCOUT]: 2,
    [ShipType.SYMBIOTIC_HARVESTER]: 1,
  };

  it('multiplie les coûts et réduit le temps avec le Berceau Orbital', () => {
    expect(shipCost(ShipType.SPORAL_SCOUT, 2)[ResourceType.BIOMASS]).toBe(500);
    expect(shipProductionTimeSeconds(ShipType.SPORAL_SCOUT, 5, 3)).toBeLessThan(
      shipProductionTimeSeconds(ShipType.SPORAL_SCOUT, 5, 1),
    );
  });

  it('calcule cargaison, distance et trajet depuis la flotte la plus lente', () => {
    expect(fleetCargo(fleet)).toBe(1_200);
    expect(expeditionDistance({ galaxy: 1, system: 1 }, { galaxy: 1, system: 5 })).toBe(4);
    expect(
      expeditionTravelTimeSeconds({ galaxy: 1, system: 1 }, { galaxy: 1, system: 5 }, fleet),
    ).toBeGreaterThanOrEqual(30);
  });

  it('respecte exactement les bornes de la table de tirage v2', () => {
    expect(expeditionOutcomeFromRoll(0)).toBe(ExpeditionOutcome.RESOURCE_CACHE);
    expect(expeditionOutcomeFromRoll(4_999)).toBe(ExpeditionOutcome.RESOURCE_CACHE);
    expect(expeditionOutcomeFromRoll(5_000)).toBe(ExpeditionOutcome.RARE_SPORES);
    expect(expeditionOutcomeFromRoll(6_500)).toBe(ExpeditionOutcome.DERELICT_SHIP);
    expect(expeditionOutcomeFromRoll(7_500)).toBe(ExpeditionOutcome.INCIDENT);
    expect(expeditionOutcomeFromRoll(8_500)).toBe(ExpeditionOutcome.ANOMALY);
    expect(expeditionOutcomeFromRoll(9_100)).toBe(ExpeditionOutcome.ANCIENT_ARCHIVE);
    expect(expeditionOutcomeFromRoll(9_500)).toBe(ExpeditionOutcome.VOID_ECHO);
    expect(expeditionOutcomeFromRoll(9_800)).toBe(ExpeditionOutcome.CONVERGENCE_BLOOM);
    expect(expeditionOutcomeFromRoll(9_999)).toBe(ExpeditionOutcome.CONVERGENCE_BLOOM);
  });

  it('borne les pertes d’incident entre 10 et 30 pour cent', () => {
    expect(expeditionIncidentLossPercent(0)).toBe(10);
    expect(expeditionIncidentLossPercent(20)).toBe(30);
    expect(expeditionIncidentLossPercent(21)).toBe(10);
  });
});

describe('PvE', () => {
  const fleet = {
    [ShipType.SPORAL_DRONE]: 10,
    [ShipType.BIOLUMINESCENT_CRUISER]: 2,
  };

  it('calcule la puissance de combat d’une flotte', () => {
    const power = fleetCombatPower(fleet, RaceType.MYCELIANS);
    expect(power).toBeGreaterThan(0);
  });

  it('calcule la puissance d’une anomalie selon sa difficulté', () => {
    expect(npcCombatPower(1)).toBe(150);
    expect(npcCombatPower(5)).toBe(750);
  });

  it('calcule le temps de trajet PvE comme une expédition', () => {
    expect(
      pveTravelTimeSeconds({ galaxy: 1, system: 1 }, { galaxy: 1, system: 2, position: 1 }, fleet),
    ).toBeGreaterThanOrEqual(30);
  });

  it('calcule une durée de combat de base', () => {
    expect(pveCombatDurationSeconds(300, 150)).toBe(60);
    expect(pveCombatDurationSeconds(600, 600)).toBe(90);
  });

  it('renvoie une victoire si la flotte domine largement', () => {
    const result = pveResolve({
      fleetPower: 3_000,
      npcPower: 1_000,
      ships: fleet,
      race: RaceType.MYCELIANS,
      difficulty: 3,
    });
    expect(result.outcome).toBe('VICTORY');
    expect(result.rewards[ResourceType.BIOMASS]).toBeGreaterThan(0);
  });

  it('renvoie une défaite si la flotte est trop faible', () => {
    const result = pveResolve({
      fleetPower: 100,
      npcPower: 1_000,
      ships: fleet,
      race: RaceType.MYCELIANS,
      difficulty: 5,
    });
    expect(result.outcome).toBe('DEFEAT');
  });
});

describe('PvP', () => {
  const attackFleet = {
    [ShipType.SPORAL_DRONE]: 20,
    [ShipType.BIOLUMINESCENT_CRUISER]: 5,
  };

  it('calcule un temps de trajet PvP comme une expédition', () => {
    expect(
      pvpTravelTimeSeconds(
        { galaxy: 1, system: 1, position: 1 },
        { galaxy: 1, system: 2, position: 3 },
        attackFleet,
      ),
    ).toBeGreaterThanOrEqual(30);
  });

  it('calcule la puissance défensive orbitale', () => {
    const defense = {
      [ShipType.ORBITAL_THORN]: 2,
      [ShipType.CHITIN_BULWARK]: 1,
    };
    const power = computeDefensePower({ ships: defense, race: RaceType.CHITINIDS });
    expect(power).toBeGreaterThan(0);
  });

  it('renvoie un succès si l’attaquant domine', () => {
    const result = resolvePvpAttack({
      attackerShips: {
        [ShipType.BIOMASS_DREADNOUGHT]: 5,
      },
      defenderShips: {
        [ShipType.SPORAL_DRONE]: 10,
      },
      attackerRace: RaceType.MYCELIANS,
      defenderRace: RaceType.PHOTOSYNTHEX,
      targetResources: {
        [ResourceType.BIOMASS]: 10_000,
        [ResourceType.SAP]: 5_000,
      },
    });
    expect(result.outcome).toBe('SUCCESS');
    expect(result.loot[ResourceType.BIOMASS]).toBeGreaterThan(0);
  });

  it('limite le butin par la cargaison des survivants', () => {
    const result = resolvePvpAttack({
      attackerShips: {
        [ShipType.SYMBIOTIC_HARVESTER]: 10,
      },
      defenderShips: {},
      attackerRace: RaceType.MYCELIANS,
      defenderRace: RaceType.PHOTOSYNTHEX,
      targetResources: {
        [ResourceType.BIOMASS]: 1_000_000,
      },
    });
    expect(result.outcome).toBe('SUCCESS');
    const totalLoot = Object.values(result.loot).reduce((sum, v) => sum + (v ?? 0), 0);
    expect(totalLoot).toBeLessThanOrEqual(10 * 1_000);
  });

  it('renvoie un échec si l’attaquant est trop faible', () => {
    const result = resolvePvpAttack({
      attackerShips: {
        [ShipType.SPORAL_DRONE]: 2,
      },
      defenderShips: {
        [ShipType.BIOMASS_DREADNOUGHT]: 2,
      },
      attackerRace: RaceType.MYCELIANS,
      defenderRace: RaceType.CHITINIDS,
    });
    expect(result.outcome).toBe('FAILURE');
    expect(Object.values(result.lostShips).some((v) => (v ?? 0) > 0)).toBe(true);
  });

  it('résout l’espionnage selon la puissance de renseignement', () => {
    const success = resolveSpy({
      ships: { [ShipType.SHADOW_SPORE]: 10 },
      defensePower: 100,
    });
    expect(success.success).toBe(true);

    const failure = resolveSpy({
      ships: { [ShipType.SHADOW_SPORE]: 1 },
      defensePower: 10_000,
    });
    expect(failure.success).toBe(false);
  });
});
