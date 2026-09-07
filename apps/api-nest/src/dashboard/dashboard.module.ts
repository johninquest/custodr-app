import { Module } from '@nestjs/common';

import { AuthProviderModule } from '../auth/auth-provider.module.js';
import { DbModule } from '../db/db.module.js';
import { UsersModule } from '../users/users.module.js';
import { DashboardController } from './dashboard.controller.js';

@Module({
  imports: [DbModule, AuthProviderModule, UsersModule],
  controllers: [DashboardController],
})
export class DashboardModule {}
