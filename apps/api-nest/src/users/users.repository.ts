import { Inject, Injectable } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';

import { DRIZZLE, type Database } from '../db/db.module.js';
import { consents, users } from '../db/schema/index.js';
import { newId } from '../shared/ids.js';

export interface UserRow {
  id: string;
  email: string;
  name: string | null;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Lowercase and trim an email for identity comparison.
 *
 * Mirrors `normalizeEmail` in the Go repositories: contract shares resolve by
 * email, so identity must be case-insensitive and deterministic.
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

@Injectable()
export class UsersRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async findByExternalId(
    provider: string,
    subjectId: string,
  ): Promise<UserRow | undefined> {
    const [row] = await this.db
      .select()
      .from(users)
      .where(
        and(
          eq(users.externalAuthProvider, provider),
          eq(users.externalSubjectId, subjectId),
          isNull(users.deletedAt),
        ),
      )
      .limit(1);

    return row ? toUserRow(row) : undefined;
  }

  async findById(id: string): Promise<UserRow | undefined> {
    const [row] = await this.db
      .select()
      .from(users)
      .where(and(eq(users.id, id), isNull(users.deletedAt)))
      .limit(1);

    return row ? toUserRow(row) : undefined;
  }

  async create(input: {
    externalSubjectId: string;
    email: string;
    emailVerified: boolean;
  }): Promise<UserRow> {
    const [row] = await this.db
      .insert(users)
      .values({
        id: newId(),
        externalAuthProvider: 'firebase',
        externalSubjectId: input.externalSubjectId,
        email: normalizeEmail(input.email),
        emailVerified: input.emailVerified,
      })
      .returning();

    return toUserRow(row);
  }

  async updateEmail(id: string, email: string): Promise<void> {
    await this.db
      .update(users)
      .set({ email: normalizeEmail(email), emailVerified: true, updatedAt: new Date() })
      .where(eq(users.id, id));
  }

  /**
   * Permanently delete a user and all associated data (GDPR erasure).
   *
   * Contracts, reminders, consents and notifications cascade at the database
   * level; `audit_logs.actor_user_id` is set to NULL by `ON DELETE SET NULL`.
   */
  async hardDelete(id: string): Promise<void> {
    await this.db.delete(users).where(eq(users.id, id));
  }

  async listConsents(userId: string) {
    return this.db
      .select()
      .from(consents)
      .where(eq(consents.userId, userId))
      .orderBy(consents.grantedAt);
  }

  async grantConsent(userId: string, consentType: string, version: string) {
    const [row] = await this.db
      .insert(consents)
      .values({ id: newId(), userId, consentType, version })
      .returning();
    return row;
  }

  async findActiveConsent(userId: string, consentType: string) {
    const [row] = await this.db
      .select()
      .from(consents)
      .where(
        and(
          eq(consents.userId, userId),
          eq(consents.consentType, consentType),
          isNull(consents.withdrawnAt),
        ),
      )
      .limit(1);
    return row;
  }

  async withdrawConsent(id: string): Promise<void> {
    await this.db
      .update(consents)
      .set({ withdrawnAt: new Date() })
      .where(eq(consents.id, id));
  }
}

function toUserRow(row: typeof users.$inferSelect): UserRow {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    emailVerified: row.emailVerified,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}
