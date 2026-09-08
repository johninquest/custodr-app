import { describe, expect, it, vi } from 'vitest';

import type { Request } from 'express';

import { AuthGuard } from './auth.guard.js';
import { AuthProvider, type VerifiedIdentity } from './auth-provider.js';
import type { CurrentUserPayload } from './current-user.decorator.js';
import { UnauthorizedException } from '../shared/errors.js';

/**
 * Stubbed AuthProvider — never Firebase, never a credential file.
 * The guard must be provider-agnostic: any verifyToken implementation works.
 */
class StubAuthProvider extends AuthProvider {
  constructor(private readonly result: () => Promise<VerifiedIdentity>) {
    super();
  }
  verifyToken(token: string): Promise<VerifiedIdentity> {
    return this.result(token);
  }
}

function makeGuard(
  verifyResult: (token: string) => Promise<VerifiedIdentity>,
  users: { resolveByIdentity: ReturnType<typeof vi.fn> },
): AuthGuard {
  return new AuthGuard(new StubAuthProvider(verifyResult), users as never);
}

function makeContext(authHeader?: string) {
  const req = {
    headers: authHeader === undefined ? {} : { authorization: authHeader },
    user: undefined as CurrentUserPayload | undefined,
  };
  return {
    req,
    context: {
      switchToHttp: () => ({ getRequest: () => req as Request }),
    } as never,
  };
}

const identity: VerifiedIdentity = {
  subjectId: 'firebase-uid-1',
  email: 'user@example.com',
};

describe('AuthGuard', () => {
  it('accepts a valid bearer token and attaches the resolved user to the request', async () => {
    const resolveByIdentity = vi
      .fn()
      .mockResolvedValue({ id: 'user-uuid', email: 'user@example.com' });
    const guard = makeGuard(() => Promise.resolve(identity), {
      resolveByIdentity,
    });
    const { req, context } = makeContext('Bearer good-token');

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(resolveByIdentity).toHaveBeenCalledWith('firebase-uid-1', 'user@example.com');
    expect(req.user).toEqual({ id: 'user-uuid', email: 'user@example.com' });
  });

  it('passes the raw token (sans Bearer prefix) to the provider', async () => {
    let receivedToken = '';
    const guard = makeGuard(
      (token) => {
        receivedToken = token;
        return Promise.resolve(identity);
      }, { resolveByIdentity: vi.fn().mockResolvedValue({ id: 'u', email: 'e' }) });

    const { context } = makeContext('Bearer abc.def.ghi');
    await guard.canActivate(context);
    expect(receivedToken).toBe('abc.def.ghi');
  });

  it('trims whitespace after the Bearer prefix', async () => {
    let receivedToken = '';
    const guard = makeGuard(
      (token) => {
        receivedToken = token;
        return Promise.resolve(identity);
      }, { resolveByIdentity: vi.fn().mockResolvedValue({ id: 'u', email: 'e' }) });

    await guard.canActivate(makeContext('Bearer   spaced-token  ').context);
    expect(receivedToken).toBe('spaced-token');
  });

  it('rejects a missing Authorization header with a 401 envelope code', async () => {
    const guard = makeGuard(() => Promise.resolve(identity), {
      resolveByIdentity: vi.fn(),
    });
    const { context } = makeContext(undefined);

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    await expect(guard.canActivate(makeContext(undefined).context)).rejects.toMatchObject(
      { errorCode: 'UNAUTHORIZED', status: 401 },
    );
  });

  it('rejects a non-Bearer scheme (Basic, raw token, etc.)', async () => {
    const guard = makeGuard(() => Promise.resolve(identity), {
      resolveByIdentity: vi.fn(),
    });
    for (const header of ['Basic dXNlcjpwYXNz', 'token abc', 'Bearer']) {
      await expect(guard.canActivate(makeContext(header).context)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    }
  });

  it('rejects an empty token after the Bearer prefix ("Bearer ")', async () => {
    const guard = makeGuard(() => Promise.resolve(identity), {
      resolveByIdentity: vi.fn(),
    });
    await expect(
      guard.canActivate(makeContext('Bearer ').context),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('propagates a provider rejection as UNAUTHORIZED', async () => {
    const guard = makeGuard(
      () => Promise.reject(new UnauthorizedException('Invalid token')),
      { resolveByIdentity: vi.fn() },
    );
    await expect(
      guard.canActivate(makeContext('Bearer bad-token').context),
    ).rejects.toMatchObject({ errorCode: 'UNAUTHORIZED' });
  });

  it('does not call resolveByIdentity when token verification fails', async () => {
    const resolveByIdentity = vi.fn();
    const guard = makeGuard(
      () => Promise.reject(new UnauthorizedException('Invalid token')),
      { resolveByIdentity },
    );
    await expect(
      guard.canActivate(makeContext('Bearer bad').context),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(resolveByIdentity).not.toHaveBeenCalled();
  });
});
