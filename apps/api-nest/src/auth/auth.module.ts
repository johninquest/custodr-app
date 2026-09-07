import { Module } from '@nestjs/common';

import { UsersModule } from '../users/users.module.js';
import { AuthController } from './auth.controller.js';
import { AuthProviderModule } from './auth-provider.module.js';

@Module({
  imports: [AuthProviderModule, UsersModule],
  controllers: [AuthController],
})
export class AuthModule {}
