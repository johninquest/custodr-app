import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { z } from 'zod';

import { UsersService } from '../users/users.service.js';
import { UnauthorizedException } from '../shared/errors.js';
import { AUTH_PROVIDER, type AuthProvider } from './auth-provider.js';
import { Inject } from '@nestjs/common';

const loginSchema = z.object({
  firebase_token: z.string().min(1, 'firebase_token is required'),
});

type LoginDto = z.infer<typeof loginSchema>;

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    @Inject(AUTH_PROVIDER) private readonly provider: AuthProvider,
    private readonly users: UsersService,
  ) {}

  /**
   * Exchange a Firebase ID token for the internal user record.
   *
   * Provisions the user on first login. Returns 401 for an invalid or expired
   * token, per `docs/api_spec.md`.
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body({ schema: loginSchema }) body: LoginDto) {
    let identity;
    try {
      identity = await this.provider.verifyToken(body.firebase_token);
    } catch {
      throw new UnauthorizedException('Invalid or expired Firebase token');
    }

    const user = await this.users.resolveByIdentity(
      identity.subjectId,
      identity.email,
    );

    return {
      user_id: user.id,
      email: user.email,
      created_at: user.createdAt,
    };
  }
}
