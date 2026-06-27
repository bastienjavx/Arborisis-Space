import type { Type } from '@nestjs/common';
import { MaintenanceModule } from '../modules/queue/maintenance.module';
import { ProcessorsModule } from '../modules/queue/processors.module';
import { ProvisioningModule } from '../modules/provisioning/provisioning.module';

export const WORKER_ROLES = ['gameplay', 'provisioning', 'maintenance'] as const;

export type WorkerRole = (typeof WORKER_ROLES)[number];

export interface WorkerRoleConfig {
  modules: Type<unknown>[];
  name: string;
}

export function parseWorkerRole(value: string | undefined): WorkerRole {
  if (value && (WORKER_ROLES as readonly string[]).includes(value)) {
    return value as WorkerRole;
  }

  throw new Error(
    `WORKER_ROLE invalide ou manquant. Valeurs supportées : ${WORKER_ROLES.join(', ')}.`,
  );
}

export function resolveWorkerRoleConfig(value: string | undefined): WorkerRoleConfig {
  const role = parseWorkerRole(value);

  switch (role) {
    case 'gameplay':
      return { name: 'worker-gameplay', modules: [ProcessorsModule] };
    case 'provisioning':
      return { name: 'worker-provisioning', modules: [ProvisioningModule] };
    case 'maintenance':
      return { name: 'worker-maintenance', modules: [MaintenanceModule] };
  }
}
