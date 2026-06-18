import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/** Guard dédié à la route de rafraîchissement. */
@Injectable()
export class JwtRefreshGuard extends AuthGuard('jwt-refresh') {}
