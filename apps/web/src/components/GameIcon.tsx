'use client';

import {
  LuLeaf,
  LuDroplets,
  LuPickaxe,
  LuSparkles,
  LuPackage,
  LuCircleDot,
  LuDiamond,
  LuGem,
  LuStar,
  LuShield,
  LuBrain,
  LuZap,
  LuFlaskConical,
  LuCircle,
  LuWrench,
  LuRocket,
  LuSprout,
  LuTriangleAlert,
  LuSwords,
  LuArrowLeftRight,
  LuTrophy,
  LuGift,
  LuTrendingUp,
  LuGamepad2,
  LuBell,
  LuLock,
  LuSearch,
} from 'react-icons/lu';

export type IconName =
  | 'leaf'
  | 'droplets'
  | 'pickaxe'
  | 'sparkles'
  | 'package'
  | 'circleDot'
  | 'diamond'
  | 'gem'
  | 'star'
  | 'shield'
  | 'brain'
  | 'zap'
  | 'flask'
  | 'circle'
  | 'wrench'
  | 'rocket'
  | 'sprout'
  | 'alertTriangle'
  | 'swords'
  | 'arrowLeftRight'
  | 'trophy'
  | 'gift'
  | 'trendingUp'
  | 'gamepad2'
  | 'bell'
  | 'lock'
  | 'search';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string; size?: number }>> = {
  leaf: LuLeaf,
  droplets: LuDroplets,
  pickaxe: LuPickaxe,
  sparkles: LuSparkles,
  package: LuPackage,
  circleDot: LuCircleDot,
  diamond: LuDiamond,
  gem: LuGem,
  star: LuStar,
  shield: LuShield,
  brain: LuBrain,
  zap: LuZap,
  flask: LuFlaskConical,
  circle: LuCircle,
  wrench: LuWrench,
  rocket: LuRocket,
  sprout: LuSprout,
  alertTriangle: LuTriangleAlert,
  swords: LuSwords,
  arrowLeftRight: LuArrowLeftRight,
  trophy: LuTrophy,
  gift: LuGift,
  trendingUp: LuTrendingUp,
  gamepad2: LuGamepad2,
  bell: LuBell,
  lock: LuLock,
  search: LuSearch,
};

/** Fallback emoji → icon mapping for legacy data */
const EMOJI_FALLBACK: Record<string, IconName> = {
  '🌿': 'leaf',
  '💧': 'droplets',
  '⛏️': 'pickaxe',
  '✨': 'sparkles',
  '📦': 'package',
  '🍄': 'circleDot',
  '🔷': 'diamond',
  '💎': 'gem',
  '🌟': 'star',
  '🛡️': 'shield',
  '🧠': 'brain',
  '⚡': 'zap',
  '⚗️': 'flask',
  '🔮': 'circle',
  '🏗️': 'wrench',
  '🔬': 'flask',
  '🚀': 'rocket',
  '🌱': 'sprout',
  '⚠️': 'alertTriangle',
  '⚔️': 'swords',
  '🛸': 'rocket',
  '💱': 'arrowLeftRight',
  '🏆': 'trophy',
  '🎁': 'gift',
  '📈': 'trendingUp',
  '👾': 'gamepad2',
  '🔔': 'bell',
  '🔒': 'lock',
  '🔍': 'search',
};

interface GameIconProps {
  name?: string;
  className?: string;
  size?: number;
}

export function GameIcon({ name, className, size = 16 }: GameIconProps) {
  if (!name) return null;

  // Resolve emoji fallback → icon name
  const resolvedName = EMOJI_FALLBACK[name] ?? name;
  const Icon = ICON_MAP[resolvedName];

  if (!Icon) {
    // If no mapping found, render a generic circle
    return <LuCircle className={className} size={size} />;
  }

  return <Icon className={className} size={size} />;
}
