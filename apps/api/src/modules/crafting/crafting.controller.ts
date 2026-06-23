import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { startCraftingSchema, type AuthUser, type StartCraftingDto } from '@arborisis/shared';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CraftingService } from './crafting.service';

@Controller('crafting')
export class CraftingController {
  constructor(private readonly crafting: CraftingService) {}

  @Get('recipes')
  getRecipes() {
    return this.crafting.getRecipes();
  }

  @Get('jobs')
  getJobs(@CurrentUser() user: AuthUser) {
    return this.crafting.getCraftingJobs(user.id);
  }

  @Get('jobs/planet/:planetId')
  getPlanetJobs(@CurrentUser() user: AuthUser, @Param('planetId') planetId: string) {
    return this.crafting.getCraftingJobs(user.id, planetId);
  }

  @Post('start')
  start(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(startCraftingSchema)) dto: StartCraftingDto,
  ) {
    return this.crafting.startCrafting(user.id, dto);
  }
}
