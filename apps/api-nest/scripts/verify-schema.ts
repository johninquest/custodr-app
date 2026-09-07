/**
 * One-off verification that the Drizzle schema round-trips against a live
 * PostgreSQL instance. Not part of the test suite — run manually with:
 *
 *   DATABASE_URL=... npx tsx scripts/verify-schema.ts
 *
 * Confirms: UUIDv7 generation, insert, select, integer-cents money, JSONB
 * reminder windows, soft-delete filtering, and cascade behaviour.
 */
import { eq, isNull } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import * as schema from '../src/db/schema/index.js';
import { newId } from '../src/shared/ids.js';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

async function main(): Promise<void> {
  const userId = newId();
  console.log('UUIDv7 user id:', userId);

  await db.insert(schema.users).values({
    id: userId,
    externalSubjectId: `verify-${Date.now()}`,
    email: `verify-${Date.now()}@example.com`,
    name: 'Verify User',
  });

  const contractId = newId();
  await db.insert(schema.contracts).values({
    id: contractId,
    userId,
    name: 'Netflix Premium',
    category: 'streaming_subscription',
    provider: 'Netflix',
    startDate: '2024-01-15',
    renewalDate: '2026-01-15',
    cancellationDeadline: '2025-12-15',
    cost: 1599, // integer cents
    billingFrequency: 'monthly',
  });

  const [contract] = await db
    .select()
    .from(schema.contracts)
    .where(eq(schema.contracts.id, contractId));

  console.log('inserted cost (cents):', contract?.cost);
  console.log('default status:', contract?.status);
  console.log('default currency:', contract?.currency);

  await db.insert(schema.reminderPreferences).values({
    id: newId(),
    userId,
    reminderWindows: [90, 30, 7],
  });

  const [prefs] = await db
    .select()
    .from(schema.reminderPreferences)
    .where(eq(schema.reminderPreferences.userId, userId));

  console.log('reminder windows (JSONB):', prefs?.reminderWindows);

  // Soft delete the contract, then confirm it is filtered out.
  await db
    .update(schema.contracts)
    .set({ deletedAt: new Date() })
    .where(eq(schema.contracts.id, contractId));

  const visible = await db
    .select()
    .from(schema.contracts)
    .where(isNull(schema.contracts.deletedAt));

  console.log('visible contracts after soft delete:', visible.length);

  // Hard-delete the user; contracts must cascade.
  await db.delete(schema.users).where(eq(schema.users.id, userId));

  const remaining = await db
    .select()
    .from(schema.contracts)
    .where(eq(schema.contracts.id, contractId));

  console.log('contracts after user hard delete (cascade):', remaining.length);

  const prefsLeft = await db
    .select()
    .from(schema.reminderPreferences)
    .where(eq(schema.reminderPreferences.userId, userId));

  console.log('prefs after user hard delete (cascade):', prefsLeft.length);
}

main()
  .then(() => pool.end())
  .catch(async (err) => {
    console.error('FAILED:', err);
    await pool.end();
    process.exit(1);
  });
