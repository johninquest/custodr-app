import { Controller, Get, Inject, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { and, asc, desc, eq, gte, isNull, lte, sql } from 'drizzle-orm';

import { AuthGuard } from '../auth/auth.guard.js';
import {
  CurrentUser,
  type CurrentUserPayload,
} from '../auth/current-user.decorator.js';
import { DRIZZLE, type Database } from '../db/db.module.js';
import {
  BILLING_FREQUENCIES,
  CONTRACT_CATEGORIES,
  CONTRACT_STATUSES,
} from '../db/schema/enums.js';
import { contracts } from '../db/schema/index.js';
import { centsToDecimal, toMonthlyCents } from '../contracts/money.js';

@ApiTags('dashboard')
@Controller('dashboard')
@UseGuards(AuthGuard)
export class DashboardController {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  @Get('summary')
  async summary(@CurrentUser() user: CurrentUserPayload) {
    const owned = and(
      eq(contracts.userId, user.id),
      isNull(contracts.deletedAt),
    );

    const today = new Date().toISOString().slice(0, 10);
    const plus = (days: number) =>
      new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);

    const [deadlines] = await this.db
      .select({
        d7: sql<number>`count(*) filter (where ${contracts.cancellationDeadline} between ${today} and ${plus(7)})`,
        d30: sql<number>`count(*) filter (where ${contracts.cancellationDeadline} between ${today} and ${plus(30)})`,
        d90: sql<number>`count(*) filter (where ${contracts.cancellationDeadline} between ${today} and ${plus(90)})`,
      })
      .from(contracts)
      .where(and(owned, eq(contracts.status, 'active')));

    const statusRows = await this.db
      .select({ status: contracts.status, n: sql<number>`count(*)` })
      .from(contracts)
      .where(owned)
      .groupBy(contracts.status);

    const categoryRows = await this.db
      .select({ category: contracts.category, n: sql<number>`count(*)` })
      .from(contracts)
      .where(owned)
      .groupBy(contracts.category);

    const costRows = await this.db
      .select({
        freq: contracts.billingFrequency,
        cents: sql<number>`sum(${contracts.cost})`,
      })
      .from(contracts)
      .where(and(owned, eq(contracts.status, 'active')))
      .groupBy(contracts.billingFrequency);

    const recent = await this.db
      .select({
        id: contracts.id,
        name: contracts.name,
        category: contracts.category,
        provider: contracts.provider,
        created_at: contracts.createdAt,
      })
      .from(contracts)
      .where(owned)
      .orderBy(desc(contracts.createdAt))
      .limit(5);

    const monthlyCents = costRows.reduce(
      (sum, r) => sum + toMonthlyCents(r.freq, Number(r.cents ?? 0)),
      0,
    );

    return {
      upcoming_deadlines: {
        next_7_days: Number(deadlines?.d7 ?? 0),
        next_30_days: Number(deadlines?.d30 ?? 0),
        next_90_days: Number(deadlines?.d90 ?? 0),
      },
      contracts_by_status: zeroFilled(
        CONTRACT_STATUSES,
        statusRows.map((r) => [r.status, Number(r.n)]),
      ),
      contracts_by_category: zeroFilled(
        CONTRACT_CATEGORIES,
        categoryRows.map((r) => [r.category, Number(r.n)]),
      ),
      monthly_cost: {
        total: centsToDecimal(Math.round(monthlyCents)),
        currency: 'EUR',
      },
      recently_added: recent.map((r) => ({
        id: r.id,
        name: r.name,
        category: r.category,
        provider: r.provider,
        created_at: r.created_at,
      })),
    };
  }
}

/**
 * Build a record containing every key of the enum, defaulting to 0.
 *
 * The spec shows all statuses/categories present even when the count is zero,
 * so the frontend can render a stable set of rows.
 */
function zeroFilled<T extends readonly string[]>(
  keys: T,
  pairs: [string, number][],
): Record<T[number], number> {
  const out = Object.fromEntries(keys.map((k) => [k, 0])) as Record<
    T[number],
    number
  >;
  for (const [k, v] of pairs) {
    if (k in out) out[k as T[number]] = v;
  }
  return out;
}

export { BILLING_FREQUENCIES, asc, gte, lte };
