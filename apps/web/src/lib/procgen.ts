/**
 * Moteur procédural déterministe d'Arborisis.
 *
 * Toute la variété visuelle (planètes, systèmes, étoiles) dérive d'une graine
 * issue des coordonnées `galaxie:système:position`. Conséquence : un monde donné
 * est *unique* mais *stable* — il a exactement le même aspect à chaque visite,
 * sans qu'aucune donnée d'apparence ne transite par le serveur. Les couleurs
 * réutilisent la palette organique du thème (canopée, sève, spore, écorce).
 */
import { PlanetType } from '@arborisis/shared';

/** Hash 32 bits déterministe (FNV-1a) d'une chaîne. */
function hashString(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Graine entière à partir de coordonnées de jeu. */
export function seedFromCoords(galaxy: number, system: number, position = 0): number {
  return hashString(`${galaxy}:${system}:${position}`);
}

/** PRNG mulberry32 — rapide, déterministe, bonne distribution. */
export function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Couleur HSL → hex, composantes 0..1 / 0..1 / 0..1. */
function hslToHex(h: number, s: number, l: number): string {
  const f = (n: number) => {
    const k = (n + h * 12) % 12;
    const a = s * Math.min(l, 1 - l);
    const c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(c * 255)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

/** Décale une teinte de base par un petit jitter seedé (en degrés / 360). */
function jitterHue(baseHueDeg: number, rng: () => number, spreadDeg: number): number {
  return ((baseHueDeg + (rng() - 0.5) * spreadDeg + 360) % 360) / 360;
}

export interface BiomePalette {
  /** Teinte de base (degrés) autour de laquelle varie le biome. */
  hue: number;
  /** Étalement de teinte appliqué par le jitter seedé. */
  spread: number;
  saturation: number;
  /** Niveaux de luminosité bas / moyen / haut du terrain. */
  lows: number;
  mids: number;
  highs: number;
  /** Couleur d'océan / mer de sève (null = monde sec). */
  ocean: { hue: number; sat: number; light: number } | null;
  /** Intensité du halo atmosphérique (0 = ténu, 1 = dense). */
  atmosphere: number;
  /** Émission propre du sol (mondes sporulés). */
  glow: number;
}

const BIOMES: Record<PlanetType, BiomePalette> = {
  // Monde verdoyant — canopée luxuriante, océans turquoise.
  [PlanetType.VERDANT]: {
    hue: 150,
    spread: 26,
    saturation: 0.62,
    lows: 0.16,
    mids: 0.34,
    highs: 0.7,
    ocean: { hue: 186, sat: 0.6, light: 0.22 },
    atmosphere: 0.85,
    glow: 0.04,
  },
  // Noyau minéral — roche ocre, veines de sève dorée.
  [PlanetType.MINERAL]: {
    hue: 34,
    spread: 18,
    saturation: 0.5,
    lows: 0.14,
    mids: 0.3,
    highs: 0.66,
    ocean: null,
    atmosphere: 0.32,
    glow: 0.05,
  },
  // Marécage de sève — humide, ambré, biomasse sombre.
  [PlanetType.SAP_RICH]: {
    hue: 96,
    spread: 30,
    saturation: 0.5,
    lows: 0.14,
    mids: 0.32,
    highs: 0.6,
    ocean: { hue: 38, sat: 0.62, light: 0.26 },
    atmosphere: 0.7,
    glow: 0.06,
  },
  // Nébuleuse sporale — violacée, luminescente.
  [PlanetType.SPORE_NEBULA]: {
    hue: 258,
    spread: 24,
    saturation: 0.58,
    lows: 0.16,
    mids: 0.4,
    highs: 0.74,
    ocean: null,
    atmosphere: 1,
    glow: 0.55,
  },
  // Monde désolé — gris hostile, désaturé.
  [PlanetType.BARREN]: {
    hue: 220,
    spread: 14,
    saturation: 0.08,
    lows: 0.12,
    mids: 0.26,
    highs: 0.56,
    ocean: null,
    atmosphere: 0.22,
    glow: 0.02,
  },
};

export interface PlanetProfile {
  /** Couleurs résolues (hex) injectées dans le shader. */
  colorLow: string;
  colorMid: string;
  colorHigh: string;
  colorOcean: string;
  colorAtmosphere: string;
  /** Niveau de l'eau / sève : 0 = sec, ~0.5 = océans étendus. */
  oceanLevel: number;
  /** Amplitude du relief déplacé sur la sphère. */
  relief: number;
  /** Fréquence du bruit de surface (densité des continents). */
  frequency: number;
  /** Couverture nuageuse (0..1, 0 = aucun nuage). */
  clouds: number;
  /** Quantité de calottes glaciaires aux pôles. */
  iceCaps: number;
  /** Émission propre (mondes sporulés). */
  glow: number;
  /** Densité du halo atmosphérique. */
  atmosphere: number;
  /** Inclinaison de l'axe (radians). */
  axialTilt: number;
  /** Vitesse de rotation propre. */
  spin: number;
  /** Système d'anneaux seedé (null = aucun). */
  rings: { inner: number; outer: number; tilt: number; color: string; opacity: number } | null;
  /** Lunes en orbite. */
  moons: { distance: number; size: number; speed: number; color: string; phase: number }[];
}

/**
 * Construit le profil complet d'une planète à partir de sa graine et de son type.
 * Déterministe : même (seed, type) → même planète.
 */
export function planetProfile(seed: number, type: PlanetType): PlanetProfile {
  const rng = makeRng(seed);
  const biome = BIOMES[type];

  const hue = jitterHue(biome.hue, rng, biome.spread);
  const sat = biome.saturation;
  const colorLow = hslToHex(hue, sat, biome.lows);
  const colorMid = hslToHex(hue, sat * 0.95, biome.mids);
  const colorHigh = hslToHex(hue, sat * 0.7, biome.highs);
  const colorOcean = biome.ocean
    ? hslToHex(jitterHue(biome.ocean.hue, rng, 16), biome.ocean.sat, biome.ocean.light)
    : colorLow;
  const colorAtmosphere = hslToHex(hue, Math.min(0.9, sat + 0.2), 0.55);

  const oceanLevel = biome.ocean ? 0.34 + rng() * 0.22 : 0;
  const relief = 0.05 + rng() * 0.09;
  const frequency = 1.6 + rng() * 2.4;
  const clouds = (biome.atmosphere > 0.4 ? 0.25 : 0) + rng() * biome.atmosphere * 0.45;
  const iceCaps = type === PlanetType.SPORE_NEBULA ? 0 : rng() * 0.5;
  const axialTilt = (rng() - 0.5) * 0.9;
  const spin = 0.03 + rng() * 0.06;

  // Anneaux : un peu plus probables sur les mondes minéraux et désolés.
  const ringChance = type === PlanetType.MINERAL || type === PlanetType.BARREN ? 0.55 : 0.3;
  const rings =
    rng() < ringChance
      ? {
          inner: 1.5 + rng() * 0.2,
          outer: 1.9 + rng() * 0.7,
          tilt: (rng() - 0.5) * 0.9,
          color: hslToHex(hue, 0.4, 0.6),
          opacity: 0.18 + rng() * 0.28,
        }
      : null;

  const moonCount = Math.floor(rng() * 3); // 0..2
  const moons = Array.from({ length: moonCount }).map(() => ({
    distance: 2.4 + rng() * 1.8,
    size: 0.06 + rng() * 0.1,
    speed: 0.2 + rng() * 0.4,
    color: hslToHex(jitterHue(36, rng, 60), 0.3, 0.55 + rng() * 0.2),
    phase: rng() * Math.PI * 2,
  }));

  return {
    colorLow,
    colorMid,
    colorHigh,
    colorOcean,
    colorAtmosphere,
    oceanLevel,
    relief,
    frequency,
    clouds,
    iceCaps,
    glow: biome.glow,
    atmosphere: biome.atmosphere,
    axialTilt,
    spin,
    rings,
    moons,
  };
}

/** Type de planète pseudo-déterministe pour une orbite vide (variété visuelle). */
export function typeFromSeed(seed: number): PlanetType {
  const rng = makeRng(seed ^ 0x9e3779b9);
  const types = [
    PlanetType.VERDANT,
    PlanetType.MINERAL,
    PlanetType.SAP_RICH,
    PlanetType.SPORE_NEBULA,
    PlanetType.BARREN,
  ];
  return types[Math.floor(rng() * types.length)];
}

export interface OrbitProfile {
  radius: number;
  /** Angle de départ sur l'orbite. */
  phase: number;
  /** Inclinaison du plan orbital (radians). */
  inclination: number;
  /** Excentricité — léger aplatissement de l'ellipse. */
  eccentricity: number;
  /** Vitesse angulaire. */
  speed: number;
  /** Taille de la planète. */
  size: number;
  /** Couleur de biome résolue. */
  color: string;
  /** Couleur d'émission / halo. */
  glow: string;
  type: PlanetType;
}

/**
 * Place une orbite à partir des coordonnées du slot. Chaque système a donc une
 * disposition propre (rayons, angles, inclinaisons différents), tout en restant
 * stable d'une visite à l'autre.
 */
export function orbitProfile(
  galaxy: number,
  system: number,
  position: number,
  type?: PlanetType,
): OrbitProfile {
  const seed = seedFromCoords(galaxy, system, position);
  const rng = makeRng(seed);
  const resolved = type ?? typeFromSeed(seed);
  const biome = BIOMES[resolved];

  // Le rayon croît globalement avec la position (planètes intérieures → extérieures)
  // mais avec un décalage seedé pour casser la régularité d'un système à l'autre.
  const radius = 2.1 + position * 0.62 + (rng() - 0.5) * 0.45;
  const hue = jitterHue(biome.hue, rng, biome.spread);

  return {
    radius,
    phase: rng() * Math.PI * 2,
    inclination: (rng() - 0.5) * 0.5,
    eccentricity: rng() * 0.18,
    speed: (0.12 + rng() * 0.1) / (0.6 + position * 0.18),
    size: 0.1 + rng() * 0.09,
    color: hslToHex(hue, biome.saturation, 0.5),
    glow: hslToHex(hue, Math.min(0.9, biome.saturation + 0.2), 0.6),
    type: resolved,
  };
}

export interface StarProfile {
  color: string;
  /** Couleur de la couronne. */
  corona: string;
  size: number;
  light: string;
}

/** Étoile centrale d'un système, seedée par ses coordonnées. */
export function starProfile(galaxy: number, system: number): StarProfile {
  const rng = makeRng(seedFromCoords(galaxy, system, 0));
  // Classes stellaires organiques : ambre, or, blanc-vert, et rares étoiles spore.
  const classes = [
    { hue: 40, sat: 0.7, light: 0.62 }, // ambre
    { hue: 48, sat: 0.62, light: 0.68 }, // or pâle
    { hue: 150, sat: 0.4, light: 0.7 }, // blanc-canopée
    { hue: 264, sat: 0.45, light: 0.66 }, // spore (rare)
  ];
  const pick = rng() < 0.12 ? classes[3] : classes[Math.floor(rng() * 3)];
  const hue = pick.hue / 360;
  return {
    color: hslToHex(hue, pick.sat, pick.light),
    corona: hslToHex(hue, pick.sat, pick.light - 0.18),
    size: 0.6 + rng() * 0.35,
    light: hslToHex(hue, pick.sat * 0.8, 0.6),
  };
}
