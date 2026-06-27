import { Logger, Module, OnApplicationBootstrap } from '@nestjs/common';
import { RuntimeCoreModule } from './runtime/runtime-core.module';
import { resolveWorkerRoleConfig } from './runtime/worker-role';

const roleConfig = resolveWorkerRoleConfig(process.env.WORKER_ROLE);

@Module({
  imports: [RuntimeCoreModule, ...roleConfig.modules],
})
export class WorkerModule implements OnApplicationBootstrap {
  private readonly logger = new Logger(WorkerModule.name);

  onApplicationBootstrap(): void {
    this.logger.log(`${roleConfig.name} démarré.`);
  }
}
