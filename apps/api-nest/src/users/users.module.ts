import { Module } from '@nestjs/common';

import { AuthProviderModule } from '../auth/auth-provider.module.js';
import { DbModule } from '../db/db.module.js';
import { UsersController } from './users.controller.js';
import { UsersRepository } from './users.repository.js';
import { UsersService } from './users.service.js';

@Module({
  imports: [DbModule, AuthProviderModule],
  controllers: [UsersController],
  providers: [UsersRepository, UsersService],
  exports: [UsersService, UsersRepository],
})
export class UsersModule {}
