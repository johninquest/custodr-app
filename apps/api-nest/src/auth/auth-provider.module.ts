import { Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AUTH_PROVIDER } from './auth-provider.js';
import { DevAuthProvider } from './dev.provider.js';
import { FirebaseAuthProvider } from './firebase.provider.js';

/**
 * Provides the external identity verifier.
 *
 * Deliberately a leaf module with no domain imports: `AuthGuard` needs
 * `AUTH_PROVIDER`, and `UsersModule` needs `AuthGuard`, so having this module
 * depend on `UsersModule` would create a cycle.
 *
 * Provider selection:
 * - Firebase configured → `FirebaseAuthProvider` (production path, unchanged).
 * - Firebase unset AND not production → `DevAuthProvider` (local development),
 *   so protected routes can be exercised without a Firebase project.
 */
@Module({
  providers: [
    {
      provide: AUTH_PROVIDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const projectId = config.get<string>('FIREBASE_PROJECT_ID');
        const nodeEnv = config.get<string>('NODE_ENV') ?? 'development';

        if (!projectId && nodeEnv !== 'production') {
          new Logger('AuthProviderModule').warn(
            'Firebase not configured — using DevAuthProvider. ' +
              'Protected routes accept the fixed DEV_AUTH_TOKEN. ' +
              'This MUST NOT be active in production.',
          );
          return new DevAuthProvider(config.get<string>('DEV_AUTH_TOKEN'));
        }

        return new FirebaseAuthProvider(
          projectId,
          config.get<string>('FIREBASE_CREDENTIALS_PATH'),
        );
      },
    },
  ],
  exports: [AUTH_PROVIDER],
})
export class AuthProviderModule {}
