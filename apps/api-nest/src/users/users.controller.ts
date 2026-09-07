import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { z } from 'zod';

import { AuthGuard } from '../auth/auth.guard.js';
import { CurrentUser, type CurrentUserPayload } from '../auth/current-user.decorator.js';
import { CONSENT_TYPES } from '../db/schema/enums.js';
import { UsersService } from './users.service.js';

const grantConsentSchema = z.object({
  consent_type: z.enum(CONSENT_TYPES),
  version: z.string().min(1, 'version is required'),
});

const consentTypeParamSchema = z.enum(CONSENT_TYPES);

@ApiTags('users')
@Controller('users')
@UseGuards(AuthGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('me')
  async getMe(@CurrentUser() user: CurrentUserPayload) {
    const profile = await this.users.getProfile(user.id);
    return {
      id: profile.id,
      email: profile.email,
      email_verified: profile.emailVerified,
      created_at: profile.createdAt,
      updated_at: profile.updatedAt,
    };
  }

  /** GDPR right to erasure — hard delete of the user and all owned data. */
  @Delete('me')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteMe(@CurrentUser() user: CurrentUserPayload): Promise<void> {
    await this.users.deleteAccount(user.id);
  }

  @Get('me/consents')
  async listConsents(@CurrentUser() user: CurrentUserPayload) {
    return { data: await this.users.listConsents(user.id) };
  }

  @Post('me/consents')
  async grantConsent(
    @CurrentUser() user: CurrentUserPayload,
    @Body({ schema: grantConsentSchema })
    body: z.infer<typeof grantConsentSchema>,
  ) {
    return this.users.grantConsent(user.id, body.consent_type, body.version);
  }

  @Delete('me/consents/:type')
  @HttpCode(HttpStatus.NO_CONTENT)
  async withdrawConsent(
    @CurrentUser() user: CurrentUserPayload,
    @Param('type', { schema: consentTypeParamSchema }) type: string,
  ): Promise<void> {
    await this.users.withdrawConsent(user.id, type);
  }
}
