import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UniverseStatus, type Universe } from '@prisma/client';
import type { UniverseView } from '@arborisis/shared';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../common/prisma/prisma.service';
import { UniverseService } from '../universe/universe.service';
import type { Env } from '../../common/config/env';
import { RailwayClient } from './railway.client';

/**
 * Ordonne le provisioning d'un nouvel univers via l'API Railway.
 * L'opération est asynchrone : le statut passe à PROVISIONING puis ACTIVE.
 */
@Injectable()
export class ProvisioningService {
  private readonly logger = new Logger(ProvisioningService.name);

  constructor(
    private readonly config: ConfigService<Env, true>,
    private readonly prisma: PrismaService,
    private readonly universeService: UniverseService,
  ) {}

  /**
   * Provisionne un nouvel univers en dupliquant le service API template Railway.
   * Retourne l'univers créé, ou `null` si le provisioning est désactivé/incomplet.
   * Si un univers est déjà en PROVISIONING, le retourne tel quel (idempotence).
   */
  async provisionUniverse(): Promise<UniverseView | null> {
    const enabled = this.config.get('UNIVERSE_PROVISIONING_ENABLED', { infer: true }) === 'true';
    const token = this.config.get('RAILWAY_API_TOKEN', { infer: true });
    const projectId = this.config.get('RAILWAY_PROJECT_ID', { infer: true });
    const templateServiceId = this.config.get('RAILWAY_SERVICE_TEMPLATE_ID', { infer: true });
    const environmentId = this.config.get('RAILWAY_ENVIRONMENT_ID', { infer: true });
    const maxPlayers = this.config.get('UNIVERSE_MAX_PLAYERS', { infer: true });

    if (!enabled) {
      this.logger.debug('Provisioning univers désactivé.');
      return null;
    }

    if (!token || !projectId || !templateServiceId) {
      this.logger.warn(
        'Provisioning univers activé mais configuration Railway incomplète (token, projectId ou templateServiceId manquant).',
      );
      return null;
    }

    let universe: Universe;

    try {
      const result = await this.prisma.serializable(async (tx) => {
        const existing = await tx.universe.findFirst({
          where: { status: UniverseStatus.PROVISIONING },
        });
        if (existing) {
          return { universe: existing, isExisting: true };
        }

        const created = await tx.universe.create({
          data: {
            slug: randomUUID(),
            name: `Univers ${new Date().toISOString()}`,
            internalApiUrl: '', // temporaire, mis à jour après création du service
            maxPlayers,
            status: UniverseStatus.PROVISIONING,
          },
        });
        return { universe: created, isExisting: false };
      });

      if (result.isExisting) {
        this.logger.debug(
          { universeId: result.universe.id },
          'Univers déjà en cours de provisioning ; aucune action.',
        );
        return this.universeService.toView(result.universe);
      }

      universe = result.universe;
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        const existing = await this.prisma.universe.findFirst({
          where: { status: UniverseStatus.PROVISIONING },
        });
        if (existing) {
          this.logger.debug(
            { universeId: existing.id },
            'Conflit de slug résolu : univers déjà en cours de provisioning.',
          );
          return this.universeService.toView(existing);
        }
      }
      this.logger.error(error, "Échec de la création de l'univers en base.");
      return null;
    }

    try {
      const client = this.newRailwayClient(token);

      const serviceId = await client.createServiceFromTemplate(
        projectId,
        environmentId,
        templateServiceId,
        universe.name,
      );

      await client.setServiceVariables(serviceId, environmentId, this.buildVariables());
      await client.triggerDeployment(serviceId, environmentId);
      const internalApiUrl = await client.getServiceUrl(serviceId);

      const updated = await this.prisma.universe.update({
        where: { id: universe.id },
        data: {
          internalApiUrl,
          status: UniverseStatus.ACTIVE,
        },
      });

      this.logger.log(
        { universeId: updated.id, serviceId, internalApiUrl },
        'Univers provisionné avec succès.',
      );
      return this.universeService.toView(updated);
    } catch (error) {
      this.logger.error(
        { universeId: universe.id, err: error },
        "Échec du provisioning Railway ; l'univers reste en PROVISIONING.",
      );
      return null;
    }
  }

  private newRailwayClient(token: string): RailwayClient {
    return new RailwayClient(token);
  }

  private buildVariables(): Record<string, string> {
    // Toutes les instances API sont stateless et doivent PARTAGER les mêmes secrets
    // JWT : un token émis par l'API meta doit être validable par l'instance de
    // l'univers provisionné. Générer des secrets aléatoires casserait l'auth (401).
    return {
      DATABASE_URL: this.config.get('DATABASE_URL', { infer: true }),
      REDIS_URL: this.config.get('REDIS_URL', { infer: true }),
      JWT_ACCESS_SECRET: this.config.get('JWT_ACCESS_SECRET', { infer: true }),
      JWT_REFRESH_SECRET: this.config.get('JWT_REFRESH_SECRET', { infer: true }),
      WEB_ORIGIN: this.config.get('WEB_ORIGIN', { infer: true }),
      NODE_ENV: 'production',
    };
  }

  private isUniqueViolation(error: unknown): boolean {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
  }
}
