import { Controller, Get } from '@nestjs/common';
import type { AllianceLeaderboardEntry, LeaderboardEntry } from '@arborisis/shared';
import { LeaderboardService } from './leaderboard.service';

@Controller('leaderboard')
export class LeaderboardController {
  constructor(private readonly leaderboard: LeaderboardService) {}

  @Get()
  getLeaderboard(): Promise<LeaderboardEntry[]> {
    return this.leaderboard.getLeaderboard();
  }

  @Get('alliances')
  getAllianceLeaderboard(): Promise<AllianceLeaderboardEntry[]> {
    return this.leaderboard.getAllianceLeaderboard();
  }
}
