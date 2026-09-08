import { Injectable, Logger } from '@nestjs/common';

import { AuthProvider, type VerifiedIdentity } from './auth-provider.js';
import { UnauthorizedException } from '../shared/errors.js';

/**
 * Development-only identity verifier.
 *
 * Accepts a single fixed bearer token (`DEV_AUTH_TOKEN`) and resolves it to a
 * stable `dev-user` identity, so protected routes can be exercised locally
 * without a configured Firebase project. The `UsersService.resolveByIdentity`
 * path auto-provisions the internal user on first request, exactly as it does
 * for a real Firebase identity.
 *
 * **Never active in production:** the selecting module only instantiates this
 * provider when `FIREBASE_PROJECT_ID` is unset AND `NODE_ENV !== 'production'`.
 */
@Injectable()
export class DevAuthProvider extends AuthProvider {
  private readonly logger = new Logger(DevAuthProvider.name);

  constructor(private readonly devToken?: string) {
    super();
    if (!devToken) {
      this.logger.warn(
        'DevAuthProvider active but DEV_AUTH_TOKEN is unset — all bearer tokens will be rejected',
      );
    } else {
      this.logger.warn(
        'DevAuthProvider ACTIVE — accepting the fixed DEV_AUTH_TOKEN. Never use in production.',
      );
    }
  }

  async verifyToken(token: string): Promise<VerifiedIdentity> {
    if (!this.devToken || token !== this.devToken) {
      throw new UnauthorizedException('Invalid dev token');
    }
    return { subjectId: 'dev-user', email: 'dev@example.com' };
  }
}
