import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import type {
  AuthUser,
  CreateUniverseDto,
  ListUniversesView,
  UniverseView,
} from '@arborisis/shared';
import { createUniverseSchema, UserRole } from '@arborisis/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import type { ResolvedUniverse } from './universe.types';
import { UniverseService } from './universe.service';

@Controller('universes')
export class UniverseController {
  constructor(private readonly universeService: UniverseService) {}

  @Public()
  @Get()
  async list(): Promise<ListUniversesView> {
    return this.universeService.listActive();
  }

  @Public()
  @Get(':id/resolve')
  async resolve(@Param('id') id: string): Promise<ResolvedUniverse> {
    const universe = await this.universeService.findById(id);
    if (!universe) throw new NotFoundException('Univers introuvable.');
    return { internalApiUrl: universe.internalApiUrl };
  }
}

@Controller('admin/universes')
export class AdminUniverseController {
  constructor(private readonly universeService: UniverseService) {}

  @Post()
  async create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(createUniverseSchema)) dto: CreateUniverseDto,
  ): Promise<UniverseView> {
    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Réservé aux administrateurs.');
    }

    const created = await this.universeService.create(dto);
    return this.universeService.toView(created);
  }
}
