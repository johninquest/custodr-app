import { Injectable, Logger } from '@nestjs/common';
import { cert, initializeApp, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';

import { AuthProvider, type VerifiedIdentity } from './auth-provider.js';
import { UnauthorizedException } from '../shared/errors.js';

/**
 * Verifies Firebase ID tokens using the Admin SDK.
 *
 * Mirrors `apps/api/internal/auth/firebase.go`. The app is initialised once on
 * first use; a missing or invalid credentials file disables auth rather than
 * crashing the process, matching the Go bootstrap behaviour.
 */
@Injectable()
export class FirebaseAuthProvider extends AuthProvider {
  private readonly logger = new Logger(FirebaseAuthProvider.name);
  private client?: Auth;

  constructor(projectId?: string, credentialsPath?: string) {
    super();
    if (!projectId || !credentialsPath) {
      this.logger.warn(
        'Firebase not configured (FIREBASE_PROJECT_ID / FIREBASE_CREDENTIALS_PATH) — auth disabled',
      );
      return;
    }

    try {
      const app: App = initializeApp({
        credential: cert(credentialsPath),
        projectId,
      });
      this.client = getAuth(app);
      this.logger.log('Firebase authentication initialized');
    } catch (err) {
      this.logger.error(
        `Failed to initialize Firebase: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  get isEnabled(): boolean {
    return this.client !== undefined;
  }

  async verifyToken(token: string): Promise<VerifiedIdentity> {
    if (!this.client) {
      throw new UnauthorizedException('Authentication is not configured');
    }

    try {
      const decoded = await this.client.verifyIdToken(token);
      const email = decoded.email ?? '';
      return { subjectId: decoded.uid, email };
    } catch {
      // Deliberately swallow provider detail: token errors are not actionable
      // by the client and can leak configuration information.
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
