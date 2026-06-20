import { Logger } from '@nestjs/common';

interface GraphqlResponse<T> {
  data?: T;
  errors?: Array<{ message: string; extensions?: Record<string, unknown> }>;
}

interface ServiceCreateData {
  serviceCreate?: { id: string; name: string };
}

interface VariableUpsertData {
  variableUpsert?: { id: string };
}

interface ServiceInstanceDeployData {
  serviceInstanceDeploy?: { id: string };
}

interface ServiceDomainData {
  serviceDomain?: Array<{ domain: string }>;
}

interface ServiceData {
  service?: { name: string };
}

interface DeploymentStatusData {
  deployment?: { status: string };
}

const REQUEST_TIMEOUT_MS = 30_000;

/** Port interne fixe sur lequel chaque node API écoute (réseau privé Railway). */
export const INTERNAL_API_PORT = 4000;

/** Statuts terminaux de déploiement Railway (succès et échecs). */
const DEPLOYMENT_SUCCESS = 'SUCCESS';
const DEPLOYMENT_FAILURE_STATUSES = new Set(['FAILED', 'CRASHED', 'REMOVED', 'SKIPPED']);
const DEPLOYMENT_POLL_INTERVAL_MS = 5_000;

/**
 * Client GraphQL basique pour l'API Railway (backboard.railway.app).
 * Les mutations utilisées sont les noms courants documentés par Railway ;
 * elles sont volontairement isolées afin de pouvoir être mockées dans les tests.
 */
export class RailwayClient {
  private readonly logger = new Logger(RailwayClient.name);
  private readonly endpoint = 'https://backboard.railway.app/graphql/v2';

  constructor(private readonly token: string) {}

  async createServiceFromTemplate(
    projectId: string,
    environmentId: string | undefined,
    templateServiceId: string,
    name: string,
  ): Promise<string> {
    const query = environmentId
      ? `
      mutation ServiceCreate($projectId: String!, $environmentId: String!, $templateServiceId: String!, $name: String!) {
        serviceCreate(
          projectId: $projectId
          environmentId: $environmentId
          templateServiceId: $templateServiceId
          name: $name
        ) {
          id
          name
        }
      }
    `
      : `
      mutation ServiceCreate($projectId: String!, $templateServiceId: String!, $name: String!) {
        serviceCreate(
          projectId: $projectId
          templateServiceId: $templateServiceId
          name: $name
        ) {
          id
          name
        }
      }
    `;

    const variables: Record<string, unknown> = { projectId, templateServiceId, name };
    if (environmentId) variables.environmentId = environmentId;

    const result = await this.request<ServiceCreateData>(query, variables);
    const serviceId = result.data?.serviceCreate?.id;
    if (!serviceId) {
      throw new Error('Railway serviceCreate did not return a service id.');
    }
    this.logger.debug({ serviceId, name }, 'Service créé depuis le template Railway.');
    return serviceId;
  }

  async setServiceVariables(
    serviceId: string,
    environmentId: string | undefined,
    variables: Record<string, string>,
  ): Promise<void> {
    const query = environmentId
      ? `
      mutation VariableUpsert($serviceId: String!, $environmentId: String!, $variables: Json!) {
        variableUpsert(
          serviceId: $serviceId
          environmentId: $environmentId
          variables: $variables
        ) {
          id
        }
      }
    `
      : `
      mutation VariableUpsert($serviceId: String!, $variables: Json!) {
        variableUpsert(
          serviceId: $serviceId
          variables: $variables
        ) {
          id
        }
      }
    `;

    const requestVariables: Record<string, unknown> = { serviceId, variables };
    if (environmentId) requestVariables.environmentId = environmentId;

    const result = await this.request<VariableUpsertData>(query, requestVariables);
    if (!result.data?.variableUpsert?.id) {
      throw new Error('Railway variableUpsert did not return a variable id.');
    }
    this.logger.debug({ serviceId }, 'Variables Railway upsertées.');
  }

  async triggerDeployment(serviceId: string, environmentId: string | undefined): Promise<string> {
    const query = environmentId
      ? `
      mutation ServiceInstanceDeploy($serviceId: String!, $environmentId: String!) {
        serviceInstanceDeploy(serviceId: $serviceId, environmentId: $environmentId) {
          id
        }
      }
    `
      : `
      mutation ServiceInstanceDeploy($serviceId: String!) {
        serviceInstanceDeploy(serviceId: $serviceId) {
          id
        }
      }
    `;

    const variables: Record<string, unknown> = { serviceId };
    if (environmentId) variables.environmentId = environmentId;

    const result = await this.request<ServiceInstanceDeployData>(query, variables);
    const deploymentId = result.data?.serviceInstanceDeploy?.id;
    if (!deploymentId) {
      throw new Error('Railway serviceInstanceDeploy did not return a deployment id.');
    }
    this.logger.debug({ serviceId, deploymentId }, 'Déploiement Railway déclenché.');
    return deploymentId;
  }

