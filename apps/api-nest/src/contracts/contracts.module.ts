import { Module } from '@nestjs/common';

import { AuthProviderModule } from '../auth/auth-provider.module.js';
import { DbModule } from '../db/db.module.js';
import { UsersModule } from '../users/users.module.js';
import { ContractsController } from './contracts.controller.js';
import { ContractsRepository } from './contracts.repository.js';
import { ContractsService } from './contracts.service.js';

@Module({
  imports: [DbModule, AuthProviderModule, UsersModule],
  controllers: [ContractsController],
  providers: [ContractsRepository, ContractsService],
  exports: [ContractsService],
})
export class ContractsModule {}
