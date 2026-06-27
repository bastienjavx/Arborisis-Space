'use client';

import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

interface VirtualListProps<T> {
  items: T[];
  estimateSize: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  keyExtractor: (item: T, index: number) => string;
  overscan?: number;
  className?: string;
  empty?: React.ReactNode;
  loading?: boolean;
}

export function VirtualList<T>({
  items,
  estimateSize,
  renderItem,
  keyExtractor,
  overscan = 5,
  className = '',
  empty,
  loading,
}: VirtualListProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan,
  });

  if (loading) {
    return (
      <div className={`grid min-h-48 place-items-center text-sm text-canopy-100/50 ${className}`}>
        Chargement…
      </div>
    );
  }

  if (items.length === 0 && empty) {
    return <div className={className}>{empty}</div>;
  }

  return (
    <div ref={parentRef} className={`overflow-auto ${className}`}>
      <div
        style={{ height: `${virtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const item = items[virtualItem.index];
          if (!item) return null;
          return (
            <div
              key={keyExtractor(item, virtualItem.index)}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              {renderItem(item, virtualItem.index)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
