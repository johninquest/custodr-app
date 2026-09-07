import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

/** The authenticated principal attached to the request by `AuthGuard`. */
export interface CurrentUserPayload {
  id: string;
  email: string;
}

interface AuthenticatedRequest extends Request {
  user?: CurrentUserPayload;
}

/**
 * Extract the authenticated user from the request.
 *
 * Requires `AuthGuard` to have run; throws if the principal is absent, which
 * would indicate a route registered without the guard.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CurrentUserPayload => {
    const req = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = req.user;
    if (!user) {
      throw new Error(
        'CurrentUser used on a route without an authenticated principal',
      );
    }
    return user;
  },
);
