import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AUTH_PROVIDER } from './auth-provider.js';
import { FirebaseAuthProvider } from './firebase.provider.js';

/**
 * Provides the external identity verifier.
 *
 * Deliberately a leaf module with no domain imports: `AuthGuard` needs
 * `AUTH_PROVIDER`, and `UsersModule` needs `AuthGuard`, so having this module
 * depend on `UsersModule` would create a cycle.
 */
@Module({
  providers: [
    {
      provide: AUTH_PROVIDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new FirebaseAuthProvider(
          config.get<string>('FIREBASE_PROJECT_ID'),
          config.get<string>('FIREBASE_CREDENTIALS_PATH'),
        ),
    },
  ],
  exports: [AUTH_PROVIDER],
})
export class AuthProviderModule {}
