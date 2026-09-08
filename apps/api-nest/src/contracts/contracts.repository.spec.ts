import { beforeEach, describe, expect, it } from 'vitest';

import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';

import * as schema from '../db/schema/index.js';
import { normalizeEmail } from '../users/users.repository.js';
import { ContractsRepository } from './contracts.repository.js';
import { decimalToCents } from './money.js';

/**
 * Repository tests — the visibility model (owner OR active grantee) lives in
 * SQL, so these run REAL Drizzle queries against an in-memory fake of the
 * `pg` client. No Postgres instance, no credentials, fully deterministic.
 *
 * The fake models the contract_shares EXISTS clause and the date-window
 * predicates just faithfully enough to pin the query's observable contract.
 * It asserts on generated SQL text too, so structural regressions (dropped
 * visibility clause, missing revoked_at filter) fail loudly.
 */

interface FakeRow {
  [column: string]: unknown;
}

interface CapturedQuery {
  text: string;
  params: unknown[];
}

class FakePgPool {
  readonly queries: CapturedQuery[] = [];
  /** Rows returned by the next SELECT, in order. */
  private queue: FakeRow[][] = [];

  enqueue(rows: FakeRow[]): void {
    this.queue.push(rows);
  }

  async query(
    config: { text: string; rowMode?: string },
    params: unknown[] = [],
  ): Promise<{ rows: unknown[] }> {
    const text = config.text;
    this.queries.push({ text, params: [...params] });

    const next = this.queue.shift() ?? [];
    // Drizzle's node-postgres session runs selects in rowMode:'array' and maps
    // array rows via mapResultRow; 'text' mode gets object rows.
    if (config.rowMode === 'array') {
      return { rows: next.map((r) => this.toArrayRow(text, r)) };
    }
    return { rows: next };
  }

  private toArrayRow(text: string, row: FakeRow): unknown[] {
    // Only the queries in this suite hit rowMode:'array'. Each returns one
    // table's columns in schema definition order; the fake decides by the
    // OUTER FROM clause — the visibility EXISTS subquery makes contract
    // queries also mention contract_shares, so table-name inclusion is not
    // enough to identify the driver table.
    if (text.includes('count(')) return [row.count ?? null];
    if (text.includes('from "contracts"')) return this.contractArray(row);
    if (text.includes('from "contract_shares"')) return this.shareArray(row);
    if (text.includes('from "audit_logs"')) return this.auditArray(row);
    return Object.values(row);
  }

  private contractArray(r: FakeRow): unknown[] {
    return [
      r.id, r.userId, r.name, r.category, r.provider, r.startDate,
      r.renewalDate, r.cancellationDeadline, r.cost, r.currency,
      r.billingFrequency, r.status, r.notes, r.createdAt, r.updatedAt,
      r.deletedAt,
    ];
  }

  private auditArray(r: FakeRow): unknown[] {
    return [r.id, r.entityType, r.entityId, r.actorUserId, r.action, r.field, r.beforeValue, r.afterValue, r.createdAt, r.deletedAt];
  }

  private shareArray(r: FakeRow): unknown[] {
    return [r.id, r.contractId, r.granteeEmail, r.role, r.grantedBy, r.grantedAt, r.revokedAt];
  }
}

/** Evaluate the shares-EXISTS / visibility / window predicates of a query. */
function visibleViaShare(text: string, params: unknown[], email: string): boolean {
  // The EXISTS clause parameterises the grantee email; match it positionally.
  return /exists/i.test(text) && params.some((p) => p === normalizeEmail(email));
}

/** The repository mixes Drizzle-generated lowercase SQL with raw uppercase SQL. */
function sqlHas(text: string, fragment: string): boolean {
  return text.toLowerCase().includes(fragment.toLowerCase());
}

function makeDb(): { db: NodePgDatabase<typeof schema>; pool: FakePgPool } {
  const pool = new FakePgPool();
  const db = drizzle(pool as never, { schema });
  return { db, pool };
}

const OWNER = { id: 'owner-uuid', email: 'owner@example.com' };

function dbRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'contract-uuid',
    userId: OWNER.id,
    name: 'Netflix Premium',
    category: 'streaming_subscription',
    provider: 'Netflix',
    startDate: '2026-01-01',
    renewalDate: '2027-01-01',
    cancellationDeadline: null,
    cost: 1599, // DB stores cents
    currency: 'EUR',
    billingFrequency: 'monthly',
    status: 'active',
    notes: null,
    createdAt: new Date('2026-01-01T10:00:00Z'),
    updatedAt: new Date('2026-01-01T10:00:00Z'),
    deletedAt: null,
    ...overrides,
  };
}

function enqueueContract(
  pool: FakePgPool,
  overrides: Record<string, unknown> = {},
): void {
  pool.enqueue([dbRow(overrides)]);
}

describe('ContractsRepository (Drizzle over a fake pg client)', () => {
  let db: NodePgDatabase<typeof schema>;
  let pool: FakePgPool;
  let repo: ContractsRepository;

  beforeEach(() => {
    ({ db, pool } = makeDb());
    repo = new ContractsRepository(db);
  });

  // -----------------------------------------------------------------------
  // findVisible — owner OR active grantee
  // -----------------------------------------------------------------------
  describe('findVisible', () => {
    it('returns the mapped row for the owner', async () => {
      enqueueContract(pool);
      const row = await repo.findVisible('contract-uuid', OWNER.id, OWNER.email);
      expect(row).toMatchObject({
        id: 'contract-uuid',
        name: 'Netflix Premium',
        cost: 15.99, // converted from integer cents on the way out
        cancellationDeadline: null,
      });
    });

    it('returns undefined when the query yields nothing', async () => {
      pool.enqueue([]);
      expect(await repo.findVisible('x', OWNER.id, OWNER.email)).toBeUndefined();
    });

    it('includes the deleted_at IS NULL guard in the WHERE clause', async () => {
      pool.enqueue([]);
      await repo.findVisible('x', OWNER.id, OWNER.email);
      expect(sqlHas(pool.queries[0].text, '"deleted_at" is null')).toBe(true);
    });

    it('keeps the shares EXISTS subquery for grantee visibility', async () => {
      pool.enqueue([]);
      await repo.findVisible('x', OWNER.id, 'wife@example.com');
      const text = pool.queries[0].text;
      expect(sqlHas(text, 'EXISTS')).toBe(true);
      expect(text).toContain('"contract_shares"');
      expect(sqlHas(text, '"revoked_at" is null')).toBe(true);
    });

    it('normalises the grantee email before comparing', async () => {
      pool.enqueue([]);
      await repo.findVisible('x', OWNER.id, '  Wife@Example.COM  ');
      const text = pool.queries[0].text;
      const params = pool.queries[0].params;
      expect(visibleViaShare(text, params, 'wife@example.com')).toBe(true);
    });

    it('scopes by owner in findOwned — grantee visibility is not enough', async () => {
      pool.enqueue([]);
      await repo.findOwned('x', 'not-owner-uuid');
      const text = pool.queries[0].text;
      // Owner-only query must NOT contain the shares EXISTS clause.
      expect(sqlHas(text, 'EXISTS')).toBe(false);
      expect(text).toContain('"user_id" =');
    });
  });

  // -----------------------------------------------------------------------
  // listVisible — pagination + ordering + filters
  // -----------------------------------------------------------------------
  describe('listVisible', () => {
    it('counts then pages with offset/limit and orders by renewal_date', async () => {
      pool.enqueue([{ count: 7 }]); // count query result
      enqueueContract(pool, { id: 'c1' }); // page query result
      const { rows, total } = await repo.listVisible(OWNER.id, OWNER.email, {}, 2, 20);

      expect(total).toBe(7);
      expect(rows).toHaveLength(1);

      // First query: count; second: page query with LIMIT/OFFSET.
      expect(pool.queries[0].text).toContain('count(');
      const pageSql = pool.queries[1].text;
      expect(pageSql).toContain('limit');
      expect(pageSql).toContain('offset');
      expect(sqlHas(pageSql, 'order by "contracts"."renewal_date" asc')).toBe(true);
    });

    it('applies status and category filters when provided', async () => {
      pool.enqueue([{ count: 1 }]);
      enqueueContract(pool);
      await repo.listVisible(OWNER.id, OWNER.email, { status: 'paused', category: 'insurance' }, 1, 20);
      const text = pool.queries[1].text;
      expect(text).toContain('"status" =');
      expect(text).toContain('"category" =');
      expect(pool.queries[1].params).toContain('paused');
      expect(pool.queries[1].params).toContain('insurance');
    });

    it('omits filter predicates when no filters are given', async () => {
      pool.enqueue([{ count: 1 }]);
      enqueueContract(pool);
      await repo.listVisible(OWNER.id, OWNER.email, {}, 1, 20);
      const text = pool.queries[1].text;
      expect(text).not.toContain('"status" =');
      expect(text).not.toContain('"category" =');
    });

    it('includes soft-deleted exclusion and grantee visibility in both queries', async () => {
      pool.enqueue([{ count: 1 }]);
      enqueueContract(pool);
      await repo.listVisible(OWNER.id, OWNER.email, {}, 1, 20);
      for (const q of pool.queries) {
        expect(sqlHas(q.text, '"deleted_at" is null')).toBe(true);
        expect(sqlHas(q.text, 'EXISTS')).toBe(true);
      }
    });

    it('maps rows from cents to decimals', async () => {
      pool.enqueue([{ count: 1 }]);
      enqueueContract(pool, { cost: 25000 });
      const { rows } = await repo.listVisible(OWNER.id, OWNER.email, {}, 1, 20);
      expect(rows[0].cost).toBe(250);
    });

    it('coerces the driver count to a number', async () => {
      pool.enqueue([{ count: '42' }]); // pg returns bigint counts as strings
      enqueueContract(pool);
      const { total } = await repo.listVisible(OWNER.id, OWNER.email, {}, 1, 20);
      expect(total).toBe(42);
    });
  });

  // -----------------------------------------------------------------------
  // upcoming — date window and deadline types
  // -----------------------------------------------------------------------
  describe('upcoming', () => {
    it('restricts to active, non-deleted contracts', async () => {
      pool.enqueue([]);
      await repo.upcoming(OWNER.id, OWNER.email, 90, undefined);
      const text = pool.queries[0].text;
      expect(text).toContain('"status" =');
      expect(pool.queries[0].params).toContain('active');
      expect(sqlHas(text, '"deleted_at" is null')).toBe(true);
    });

    it('filters on renewal_date when type=renewal', async () => {
      pool.enqueue([]);
      await repo.upcoming(OWNER.id, OWNER.email, 90, 'renewal');
      const text = pool.queries[0].text;
      expect(text).toContain('"renewal_date" >=');
      expect(text).toContain('"renewal_date" <=');
      expect(text).not.toContain('cancellation_deadline" >=');
    });

    it('filters on cancellation_deadline (non-null) when type=cancellation', async () => {
      pool.enqueue([]);
      await repo.upcoming(OWNER.id, OWNER.email, 90, 'cancellation');
      const text = pool.queries[0].text;
      expect(sqlHas(text, '"cancellation_deadline" is not null')).toBe(true);
      expect(text).toContain('"cancellation_deadline" >=');
      expect(text).not.toContain('"renewal_date" >=');
    });

    it('accepts either deadline when no type is given', async () => {
      pool.enqueue([]);
      await repo.upcoming(OWNER.id, OWNER.email, 90, undefined);
      const text = pool.queries[0].text;
      expect(text).toContain('"renewal_date" >=');
      expect(sqlHas(text, '"cancellation_deadline" is not null')).toBe(true);
    });

    it('computes the window from today UTC (not server-local time)', async () => {
      pool.enqueue([]);
      await repo.upcoming(OWNER.id, OWNER.email, 90, 'renewal');
      const params = pool.queries[0].params as string[];
      const today = new Date().toISOString().slice(0, 10);
      expect(params).toContain(today);
      // Horizon = today + 90 days, evaluated in UTC.
      const expectedHorizon = new Date(Date.now() + 90 * 86_400_000).toISOString().slice(0, 10);
      expect(params).toContain(expectedHorizon);
    });

    it('maps returned rows from cents to decimals', async () => {
      pool.enqueue([dbRow({ cost: 12000 })]);
      const rows = await repo.upcoming(OWNER.id, OWNER.email, 90, undefined);
      expect(rows[0].cost).toBe(120);
    });
  });

  // -----------------------------------------------------------------------
  // create / update — cents conversion at the boundary
  // -----------------------------------------------------------------------
  describe('create', () => {
    const input = {
      name: 'Netflix Premium',
      category: 'streaming_subscription',
      provider: 'Netflix',
      startDate: '2026-01-01',
      renewalDate: '2027-01-01',
      cancellationDeadline: null,
      cost: 15.99,
      currency: 'EUR',
      billingFrequency: 'monthly',
      notes: null,
    };

    it('inserts cost as integer cents and defaults status to active', async () => {
      enqueueContract(pool);
      await repo.create(OWNER.id, input);

      const text = pool.queries[0].text;
      expect(text).toContain('insert into "contracts"');
      const params = pool.queries[0].params;
      expect(params).toContain(decimalToCents(15.99)); // 1599
      expect(params).not.toContain(15.99);
      expect(params).toContain('active');
    });

    it('returns the mapped row with decimal cost', async () => {
      enqueueContract(pool);
      const row = await repo.create(OWNER.id, input);
      expect(row.cost).toBe(15.99);
    });

    it('coerces omitted cancellation_deadline and notes to null', async () => {
      enqueueContract(pool);
      await repo.create(OWNER.id, { ...input, cancellationDeadline: undefined, notes: undefined });
      const params = pool.queries[0].params;
      expect(params).toContain(null);
    });
  });

  describe('update', () => {
    const input = {
      name: 'Netflix Standard',
      category: 'streaming_subscription',
      provider: 'Netflix',
      startDate: '2026-01-01',
      renewalDate: '2027-01-01',
      cancellationDeadline: null,
      cost: 17.99,
      currency: 'EUR',
      billingFrequency: 'monthly',
      status: 'active',
      notes: null,
    };

    it('updates by id, excludes soft-deleted rows, and bumps updated_at', async () => {
      enqueueContract(pool);
      await repo.update('contract-uuid', input);
      const text = pool.queries[0].text;
      expect(text).toContain('update "contracts" set');
      expect(text).toContain('"deleted_at" is null');
      expect(text).toContain('"updated_at"');
    });

    it('stores the new cost in cents', async () => {
      enqueueContract(pool);
      await repo.update('contract-uuid', input);
      expect(pool.queries[0].params).toContain(1799);
    });

    it('returns undefined when the update matches nothing', async () => {
      pool.enqueue([]);
      expect(await repo.update('contract-uuid', input)).toBeUndefined();
    });
  });

  // -----------------------------------------------------------------------
  // softDelete — contract AND its audit rows (schema.md)
  // -----------------------------------------------------------------------
  describe('softDelete', () => {
    it('issues two updates: contracts and the contract\'s audit rows', async () => {
      await repo.softDelete('contract-uuid');

      expect(pool.queries).toHaveLength(2);
      expect(pool.queries[0].text).toContain('update "contracts" set');
      expect(pool.queries[0].text).toContain('"deleted_at"');
      expect(pool.queries[1].text).toContain('update "audit_logs" set');
      expect(pool.queries[1].text).toContain('"entity_type"');
      expect(pool.queries[1].params).toContain('contract');
      expect(pool.queries[1].params).toContain('contract-uuid');
    });
  });

  // -----------------------------------------------------------------------
  // audit helpers
  // -----------------------------------------------------------------------
  describe('createAudit', () => {
    it('inserts entity, actor, action, field and before/after values', async () => {
      pool.enqueue([]);
      await repo.createAudit({
        entityType: 'contract',
        entityId: 'contract-uuid',
        actorUserId: OWNER.id,
        action: 'updated',
        field: 'cost',
        beforeValue: 15.99,
        afterValue: 17.99,
      });

      const text = pool.queries[0].text;
      expect(text).toContain('insert into "audit_logs"');
      const params = pool.queries[0].params;
      expect(params).toContain('contract');
      expect(params).toContain('updated');
      expect(params).toContain('cost');
      // jsonb params arrive JSON-stringified from the driver layer.
      expect(params).toContain(JSON.stringify(15.99));
      expect(params).toContain(JSON.stringify(17.99));
    });

    it('defaults field and before/after values to null for `created` entries', async () => {
      pool.enqueue([]);
      await repo.createAudit({
        entityType: 'contract',
        entityId: 'contract-uuid',
        actorUserId: OWNER.id,
        action: 'created',
      });
      const params = pool.queries[0].params;
      expect(params).toContain('created');
      expect(params).toContain(null);
    });
  });

  describe('listAudit', () => {
    const auditRow = {
      id: 'audit-uuid',
      entityType: 'contract',
      entityId: 'contract-uuid',
      actorUserId: OWNER.id,
      action: 'updated',
      field: 'cost',
      beforeValue: 15.99,
      afterValue: 17.99,
      createdAt: new Date('2026-09-05T10:00:00Z'),
      deletedAt: null,
    };

    it('scopes to the contract, excludes soft-deleted, paginates newest-first', async () => {
      pool.enqueue([{ count: 1 }]);
      pool.enqueue([auditRow]);
      const { rows, total } = await repo.listAudit('contract-uuid', 2, 20);

      expect(total).toBe(1);
      expect(rows).toHaveLength(1);

      expect(pool.queries[0].text).toContain('from "audit_logs"');
      expect(sqlHas(pool.queries[1].text, 'order by "audit_logs"."created_at" desc')).toBe(true);
      expect(pool.queries[1].text).toContain('limit');
      expect(pool.queries[1].text).toContain('offset');
    });

    it('returns snake_case audit rows per the api_spec.md feed shape', async () => {
      pool.enqueue([{ count: 1 }]);
      pool.enqueue([auditRow]);
      const { rows } = await repo.listAudit('contract-uuid', 1, 20);
      expect(rows[0]).toMatchObject({
        entity_type: 'contract',
        entity_id: 'contract-uuid',
        actor_user_id: OWNER.id,
        action: 'updated',
        field: 'cost',
        before_value: 15.99,
        after_value: 17.99,
      });
    });
  });

  // -----------------------------------------------------------------------
  // shares
  // -----------------------------------------------------------------------
  describe('shares', () => {
    const share = {
      id: 'share-uuid',
      contractId: 'contract-uuid',
      granteeEmail: 'wife@example.com',
      role: 'viewer',
      grantedBy: OWNER.id,
      grantedAt: new Date('2026-09-05T10:00:00Z'),
      revokedAt: null,
    };

    it('listShares only returns non-revoked shares, oldest grant first', async () => {
      pool.enqueue([share]);
      const rows = await repo.listShares('contract-uuid');
      const text = pool.queries[0].text;
      expect(sqlHas(text, '"revoked_at" is null')).toBe(true);
      expect(sqlHas(text, 'order by "contract_shares"."granted_at" asc')).toBe(true);
      expect(rows).toEqual([share]);
    });

    it('findShareById matches on BOTH share id and contract id', async () => {
      pool.enqueue([share]);
      const row = await repo.findShareById('share-uuid', 'contract-uuid');
      expect(row).toEqual(share);
      const text = pool.queries[0].text;
      expect(text).toContain('"id" =');
      expect(text).toContain('"contract_id" =');
    });

    it('findShareById returns undefined when nothing matches', async () => {
      pool.enqueue([]);
      expect(await repo.findShareById('x', 'y')).toBeUndefined();
    });

    it('findActiveShare scopes by contract, normalised email and non-revoked', async () => {
      pool.enqueue([share]);
      const row = await repo.findActiveShare('contract-uuid', 'Wife@Example.com');
      expect(row).toEqual(share);
      expect(pool.queries[0].params).toContain('wife@example.com');
      expect(sqlHas(pool.queries[0].text, '"revoked_at" is null')).toBe(true);
    });

    it('createShare normalises the email and grants the viewer role', async () => {
      pool.enqueue([share]);
      await repo.createShare('contract-uuid', 'Wife@Example.com', OWNER.id);
      const params = pool.queries[0].params;
      expect(params).toContain('wife@example.com');
      expect(params).toContain('viewer');
      expect(params).toContain(OWNER.id);
    });

    it('revokeShare updates the share row (sets revoked_at), never deletes', async () => {
      pool.enqueue([]);
      await repo.revokeShare('share-uuid');
      const text = pool.queries[0].text;
      expect(text).toContain('update "contract_shares" set');
      expect(text).toContain('"revoked_at"');
      expect(text).not.toContain('delete from');
    });
  });
});
