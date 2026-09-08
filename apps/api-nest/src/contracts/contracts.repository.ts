import { Inject, Injectable } from '@nestjs/common';
import { and, asc, count, desc, eq, gte, isNull, lte, or, sql } from 'drizzle-orm';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';

import { DRIZZLE, type Database } from '../db/db.module.js';
import {
  auditLogs,
  contractShares,
  contracts,
} from '../db/schema/index.js';
import { newId } from '../shared/ids.js';
import { normalizeEmail } from '../users/users.repository.js';
import { centsToDecimal, decimalToCents } from './money.js';

export interface ContractRow {
  id: string;
  userId: string;
  name: string;
  category: string;
  provider: string;
  startDate: string;
  renewalDate: string;
  cancellationDeadline: string | null;
  cost: number;
  currency: string;
  billingFrequency: string;
  status: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuditRow {
  id: string;
  entity_type: string;
  entity_id: string;
  actor_user_id: string | null;
  action: string;
  field: string | null;
  before_value: unknown;
  after_value: unknown;
  created_at: Date;
}

@Injectable()
export class ContractsRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  /**
   * Contracts owned by the user, plus contracts shared with their email.
   *
   * Mirrors the Go `List`: a single query with an OR across owner and active
   * grantee, so pagination stays correct across both sources.
   */
  async listVisible(
    userId: string,
    email: string,
    filters: { status?: string; category?: string },
    page: number,
    limit: number,
  ): Promise<{ rows: ContractRow[]; total: number }> {
    const granteeEmail = normalizeEmail(email);

    const visible = or(
      eq(contracts.userId, userId),
      sql`EXISTS (
        SELECT 1 FROM ${contractShares}
        WHERE ${contractShares.contractId} = ${contracts.id}
          AND ${contractShares.granteeEmail} = ${granteeEmail}
          AND ${contractShares.revokedAt} IS NULL
      )`,
    );

    const conditions = [
      isNull(contracts.deletedAt),
      visible,
      ...(filters.status ? [eq(contracts.status, filters.status)] : []),
      ...(filters.category ? [eq(contracts.category, filters.category)] : []),
    ];

    const where = and(...conditions);

    const [totalRow] = await this.db
      .select({ value: count() })
      .from(contracts)
      .where(where);

    const rows = await this.db
      .select()
      .from(contracts)
      .where(where)
      .orderBy(asc(contracts.renewalDate))
      .limit(limit)
      .offset((page - 1) * limit);

    return { rows: rows.map(toContractRow), total: Number(totalRow?.value ?? 0) };
  }

