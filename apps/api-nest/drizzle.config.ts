import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

/**
 * drizzle-kit configuration.
 *
 * `DATABASE_URL` is required. It is read from the environment rather than a
 * `.env` file so that credentials stay outside the repository — the human
 * owns `.env`; agents must never read or write it.
 */
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema/index.ts',
  out: './drizzle',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? '',
  },
  strict: true,
  verbose: true,
});
