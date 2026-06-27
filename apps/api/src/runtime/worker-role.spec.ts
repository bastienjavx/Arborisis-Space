import { MaintenanceModule } from '../modules/queue/maintenance.module';
import { ProcessorsModule } from '../modules/queue/processors.module';
import { ProvisioningModule } from '../modules/provisioning/provisioning.module';
import { parseWorkerRole, resolveWorkerRoleConfig } from './worker-role';

describe('worker role routing', () => {
  it('routes gameplay workers to BullMQ gameplay consumers', () => {
    expect(resolveWorkerRoleConfig('gameplay')).toEqual({
      name: 'worker-gameplay',
      modules: [ProcessorsModule],
    });
  });

  it('routes provisioning workers only to provisioning consumers', () => {
    expect(resolveWorkerRoleConfig('provisioning')).toEqual({
      name: 'worker-provisioning',
      modules: [ProvisioningModule],
    });
  });

  it('routes maintenance workers only to global sweeps', () => {
    expect(resolveWorkerRoleConfig('maintenance')).toEqual({
      name: 'worker-maintenance',
      modules: [MaintenanceModule],
    });
  });

  it('fails fast when WORKER_ROLE is missing or unsupported', () => {
    expect(() => parseWorkerRole(undefined)).toThrow('WORKER_ROLE invalide');
    expect(() => parseWorkerRole('api')).toThrow('WORKER_ROLE invalide');
  });
});
