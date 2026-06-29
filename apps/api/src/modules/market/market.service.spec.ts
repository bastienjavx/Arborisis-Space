import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('MarketService', () => {
  it('casts candle enum parameters in the raw upsert SQL', () => {
    const source = readFileSync(join(__dirname, 'market.service.ts'), 'utf8');

    expect(source).toContain('${itemKey}::"ItemKey"');
    expect(source).toContain('${name}::"OhlcvInterval"');
  });
});
