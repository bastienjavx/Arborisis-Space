import { Controller, Get } from '@nestjs/common';
import type { AuthUser, EmpireOverview } from '@arborisis/shared';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { EmpireService } from './empire.service';

@Controller('empire')
export class EmpireController {
  constructor(private readonly svc: EmpireService) {}

  @Get()
  overview(@CurrentUser() user: AuthUser): Promise<EmpireOverview> {
    return this.svc.getEmpireOverview(user.id);
  }
}