  /**
   * Active contracts (owned or granted) with a renewal and/or cancellation
   * deadline within `days` of today.
   *
   * `type` narrows the window to a single deadline; omitted, both qualify.
   * Dates are `DATE` columns compared as `YYYY-MM-DD` strings, which sort and
   * compare lexicographically with the same result as chronological order.
   */
  async upcoming(
    userId: string,
    email: string,
    days: number,
    type?: 'renewal' | 'cancellation',
  ): Promise<ContractRow[]> {
    const granteeEmail = normalizeEmail(email);

    const visible = or(
      eq(contracts.userId, userId),
      sql`EXISTS (
        SELECT 1 FROM ${contractShares}
        WHERE ${contractShares.contractId} = ${contracts.id}
          AND ${contractShares.granteeEmail} = ${granteeEmail}
          AND ${contractShares.revokedAt} IS NULL
      )`,
    );

    const today = new Date().toISOString().slice(0, 10);
    const horizon = new Date(Date.now() + days * 86_400_000)
      .toISOString()
      .slice(0, 10);

    const inWindow = (column: AnyPgColumn) =>
      and(gte(column, today), lte(column, horizon));

    const deadline = (() => {
      if (type === 'renewal') return inWindow(contracts.renewalDate);
      if (type === 'cancellation') {
        return and(
          inWindow(contracts.cancellationDeadline),
          // sql-not-null guard; Drizzle's gte already implies non-null but the
          // typed column allows NULL, so keep the intent explicit.
          sql`${contracts.cancellationDeadline} IS NOT NULL`,
        );
      }
      return or(
        inWindow(contracts.renewalDate),
        and(
          sql`${contracts.cancellationDeadline} IS NOT NULL`,
          inWindow(contracts.cancellationDeadline),
        ),
      );
    })();

    const rows = await this.db
      .select()
      .from(contracts)
      .where(
        and(
          isNull(contracts.deletedAt),
          eq(contracts.status, 'active'),
          visible,
          deadline,
        ),
      )
      .orderBy(asc(contracts.renewalDate));

    return rows.map(toContractRow);
  }
  async findVisible(
    id: string,
    userId: string,
    email: string,
  ): Promise<ContractRow | undefined> {
    const granteeEmail = normalizeEmail(email);

    const [row] = await this.db
      .select()
      .from(contracts)
      .where(
        and(
          eq(contracts.id, id),
          isNull(contracts.deletedAt),
          or(
            eq(contracts.userId, userId),
            sql`EXISTS (
              SELECT 1 FROM ${contractShares}
              WHERE ${contractShares.contractId} = ${contracts.id}
                AND ${contractShares.granteeEmail} = ${granteeEmail}
                AND ${contractShares.revokedAt} IS NULL
            )`,
          ),
        ),
      )
      .limit(1);

    return row ? toContractRow(row) : undefined;
  }

  /** Fetch a contract the user owns (owner-only operations). */
  async findOwned(
    id: string,
    userId: string,
  ): Promise<ContractRow | undefined> {
    const [row] = await this.db
      .select()
      .from(contracts)
      .where(
        and(
          eq(contracts.id, id),
          eq(contracts.userId, userId),
          isNull(contracts.deletedAt),
        ),
      )
      .limit(1);

    return row ? toContractRow(row) : undefined;
  }

  async create(
    userId: string,
    input: {
      name: string;
      category: string;
      provider: string;
      startDate: string;
      renewalDate: string;
      cancellationDeadline?: string | null;
      cost: number;
      currency: string;
      billingFrequency: string;
      notes?: string | null;
    },
  ): Promise<ContractRow> {
    const [row] = await this.db
      .insert(contracts)
      .values({
        id: newId(),
        userId,
        name: input.name,
        category: input.category,
        provider: input.provider,
        startDate: input.startDate,
        renewalDate: input.renewalDate,
        cancellationDeadline: input.cancellationDeadline ?? null,
        cost: decimalToCents(input.cost),
        currency: input.currency,
        billingFrequency: input.billingFrequency,
        status: 'active',
        notes: input.notes ?? null,
      })
      .returning();

    return toContractRow(row);
  }

  async update(
    id: string,
    input: {
      name: string;
      category: string;
      provider: string;
      startDate: string;
      renewalDate: string;
      cancellationDeadline?: string | null;
      cost: number;
      currency: string;
      billingFrequency: string;
      status: string;
      notes?: string | null;
    },
  ): Promise<ContractRow | undefined> {
    const [row] = await this.db
      .update(contracts)
      .set({
        name: input.name,
        category: input.category,
        provider: input.provider,
        startDate: input.startDate,
        renewalDate: input.renewalDate,
        cancellationDeadline: input.cancellationDeadline ?? null,
        cost: decimalToCents(input.cost),
        currency: input.currency,
        billingFrequency: input.billingFrequency,
        status: input.status,
        notes: input.notes ?? null,
        updatedAt: new Date(),
      })
      .where(and(eq(contracts.id, id), isNull(contracts.deletedAt)))
      .returning();

    return row ? toContractRow(row) : undefined;
  }

