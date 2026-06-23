import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import type {
  AuthUser,
  CreateDiplomaticOfferDto,
  DecideDiplomaticOfferDto,
  DiplomaticOfferView,
  DiplomaticRelationView,
} from '@arborisis/shared';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { DiplomacyService } from './diplomacy.service';

@Controller('diplomacy')
export class DiplomacyController {
  constructor(private readonly svc: DiplomacyService) {}

  @Get('relations')
  getRelations(@CurrentUser() user: AuthUser): Promise<DiplomaticRelationView[]> {
    return this.svc.getRelations(user);
  }

  @Get('offers')
  getOffers(@CurrentUser() user: AuthUser): Promise<DiplomaticOfferView[]> {
    return this.svc.getOffers(user);
  }

  @Post('offers')
  createOffer(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateDiplomaticOfferDto,
  ): Promise<DiplomaticOfferView> {
    return this.svc.createOffer(user, dto);
  }

  @Patch('offers/:id/decide')
  @HttpCode(204)
  async decideOffer(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DecideDiplomaticOfferDto,
  ): Promise<void> {
    await this.svc.decideOffer(user, id, dto);
  }

  @Delete('offers/:id')
  @HttpCode(204)
  async withdrawOffer(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.svc.withdrawOffer(user, id);
  }

  @Delete('relations/:id')
  @HttpCode(204)
  async breakRelation(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.svc.breakRelation(user, id);
  }
}
