import { Module } from '@nestjs/common';

import { AuthProviderModule } from '../auth/auth-provider.module.js';
import { DbModule } from '../db/db.module.js';
import { UsersModule } from '../users/users.module.js';
import { RemindersController } from './reminders.controller.js';

@Module({
  imports: [DbModule, AuthProviderModule, UsersModule],
  controllers: [RemindersController],
})
export class RemindersModule {}