  /**
   * Soft delete a contract and its audit rows.
   *
   * Per `schema.md`: both are recoverable. Hard erasure happens only via the
   * GDPR cascade when the owning user is deleted.
   */
  async softDelete(id: string): Promise<void> {
    const now = new Date();
    await this.db
      .update(contracts)
      .set({ deletedAt: now })
      .where(eq(contracts.id, id));

    await this.db
      .update(auditLogs)
      .set({ deletedAt: now })
      .where(
        and(eq(auditLogs.entityType, 'contract'), eq(auditLogs.entityId, id)),
      );
  }

  async createAudit(entry: {
    entityType: string;
    entityId: string;
    actorUserId: string | null;
    action: string;
    field?: string | null;
    beforeValue?: unknown;
    afterValue?: unknown;
  }): Promise<void> {
    await this.db.insert(auditLogs).values({
      id: newId(),
      entityType: entry.entityType,
      entityId: entry.entityId,
      actorUserId: entry.actorUserId,
      action: entry.action,
      field: entry.field ?? null,
      beforeValue: entry.beforeValue ?? null,
      afterValue: entry.afterValue ?? null,
    });
  }

  async listAudit(
    contractId: string,
    page: number,
    limit: number,
  ): Promise<{ rows: AuditRow[]; total: number }> {
    const where = and(
      eq(auditLogs.entityType, 'contract'),
      eq(auditLogs.entityId, contractId),
      isNull(auditLogs.deletedAt),
    );

    const [totalRow] = await this.db
      .select({ value: count() })
      .from(auditLogs)
      .where(where);

    const rows = await this.db
      .select()
      .from(auditLogs)
      .where(where)
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit)
      .offset((page - 1) * limit);

    return {
      rows: rows.map((r) => ({
        id: r.id,
        entity_type: r.entityType,
        entity_id: r.entityId,
        actor_user_id: r.actorUserId,
        action: r.action,
        field: r.field,
        before_value: r.beforeValue,
        after_value: r.afterValue,
        created_at: r.createdAt,
      })),
      total: Number(totalRow?.value ?? 0),
    };
  }

  async listShares(contractId: string) {
    return this.db
      .select()
      .from(contractShares)
      .where(
        and(
          eq(contractShares.contractId, contractId),
          isNull(contractShares.revokedAt),
        ),
      )
      .orderBy(asc(contractShares.grantedAt));
  }

  async findShareById(shareId: string, contractId: string) {
    const [row] = await this.db
      .select()
      .from(contractShares)
      .where(
        and(
          eq(contractShares.id, shareId),
          eq(contractShares.contractId, contractId),
          isNull(contractShares.revokedAt),
        ),
      )
      .limit(1);
    return row;
  }

  async findActiveShare(contractId: string, granteeEmail: string) {
    const [row] = await this.db
      .select()
      .from(contractShares)
      .where(
        and(
          eq(contractShares.contractId, contractId),
          eq(contractShares.granteeEmail, normalizeEmail(granteeEmail)),
          isNull(contractShares.revokedAt),
        ),
      )
      .limit(1);
    return row;
  }

  async createShare(contractId: string, granteeEmail: string, grantedBy: string) {
    const [row] = await this.db
      .insert(contractShares)
      .values({
        id: newId(),
        contractId,
        granteeEmail: normalizeEmail(granteeEmail),
        role: 'viewer',
        grantedBy,
      })
      .returning();
    return row;
  }

  async revokeShare(shareId: string): Promise<void> {
    await this.db
      .update(contractShares)
      .set({ revokedAt: new Date() })
      .where(eq(contractShares.id, shareId));
  }
}

function toContractRow(row: typeof contracts.$inferSelect): ContractRow {
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    category: row.category,
    provider: row.provider,
    startDate: row.startDate,
    renewalDate: row.renewalDate,
    cancellationDeadline: row.cancellationDeadline,
    cost: centsToDecimal(row.cost),
    currency: row.currency,
    billingFrequency: row.billingFrequency,
    status: row.status,
    notes: row.notes,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
