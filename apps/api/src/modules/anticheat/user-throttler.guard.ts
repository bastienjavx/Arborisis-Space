import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * Limitation de cadence indexée sur l'**utilisateur authentifié** plutôt que sur
 * l'IP. Empêche un même compte de marteler les endpoints (bots/scripts) même
 * derrière des IP changeantes, et évite de pénaliser des joueurs légitimes
 * partageant une IP (NAT, campus). Retombe sur l'IP pour le trafic anonyme.
 */
@Injectable()
export class UserThrottlerGuard extends ThrottlerGuard {
  protected override async getTracker(req: Record<string, unknown>): Promise<string> {
    const user = req.user as { id?: string } | undefined;
    if (user?.id) return `user:${user.id}`;
    const ip = (req.ip as string | undefined) ?? 'unknown';
    return `ip:${ip}`;
  }
}
