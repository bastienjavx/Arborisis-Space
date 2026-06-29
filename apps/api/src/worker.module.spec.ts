const envBackup = { ...process.env };

const baseEnv = {
  NODE_ENV: 'test',
  SERVICE_ROLE: 'worker',
  DATABASE_URL: 'postgresql://user:password@localhost:5432/arborisis',
  REDIS_URL: 'redis://localhost:6379',
  JWT_ACCESS_SECRET: 'x'.repeat(32),
  JWT_REFRESH_SECRET: 'y'.repeat(32),
  WEB_ORIGIN: 'http://localhost:3000',
};

describe('WorkerModule runtime boundaries', () => {
  afterEach(() => {
    process.env = { ...envBackup };
    jest.resetModules();
  });

  it.each(['gameplay', 'maintenance', 'provisioning'] as const)(
    'compiles the %s worker dependency graph',
    async (role) => {
      jest.resetModules();
      process.env = { ...envBackup, ...baseEnv, WORKER_ROLE: role };

      await jest.isolateModulesAsync(async () => {
        const { Test } = await import('@nestjs/testing');
        const { WorkerModule } = await import('./worker.module');

        const moduleRef = await Test.createTestingModule({
          imports: [WorkerModule],
        }).compile();

        await moduleRef.close();
      });
    },
    30_000,
  );
});
