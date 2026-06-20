import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import type { Env } from '../../common/config/env';
import { PROVISIONING_QUEUE, RECONCILE_UNIVERSES_JOB } from '../queue/queue.constants';

/** Intervalle du balayage de réconciliation des univers (capacité d'accueil). */
const RECONCILE_INTERVAL_MS = 2 * 60 * 1000;
/** Clé stable du scheduler BullMQ (dédup : un seul planning, quel que soit le nb d'instances). */
const RECONCILE_SCHEDULER_ID = 'provisioning-reconcile';

/**
 * Enregistre, au démarrage, un job répétable qui vérifie périodiquement qu'il reste
 * de la capacité d'accueil (au moins un univers ACTIVE non plein ou un provisioning
 * en cours). Sert de filet si le déclenchement à l'inscription a échoué.
 */
@Injectable()
export class ProvisioningReconciler implements OnApplicationBootstrap {
  private readonly logger = new Logger(ProvisioningReconciler.name);

  constructor(
    @InjectQueue(PROVISIONING_QUEUE) private readonly provisioningQueue: Queue,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const enabled = this.config.get('UNIVERSE_PROVISIONING_ENABLED', { infer: true }) === 'true';
    if (!enabled) {
      this.logger.debug('Provisioning désactivé ; réconciliateur non programmé.');
      return;
    }

    try {
      await this.provisioningQueue.upsertJobScheduler(
        RECONCILE_SCHEDULER_ID,
        { every: RECONCILE_INTERVAL_MS },
        {
          name: RECONCILE_UNIVERSES_JOB,
          data: {},
          opts: { removeOnComplete: true, removeOnFail: 100 },
        },
      );
      this.logger.log(
        `Réconciliateur d'univers programmé (toutes les ${RECONCILE_INTERVAL_MS / 1000}s).`,
      );
    } catch (error) {
      this.logger.error(error, "Impossible de programmer le réconciliateur d'univers.");
    }
  }
}
