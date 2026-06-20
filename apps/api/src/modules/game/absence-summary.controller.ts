import { Controller, Post, UseGuards } from '@nestjs/common';
import type { AbsenceSummaryView, AuthUser } from '@arborisis/shared';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AbsenceSummaryService } from './absence-summary.service';

@Controller('absence-summary')
@UseGuards(JwtAuthGuard)
export class AbsenceSummaryController {
  constructor(private readonly absenceSummary: AbsenceSummaryService) {}

  /**
   * POST car l'appel consomme la fenêtre d'absence (met à jour `lastSeenAt`).
   * Appelé une fois au chargement du jeu.
   */
  @Post()
  getSummary(@CurrentUser() user: AuthUser): Promise<AbsenceSummaryView> {
    return this.absenceSummary.getSummary(user.id);
  }
}
