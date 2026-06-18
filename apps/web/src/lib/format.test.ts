import { ResourceType } from '@arborisis/shared';
import { formatCost, formatDuration, formatNumber, resourceLabel, secondsUntil } from './format';

describe('format', () => {
  describe('resourceLabel', () => {
    it('returns French labels', () => {
      expect(resourceLabel(ResourceType.BIOMASS)).toBe('Biomasse');
      expect(resourceLabel(ResourceType.SAP)).toBe('Sève');
    });
  });

  describe('formatNumber', () => {
    it('floors and formats with French locale', () => {
      expect(formatNumber(1234.7)).toMatch(/1[\u202F\s]234/);
      expect(formatNumber(0)).toBe('0');
    });
  });

  describe('formatCost', () => {
    it('joins positive resources', () => {
      const cost = {
        [ResourceType.BIOMASS]: 60,
        [ResourceType.MINERALS]: 15,
        [ResourceType.SAP]: 0,
        [ResourceType.SPORES]: 0,
      };
      expect(formatCost(cost)).toBe('60 Biomasse · 15 Minéraux');
    });

    it('returns Gratuit when empty', () => {
      const cost = {
        [ResourceType.BIOMASS]: 0,
        [ResourceType.MINERALS]: 0,
        [ResourceType.SAP]: 0,
        [ResourceType.SPORES]: 0,
      };
      expect(formatCost(cost)).toBe('Gratuit');
    });
  });

  describe('formatDuration', () => {
    it('formats less than a day', () => {
      expect(formatDuration(3661)).toBe('01:01:01');
    });

    it('formats days', () => {
      expect(formatDuration(90061)).toBe('1j 01:01:01');
    });

    it('floors negative to zero', () => {
      expect(formatDuration(-5)).toBe('00:00:00');
    });
  });

  describe('secondsUntil', () => {
    it('computes seconds from now', () => {
      const target = new Date(Date.now() + 5000).toISOString();
      expect(secondsUntil(target)).toBeCloseTo(5, 0);
    });
  });
});
