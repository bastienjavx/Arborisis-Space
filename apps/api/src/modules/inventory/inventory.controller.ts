import { Controller, Get, Param, Req } from '@nestjs/common';
import { Request } from 'express';
import { InventoryService } from './inventory.service';

@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}

  @Get()
  getAll(@Req() req: Request) {
    return this.inventory.getUserInventory(req.user!.id);
  }

  @Get('planet/:planetId')
  getPlanet(@Req() req: Request, @Param('planetId') planetId: string) {
    return this.inventory.getPlanetInventory(req.user!.id, planetId);
  }
}
