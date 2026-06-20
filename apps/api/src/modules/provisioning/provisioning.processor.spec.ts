import { UniverseStatus } from '@prisma/client';
import type { Job } from 'bullmq';
import { ProvisioningProcessor } from './provisioning.processor';
import { PROVISION_UNIVERSE_JOB, RECONCILE_UNIVERSES_JOB } from '../queue/queue.constants';

/* eslint-disable @typescript-eslint/no-explicit-any */

describe('ProvisioningProcessor', () => {
  let provisioningService: any;
  let prisma: any;
  let processor: ProvisioningProcessor;

  beforeEach(() => {
    provisioningService = {
      provisionUniverse: jest.fn().mockResolvedValue(undefined),
      reconcile: jest.fn().mockResolvedValue(undefined),
    };
    prisma = {
      universe: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };

    processor = new ProvisioningProcessor(provisioningService, prisma);
  });

  describe('process', () => {
    it('appelle ProvisioningService.provisionUniverse pour un job de provisioning', async () => {
      const job = { id: 'job-1', name: PROVISION_UNIVERSE_JOB } as Job;

      await processor.process(job);

      expect(provisioningService.provisionUniverse).toHaveBeenCalled();
    });

    it('appelle ProvisioningService.reconcile pour un job de réconciliation', async () => {
      const job = { id: 'job-r', name: RECONCILE_UNIVERSES_JOB } as Job;

      await processor.process(job);

      expect(provisioningService.reconcile).toHaveBeenCalled();
      expect(provisioningService.provisionUniverse).not.toHaveBeenCalled();
    });

    it('ignore les jobs non provisioning', async () => {
      const job = { id: 'job-2', name: 'other.job' } as Job;

      await processor.process(job);

      expect(provisioningService.provisionUniverse).not.toHaveBeenCalled();
      expect(provisioningService.reconcile).not.toHaveBeenCalled();
    });
  });

  describe('onFailed', () => {
    it("passe l'univers PROVISIONING en FAILED après toutes les tentatives", async () => {
      const job = {
        id: 'job-1',
        name: PROVISION_UNIVERSE_JOB,
        attemptsMade: 3,
        opts: { attempts: 3 },
      } as unknown as Job;

      await processor.onFailed(job, new Error('Railway down'));

      expect(prisma.universe.updateMany).toHaveBeenCalledWith({
        where: { status: UniverseStatus.PROVISIONING },
        data: { status: UniverseStatus.FAILED },
      });
    });

    it("ne change pas le statut tant qu'il reste des tentatives", async () => {
      const job = {
        id: 'job-1',
        name: PROVISION_UNIVERSE_JOB,
        attemptsMade: 1,
        opts: { attempts: 3 },
      } as unknown as Job;

      await processor.onFailed(job, new Error('Railway down'));

      expect(prisma.universe.updateMany).not.toHaveBeenCalled();
    });
  });
});
