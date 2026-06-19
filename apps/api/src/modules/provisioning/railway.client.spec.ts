import { RailwayClient } from './railway.client';

describe('RailwayClient', () => {
  const token = 'test-token';
  let client: RailwayClient;
  let fetchSpy: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    client = new RailwayClient(token);
    fetchSpy = jest.fn();
    global.fetch = fetchSpy;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('createServiceFromTemplate', () => {
    it("envoie l'en-tête Authorization Bearer", async () => {
      fetchSpy.mockResolvedValueOnce(
        new Response(JSON.stringify({ data: { serviceCreate: { id: 'svc-1', name: 'svc' } } }), {
          status: 200,
        }),
      );

      await client.createServiceFromTemplate('project', 'env', 'template', 'name');

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const requestInit = fetchSpy.mock.calls[0]![1]! as RequestInit;
      const headers = requestInit.headers as Record<string, string>;
      expect(headers).toMatchObject({
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      });
    });

    it('lève une erreur explicite en cas de réponse GraphQL en erreur', async () => {
      fetchSpy.mockResolvedValueOnce(
        new Response(JSON.stringify({ errors: [{ message: 'Invalid template' }] }), {
          status: 200,
        }),
      );

      await expect(
        client.createServiceFromTemplate('project', 'env', 'template', 'name'),
      ).rejects.toThrow('Railway GraphQL errors: Invalid template');
    });
  });

  describe('timeout', () => {
    it('lève une erreur explicite après 30 secondes', async () => {
      jest.useFakeTimers();
      fetchSpy.mockImplementation((_input, init) => {
        return new Promise<never>((_, reject) => {
          const signal = init?.signal as AbortSignal | undefined;
          const abort = () => {
            const err = new Error('AbortError');
            err.name = 'AbortError';
            reject(err);
          };
          if (signal?.aborted) {
            abort();
            return;
          }
          signal?.addEventListener('abort', abort);
        });
      });

      const promise = client.createServiceFromTemplate('project', 'env', 'template', 'name');
      jest.advanceTimersByTime(30_000);

      await expect(promise).rejects.toThrow('Railway request timed out after 30000ms');

      jest.useRealTimers();
    });
  });

  describe('getServiceUrl', () => {
    it('retourne https://<domain> quand Railway fournit un domaine', async () => {
      fetchSpy.mockResolvedValue(
        new Response(JSON.stringify({ data: { serviceDomain: [{ domain: 'api.test.app' }] } }), {
          status: 200,
        }),
      );

      const url = await client.getServiceUrl('svc-1');

      expect(url).toBe('https://api.test.app');
    });

    it('fallback sur http://<serviceName>:4000 sans domaine', async () => {
      fetchSpy
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ data: { serviceDomain: [] } }), { status: 200 }),
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ data: { service: { name: 'arborisis-api' } } }), {
            status: 200,
          }),
        );

      const url = await client.getServiceUrl('svc-1');

      expect(url).toBe('http://arborisis-api:4000');
    });
  });
});
