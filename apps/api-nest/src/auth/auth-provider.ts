/**
 * Abstraction over the external identity provider.
 *
 * Mirrors the Go `TokenVerifier` interface. Firebase is the current
 * implementation; the abstraction exists so a GDPR-driven migration to another
 * provider does not touch business logic.
 */
export interface VerifiedIdentity {
  /** Provider-scoped subject ID (Firebase UID). */
  subjectId: string;
  email: string;
}

export abstract class AuthProvider {
  /** Verify a bearer token and return the identity it asserts. */
  abstract verifyToken(token: string): Promise<VerifiedIdentity>;
}

export const AUTH_PROVIDER = Symbol('AUTH_PROVIDER');
