import { Module, type OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import * as schema from './schema/index.js';

export const DRIZZLE = Symbol('DRIZZLE');

export type Database = NodePgDatabase<typeof schema>;

/**
 * Provides a Drizzle instance over a `pg` connection pool.
 *
 * The pool is retained on the module instance and closed on destroy, so
 * `app.close()` in tests and during graceful shutdown releases sockets
 * instead of leaving the process hanging.
 */
@Module({
  providers: [
    {
      provide: DRIZZLE,
      inject: [ConfigService, DbModule],
      useFactory: (config: ConfigService, dbModule: DbModule): Database => {
        const connectionString = config.getOrThrow<string>('DATABASE_URL');
        dbModule.pool = new Pool({ connectionString });
        return drizzle(dbModule.pool, { schema });
      },
    },
  ],
  exports: [DRIZZLE],
})
export class DbModule implements OnModuleDestroy {
  pool?: Pool;

  async onModuleDestroy(): Promise<void> {
    await this.pool?.end();
  }
}
