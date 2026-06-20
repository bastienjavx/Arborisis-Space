import { AntiCheatService } from './anticheat.service';
import { AntiCheatEventType, SHARED_IP_THRESHOLD } from './anticheat.constants';

/* eslint-disable @typescript-eslint/no-explicit-any */

describe('AntiCheatService', () => {
  let prisma: any;
  let config: any;
  let service: AntiCheatService;

  beforeEach(() => {
    prisma = {
      antiCheatEvent: { create: jest.fn().mockResolvedValue({}) },
      accountIpLink: {
        upsert: jest.fn().mockResolvedValue({}),
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    config = { get: jest.fn(() => 'test-pepper') };
    service = new AntiCheatService(prisma, config);
  });

  it("persiste l'anomalie avec la sévérité fournie", async () => {
    await service.record({ type: 'X', severity: 'CRITICAL', userId: 'u1', detail: { a: 1 } });
    expect(prisma.antiCheatEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ type: 'X', severity: 'CRITICAL', userId: 'u1' }),
    });
  });

  it('ne jette jamais même si la base échoue (best-effort)', async () => {
    prisma.antiCheatEvent.create.mockRejectedValueOnce(new Error('db down'));
    await expect(service.record({ type: 'X', detail: {} })).resolves.toBeUndefined();
  });

  it('hache une IP de façon déterministe et non réversible', () => {
    const h1 = service.hashIp('203.0.113.7');
    const h2 = service.hashIp('203.0.113.7');
    expect(h1).toBe(h2);
    expect(h1).not.toContain('203.0.113.7');
    expect(h1).toHaveLength(64);
  });

  it('ignore les accès sans IP', async () => {
    await service.noteAccess('u1', undefined);
    expect(prisma.accountIpLink.upsert).not.toHaveBeenCalled();
  });

  it('signale une IP partagée par trop de comptes du même univers', async () => {
    const ipHash = service.hashIp('203.0.113.7');
    const links = Array.from({ length: SHARED_IP_THRESHOLD }, (_, i) => ({
      userId: `u${i}`,
      universeId: 'uni-1',
    }));
    prisma.accountIpLink.findMany.mockResolvedValueOnce(links);

    await service.noteAccess('u0', '203.0.113.7', 'uni-1');

    expect(prisma.accountIpLink.upsert).toHaveBeenCalled();
    expect(prisma.antiCheatEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: AntiCheatEventType.SHARED_IP,
        universeId: 'uni-1',
        detail: expect.objectContaining({ ipHash, count: SHARED_IP_THRESHOLD }),
      }),
    });
  });

  it('ne signale pas une IP utilisée par un seul compte', async () => {
    prisma.accountIpLink.findMany.mockResolvedValueOnce([{ userId: 'u0', universeId: 'uni-1' }]);
    await service.noteAccess('u0', '203.0.113.7', 'uni-1');
    expect(prisma.antiCheatEvent.create).not.toHaveBeenCalled();
  });

  it("ne compte pas les comptes d'un autre univers", async () => {
    prisma.accountIpLink.findMany.mockResolvedValueOnce([
      { userId: 'u0', universeId: 'uni-1' },
      { userId: 'u1', universeId: 'uni-2' },
      { userId: 'u2', universeId: 'uni-2' },
    ]);
    await service.noteAccess('u0', '203.0.113.7', 'uni-1');
    expect(prisma.antiCheatEvent.create).not.toHaveBeenCalled();
  });
});
