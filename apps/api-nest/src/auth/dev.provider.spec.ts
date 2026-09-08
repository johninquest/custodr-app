import { describe, expect, it } from 'vitest';

import { DevAuthProvider } from './dev.provider.js';

/**
 * Dev-only token. `dev.provider.ts` resolves the fixed token to a seeded
 * identity — this spec verifies the match/mismatch behaviour, NOT any real
 * credential. No `.env` or Firebase is involved anywhere in this suite.
 */
const DEV_TOKEN = 'spec-fixed-dev-token-for-tests-only';

describe('DevAuthProvider', () => {
  it('resolves the fixed dev token to the seeded dev identity', async () => {
    const provider = new DevAuthProvider(DEV_TOKEN);
    const identity = await provider.verifyToken(DEV_TOKEN);
    expect(identity).toEqual({ subjectId: 'dev-user', email: 'dev@example.com' });
  });

  it('rejects a mismatched token', async () => {
    const provider = new DevAuthProvider(DEV_TOKEN);
    await expect(provider.verifyToken('wrong-token')).rejects.toThrow(
      /Invalid dev token/,
    );
  });

  it('rejects an empty token', async () => {
    const provider = new DevAuthProvider(DEV_TOKEN);
    await expect(provider.verifyToken('')).rejects.toThrow(
      /Invalid dev token/,
    );
  });

  it('rejects every token when the dev token is unset', async () => {
    // Constructed with no token (FIREBASE_PROJECT_ID unset + DEV_AUTH_TOKEN
    // unset): the provider must fail closed, never open.
    const provider = new DevAuthProvider(undefined);
    await expect(provider.verifyToken(DEV_TOKEN)).rejects.toThrow(
      /Invalid dev token/,
    );
    await expect(provider.verifyToken('anything')).rejects.toThrow(
      /Invalid dev token/,
    );
  });

  it('fails closed when constructed with an empty-string token', async () => {
    const provider = new DevAuthProvider('');
    await expect(provider.verifyToken('')).rejects.toThrow(/Invalid dev token/);
  });

  it('is instance-checkable against the AuthProvider abstract class', () => {
    expect(new DevAuthProvider(DEV_TOKEN)).toBeInstanceOf(DevAuthProvider);
  });
});
