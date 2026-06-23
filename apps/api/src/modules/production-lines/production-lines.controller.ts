import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import {
  createProductionLineSchema,
  type AuthUser,
  type CreateProductionLineDto,
  type UpdateProductionLineDto,
  updateProductionLineSchema,
} from '@arborisis/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ProductionLinesService } from './production-lines.service';

@Controller('production-lines')
export class ProductionLinesController {
  constructor(private readonly productionLines: ProductionLinesService) {}

  @Get()
  getAll(@CurrentUser() user: AuthUser) {
    return this.productionLines.getLines(user.id);
  }

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(createProductionLineSchema)) dto: CreateProductionLineDto,
  ) {
    return this.productionLines.createLine(user.id, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateProductionLineSchema)) dto: UpdateProductionLineDto,
  ) {
    return this.productionLines.updateLine(user.id, id, dto);
  }

  @Delete(':id')
  delete(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.productionLines.deleteLine(user.id, id);
  }
}
