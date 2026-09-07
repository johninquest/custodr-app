import {
  CanActivate,
  type ExecutionContext,
  Inject,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';

import { UsersService } from '../users/users.service.js';
import { UnauthorizedException } from '../shared/errors.js';
import { AUTH_PROVIDER, type AuthProvider } from './auth-provider.js';
import type { CurrentUserPayload } from './current-user.decorator.js';

/**
 * Verifies the bearer token and resolves it to an internal user.
 *
 * The guard both authenticates and provisions: a valid Firebase token for an
 * unseen identity creates the internal user record, matching the Go behaviour
 * where login is the provisioning point.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject(AUTH_PROVIDER) private readonly provider: AuthProvider,
    private readonly users: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const header = req.headers.authorization;

    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid authentication');
    }

    const token = header.slice('Bearer '.length).trim();
    if (!token) {
      throw new UnauthorizedException('Missing or invalid authentication');
    }

    const identity = await this.provider.verifyToken(token);
    const user = await this.users.resolveByIdentity(
      identity.subjectId,
      identity.email,
    );

    const payload: CurrentUserPayload = { id: user.id, email: user.email };
    (req as Request & { user?: CurrentUserPayload }).user = payload;

    return true;
  }
}
