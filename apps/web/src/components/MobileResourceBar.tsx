'use client';

import type { ResourceState } from '@arborisis/shared';
import { useIsMobile } from '@/lib/device';
import { ResourceBar } from './ResourceBar';

export function MobileResourceBar({ resources }: { resources: ResourceState }) {
  const mobile = useIsMobile();
  if (!mobile) return null;
  return <ResourceBar resources={resources} />;
}

export default MobileResourceBar;
