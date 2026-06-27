import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('AppModule runtime boundaries', () => {
  it('does not register BullMQ consumers in the HTTP API runtime', () => {
    const source = readFileSync(join(__dirname, 'app.module.ts'), 'utf8');

    expect(source).not.toContain('ProcessorsModule');
    expect(source).not.toContain('ProvisioningModule');
  });
});
