import { Controller, Get, Param } from '@nestjs/common';
import { type AuthUser } from '@arborisis/shared';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { InventoryService } from './inventory.service';

@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}

  @Get()
  getAll(@CurrentUser() user: AuthUser) {
    return this.inventory.getUserInventory(user.id);
  }

  @Get('planet/:planetId')
  getPlanet(@CurrentUser() user: AuthUser, @Param('planetId') planetId: string) {
    return this.inventory.getPlanetInventory(user.id, planetId);
  }
}
