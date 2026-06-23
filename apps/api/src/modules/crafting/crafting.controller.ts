import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import { Request } from 'express';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { startCraftingSchema, type StartCraftingDto } from '@arborisis/shared';
import { CraftingService } from './crafting.service';

@Controller('crafting')
export class CraftingController {
  constructor(private readonly crafting: CraftingService) {}

  @Get('recipes')
  getRecipes() {
    return this.crafting.getRecipes();
  }

  @Get('jobs')
  getJobs(@Req() req: Request) {
    return this.crafting.getCraftingJobs(req.user!.id);
  }

  @Get('jobs/planet/:planetId')
  getPlanetJobs(@Req() req: Request, @Param('planetId') planetId: string) {
    return this.crafting.getCraftingJobs(req.user!.id, planetId);
  }

  @Post('start')
  start(
    @Req() req: Request,
    @Body(new ZodValidationPipe(startCraftingSchema)) dto: StartCraftingDto,
  ) {
    return this.crafting.startCrafting(req.user!.id, dto);
  }
}
