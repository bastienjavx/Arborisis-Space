'use client';

import Image from 'next/image';
import { useState } from 'react';
import { GameIcon } from './GameIcon';
import type { GameVisualAsset } from '@/lib/gameVisualAssets';

interface GameAssetImageProps {
  asset?: GameVisualAsset;
  fallbackIcon?: string;
  className?: string;
  imageClassName?: string;
  iconClassName?: string;
  sizes?: string;
}

export function GameAssetImage({
  asset,
  fallbackIcon,
  className = 'h-12 w-12 rounded-lg',
  imageClassName = '',
  iconClassName = 'h-5 w-5',
  sizes = '64px',
}: GameAssetImageProps) {
  const [failed, setFailed] = useState(false);
  const icon = fallbackIcon ?? asset?.fallbackIcon;

  return (
    <span
      className={`relative grid shrink-0 place-items-center overflow-hidden border border-canopy-700/25 bg-bark-950/60 text-canopy-300/65 ${className}`}
    >
      {asset && !failed ? (
        <Image
          src={asset.src}
          alt={asset.alt}
          fill
          sizes={sizes}
          className={`object-cover ${imageClassName}`}
          onError={() => setFailed(true)}
        />
      ) : (
        <GameIcon name={icon} className={iconClassName} />
      )}
    </span>
  );
}