  /** Fixe le nombre de réplicas du service (instance) provisionné. */
  async setServiceReplicas(
    serviceId: string,
    environmentId: string | undefined,
    numReplicas: number,
  ): Promise<void> {
    const query = environmentId
      ? `
      mutation ServiceInstanceUpdate($serviceId: String!, $environmentId: String!, $input: ServiceInstanceUpdateInput!) {
        serviceInstanceUpdate(serviceId: $serviceId, environmentId: $environmentId, input: $input)
      }
    `
      : `
      mutation ServiceInstanceUpdate($serviceId: String!, $input: ServiceInstanceUpdateInput!) {
        serviceInstanceUpdate(serviceId: $serviceId, input: $input)
      }
    `;

    const variables: Record<string, unknown> = { serviceId, input: { numReplicas } };
    if (environmentId) variables.environmentId = environmentId;

    await this.request(query, variables);
    this.logger.debug({ serviceId, numReplicas }, 'Réplicas du service Railway mis à jour.');
  }

  /** Renvoie le statut courant d'un déploiement Railway (BUILDING, DEPLOYING, SUCCESS…). */
  async getDeploymentStatus(deploymentId: string): Promise<string> {
    const query = `
      query Deployment($deploymentId: String!) {
        deployment(id: $deploymentId) {
          status
        }
      }
    `;
    const result = await this.request<DeploymentStatusData>(query, { deploymentId });
    const status = result.data?.deployment?.status;
    if (!status) {
      throw new Error('Railway deployment query did not return a status.');
    }
    return status;
  }

  /**
   * Attend qu'un déploiement atteigne le statut SUCCESS (node sain et routable).
   * Throw si le déploiement échoue ou si le délai `timeoutMs` est dépassé — l'appelant
   * laisse alors l'univers en PROVISIONING (aucun joueur n'y est routé).
   */
  async waitForDeployment(deploymentId: string, timeoutMs: number): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    for (;;) {
      const status = await this.getDeploymentStatus(deploymentId);
      if (status === DEPLOYMENT_SUCCESS) {
        this.logger.debug({ deploymentId }, 'Déploiement Railway sain (SUCCESS).');
        return;
      }
      if (DEPLOYMENT_FAILURE_STATUSES.has(status)) {
        throw new Error(`Railway deployment ${deploymentId} a échoué (statut ${status}).`);
      }
      if (Date.now() >= deadline) {
        throw new Error(
          `Railway deployment ${deploymentId} non sain après ${timeoutMs}ms (dernier statut ${status}).`,
        );
      }
      await this.sleep(DEPLOYMENT_POLL_INTERVAL_MS);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Renvoie l'URL interne d'un node d'univers, joignable par le proxy web via le
   * **réseau privé Railway**. Les nodes provisionnés n'ont PAS de domaine public :
   * le joueur reste sur le domaine du service web, qui proxifie en privé.
   *
   * 1. Si un domaine public existe malgré tout (config manuelle), on le préfère.
   * 2. Sinon : `http://<serviceName>.railway.internal:<port>` (DNS privé Railway).
   *    Le node doit donc avoir un nom DNS-safe et écouter sur `INTERNAL_API_PORT`
   *    (forcé via la variable PORT à la création du service).
   */
  async getServiceUrl(serviceId: string): Promise<string> {
    const domainQuery = `
      query ServiceDomain($serviceId: String!) {
        serviceDomain(serviceId: $serviceId) {
          domain
        }
      }
    `;

    const domainResult = await this.request<ServiceDomainData>(domainQuery, { serviceId });
    const domains = domainResult.data?.serviceDomain;
    if (domains && domains.length > 0 && domains[0]?.domain) {
      return `https://${domains[0].domain}`;
    }

    const serviceQuery = `
      query Service($serviceId: String!) {
        service(id: $serviceId) {
          name
        }
      }
    `;
    const serviceResult = await this.request<ServiceData>(serviceQuery, { serviceId });
    const serviceName = serviceResult.data?.service?.name ?? `service-${serviceId}`;
    return `http://${serviceName}.railway.internal:${INTERNAL_API_PORT}`;
  }

  private async request<T>(
    query: string,
    variables: Record<string, unknown>,
  ): Promise<GraphqlResponse<T>> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify({ query, variables }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const text = await response.text().catch(() => 'No body');
        throw new Error(`Railway HTTP ${response.status}: ${text}`);
      }

      const result = (await response.json()) as GraphqlResponse<T>;

      if (result.errors && result.errors.length > 0) {
        const messages = result.errors.map((e) => e.message).join('; ');
        throw new Error(`Railway GraphQL errors: ${messages}`);
      }

      return result;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Railway request timed out after ${REQUEST_TIMEOUT_MS}ms`);
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
}
