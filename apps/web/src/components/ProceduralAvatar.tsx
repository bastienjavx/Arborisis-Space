'use client';

import { useEffect, useRef } from 'react';

interface ProceduralAvatarProps {
  seed: string;
  color: string;
  className?: string;
}

function seedHash(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function randomGenerator(seed: number): () => number {
  let state = seed || 1;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function hexToRgb(hex: string): [number, number, number] {
  const normalized = /^#[0-9a-f]{6}$/i.test(hex) ? hex.slice(1) : '22c55e';
  return [
    Number.parseInt(normalized.slice(0, 2), 16),
    Number.parseInt(normalized.slice(2, 4), 16),
    Number.parseInt(normalized.slice(4, 6), 16),
  ];
}

export function ProceduralAvatar({ seed, color, className = '' }: ProceduralAvatarProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const size = 224;
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d');
    if (!context) return;

    const random = randomGenerator(seedHash(seed || 'arborisis'));
    const [red, green, blue] = hexToRgb(color);
    const background = context.createRadialGradient(112, 92, 8, 112, 112, 150);
    background.addColorStop(0, `rgba(${red}, ${green}, ${blue}, .56)`);
    background.addColorStop(
      0.55,
      `rgba(${Math.round(red * 0.35)}, ${Math.round(green * 0.35)}, ${Math.round(blue * 0.35)}, 1)`,
    );
    background.addColorStop(1, '#06110c');
    context.fillStyle = background;
    context.fillRect(0, 0, size, size);

    context.globalCompositeOperation = 'screen';
    for (let index = 0; index < 13; index++) {
      const startAngle = random() * Math.PI * 2;
      const endAngle = startAngle + (random() - 0.5) * 2.4;
      const innerRadius = 8 + random() * 28;
      const outerRadius = 72 + random() * 54;
      const startX = 112 + Math.cos(startAngle) * innerRadius;
      const startY = 112 + Math.sin(startAngle) * innerRadius;
      const endX = 112 + Math.cos(endAngle) * outerRadius;
      const endY = 112 + Math.sin(endAngle) * outerRadius;
      context.beginPath();
      context.moveTo(startX, startY);
      context.bezierCurveTo(
        112 + (random() - 0.5) * 100,
        112 + (random() - 0.5) * 100,
        112 + (random() - 0.5) * 165,
        112 + (random() - 0.5) * 165,
        endX,
        endY,
      );
      context.strokeStyle = `rgba(${Math.min(255, red + 80)}, ${Math.min(255, green + 80)}, ${Math.min(255, blue + 80)}, ${0.18 + random() * 0.38})`;
      context.lineWidth = 1.5 + random() * 5;
      context.lineCap = 'round';
      context.stroke();
    }

    for (let index = 0; index < 24; index++) {
      const angle = random() * Math.PI * 2;
      const radius = Math.sqrt(random()) * 88;
      const x = 112 + Math.cos(angle) * radius;
      const y = 112 + Math.sin(angle) * radius;
      const nodeRadius = 1.5 + random() * 7;
      const glow = context.createRadialGradient(x, y, 0, x, y, nodeRadius * 2.8);
      glow.addColorStop(0, `rgba(225, 255, 235, ${0.5 + random() * 0.4})`);
      glow.addColorStop(0.3, `rgba(${red}, ${green}, ${blue}, .55)`);
      glow.addColorStop(1, `rgba(${red}, ${green}, ${blue}, 0)`);
      context.fillStyle = glow;
      context.beginPath();
      context.arc(x, y, nodeRadius * 2.8, 0, Math.PI * 2);
      context.fill();
    }
    context.globalCompositeOperation = 'source-over';
  }, [color, seed]);

  return (
    <canvas
      ref={canvasRef}
      className={`block h-full w-full ${className}`}
      role="img"
      aria-label={`Motif organique procédural de ${seed}`}
    />
  );
}
