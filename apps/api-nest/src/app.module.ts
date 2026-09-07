import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { envSchema } from './config/env.schema.js';
import { AuthModule } from './auth/auth.module.js';
import { ContractsModule } from './contracts/contracts.module.js';
import { DashboardModule } from './dashboard/dashboard.module.js';
import { DbModule } from './db/db.module.js';
import { HealthController } from './health/health.controller.js';
import { RemindersModule } from './reminders/reminders.module.js';
import { NotFoundController } from './shared/not-found.controller.js';
import { UsersModule } from './users/users.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // Nest 12 validates config through Standard Schema — no Joi required.
      validationSchema: envSchema,
    }),
    DbModule,
    UsersModule,
    AuthModule,
    ContractsModule,
    RemindersModule,
    DashboardModule,
  ],
  // NotFoundController is last so its wildcard is only reached when nothing
  // else matched.
  controllers: [HealthController, NotFoundController],
})
export class AppModule {}
