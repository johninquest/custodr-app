import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';

import {
  AUDIT_ENTITY_TYPES,
  BILLING_FREQUENCIES,
  CONSENT_TYPES,
  CONTRACT_CATEGORIES,
  CONTRACT_STATUSES,
  DEFAULT_REMINDER_WINDOWS,
  REMINDER_STATUSES,
  REMINDER_TYPES,
  SHARE_ROLES,
} from './enums.js';

/**
 * Build a `CHECK (col IN (...))` constraint from a readonly value tuple.
 *
 * Drizzle emits the values as parameters, so they are inlined as literals via
 * `sql.raw` to keep the generated migration readable and diffable.
 */
function inList(values: readonly string[]): string {
  return values.map((v) => `'${v}'`).join(', ');
}

/** Shared `created_at` / `updated_at` audit timestamp columns. */
const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
};

// ---------------------------------------------------------------------------
// users
// ---------------------------------------------------------------------------

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey(),
    externalAuthProvider: text('external_auth_provider')
      .notNull()
      .default('firebase'),
    externalSubjectId: text('external_subject_id').notNull(),
    email: text('email').notNull(),
    name: text('name'),
    emailVerified: boolean('email_verified').notNull().default(false),
    ...timestamps,
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [
    unique('users_external_subject_id_unique').on(
      t.externalAuthProvider,
      t.externalSubjectId,
    ),
    unique('users_email_unique').on(t.email),
    index('idx_users_email')
      .on(t.email)
      .where(sql`${t.deletedAt} IS NULL`),
    index('idx_users_external_subject_id')
      .on(t.externalAuthProvider, t.externalSubjectId)
      .where(sql`${t.deletedAt} IS NULL`),
  ],
);

// ---------------------------------------------------------------------------
// contracts
// ---------------------------------------------------------------------------

export const contracts = pgTable(
  'contracts',
  {
    id: uuid('id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    category: text('category').notNull(),
    provider: text('provider').notNull(),
    startDate: date('start_date').notNull(),
    renewalDate: date('renewal_date').notNull(),
    cancellationDeadline: date('cancellation_deadline'),
    /** Monetary amount in integer cents. Never a float. */
    cost: integer('cost').notNull(),
    currency: text('currency').notNull().default('EUR'),
    billingFrequency: text('billing_frequency').notNull(),
    status: text('status').notNull().default('active'),
    notes: text('notes'),
    ...timestamps,
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [
    check('contracts_category_check', sql`${t.category} IN (${sql.raw(inList(CONTRACT_CATEGORIES))})`),
    check('contracts_billing_frequency_check', sql`${t.billingFrequency} IN (${sql.raw(inList(BILLING_FREQUENCIES))})`),
    check('contracts_status_check', sql`${t.status} IN (${sql.raw(inList(CONTRACT_STATUSES))})`),
    check('contracts_cost_positive', sql`${t.cost} >= 0`),
    check('contracts_renewal_after_start', sql`${t.renewalDate} > ${t.startDate}`),
    check(
      'contracts_cancellation_before_renewal',
      sql`${t.cancellationDeadline} IS NULL OR ${t.cancellationDeadline} < ${t.renewalDate}`,
    ),
    index('idx_contracts_user_id')
      .on(t.userId)
      .where(sql`${t.deletedAt} IS NULL`),
    index('idx_contracts_user_status')
      .on(t.userId, t.status)
      .where(sql`${t.deletedAt} IS NULL`),
    index('idx_contracts_user_category')
      .on(t.userId, t.category)
      .where(sql`${t.deletedAt} IS NULL`),
    index('idx_contracts_renewal_date')
      .on(t.renewalDate)
      .where(sql`${t.deletedAt} IS NULL AND ${t.status} = 'active'`),
    index('idx_contracts_cancellation_deadline')
      .on(t.cancellationDeadline)
      .where(
        sql`${t.deletedAt} IS NULL AND ${t.status} = 'active' AND ${t.cancellationDeadline} IS NOT NULL`,
      ),
  ],
);

// ---------------------------------------------------------------------------
// contract_shares
// ---------------------------------------------------------------------------

export const contractShares = pgTable(
  'contract_shares',
  {
    id: uuid('id').primaryKey(),
    contractId: uuid('contract_id')
      .notNull()
      .references(() => contracts.id, { onDelete: 'cascade' }),
    granteeEmail: text('grantee_email').notNull(),
    role: text('role').notNull().default('viewer'),
    grantedBy: uuid('granted_by')
      .notNull()
      .references(() => users.id),
    grantedAt: timestamp('granted_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
  },
  (t) => [
    check('contract_shares_role_check', sql`${t.role} IN (${sql.raw(inList(SHARE_ROLES))})`),
    unique('contract_shares_contract_grantee_unique').on(
      t.contractId,
      t.granteeEmail,
    ),
    index('idx_contract_shares_grantee_email')
      .on(t.granteeEmail)
      .where(sql`${t.revokedAt} IS NULL`),
    index('idx_contract_shares_contract_id')
      .on(t.contractId)
      .where(sql`${t.revokedAt} IS NULL`),
  ],
);

// ---------------------------------------------------------------------------
// reminder_preferences
// ---------------------------------------------------------------------------

export const reminderPreferences = pgTable(
  'reminder_preferences',
  {
    id: uuid('id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /** Array of day offsets, e.g. [90, 60, 30, 14, 7, 1]. */
    reminderWindows: jsonb('reminder_windows')
      .$type<number[]>()
      .notNull()
      .default(DEFAULT_REMINDER_WINDOWS),
    emailEnabled: boolean('email_enabled').notNull().default(true),
    timezone: text('timezone').notNull().default('Europe/Berlin'),
    ...timestamps,
  },
  (t) => [
    unique('reminder_preferences_user_id_unique').on(t.userId),
    index('idx_reminder_preference_user_id').on(t.userId),
  ],
);

// ---------------------------------------------------------------------------
// reminders
// ---------------------------------------------------------------------------

export const reminders = pgTable(
  'reminders',
  {
    id: uuid('id').primaryKey(),
    contractId: uuid('contract_id')
      .notNull()
      .references(() => contracts.id, { onDelete: 'cascade' }),
    reminderType: text('reminder_type').notNull(),
    scheduledDate: date('scheduled_date').notNull(),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    status: text('status').notNull().default('pending'),
    daysBefore: integer('days_before').notNull(),
    errorMessage: text('error_message'),
    ...timestamps,
  },
  (t) => [
    check('reminders_reminder_type_check', sql`${t.reminderType} IN (${sql.raw(inList(REMINDER_TYPES))})`),
    check('reminders_status_check', sql`${t.status} IN (${sql.raw(inList(REMINDER_STATUSES))})`),
    unique('reminders_unique_schedule').on(
      t.contractId,
      t.reminderType,
      t.daysBefore,
    ),
    index('idx_reminders_contract_id').on(t.contractId),
    index('idx_reminders_scheduled_date')
      .on(t.scheduledDate)
      .where(sql`${t.status} = 'pending'`),
    index('idx_reminders_status').on(t.status),
  ],
);

// ---------------------------------------------------------------------------
// consents
// ---------------------------------------------------------------------------

export const consents = pgTable(
  'consents',
  {
    id: uuid('id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    consentType: text('consent_type').notNull(),
    /** Consent text version identifier, e.g. "2026-09-05". */
    version: text('version').notNull(),
    grantedAt: timestamp('granted_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    withdrawnAt: timestamp('withdrawn_at', { withTimezone: true }),
  },
  (t) => [
    check('consents_consent_type_check', sql`${t.consentType} IN (${sql.raw(inList(CONSENT_TYPES))})`),
    index('idx_consents_user_type').on(t.userId, t.consentType),
  ],
);

// ---------------------------------------------------------------------------
// notifications
// ---------------------------------------------------------------------------

export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    reminderId: uuid('reminder_id').references(() => reminders.id, {
      onDelete: 'set null',
    }),
    notificationType: text('notification_type').notNull(),
    recipient: text('recipient').notNull(),
    subject: text('subject'),
    sentAt: timestamp('sent_at', { withTimezone: true }).notNull().defaultNow(),
    status: text('status').notNull(),
    providerMessageId: text('provider_message_id'),
    errorMessage: text('error_message'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('idx_notifications_user_id').on(t.userId),
    index('idx_notifications_reminder_id').on(t.reminderId),
    index('idx_notifications_sent_at').on(t.sentAt),
    index('idx_notifications_status').on(t.status),
  ],
);

// ---------------------------------------------------------------------------
// audit_logs
// ---------------------------------------------------------------------------

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').primaryKey(),
    entityType: text('entity_type').notNull(),
    entityId: uuid('entity_id').notNull(),
    actorUserId: uuid('actor_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    action: text('action').notNull(),
    field: text('field'),
    beforeValue: jsonb('before_value').$type<unknown>(),
    afterValue: jsonb('after_value').$type<unknown>(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [
    check('audit_logs_entity_type_check', sql`${t.entityType} IN (${sql.raw(inList(AUDIT_ENTITY_TYPES))})`),
    index('idx_audit_logs_entity')
      .on(t.entityType, t.entityId, t.createdAt.desc())
      .where(sql`${t.deletedAt} IS NULL`),
  ],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Contract = typeof contracts.$inferSelect;
export type NewContract = typeof contracts.$inferInsert;
export type ContractShare = typeof contractShares.$inferSelect;
export type NewContractShare = typeof contractShares.$inferInsert;
export type ReminderPreference = typeof reminderPreferences.$inferSelect;
export type NewReminderPreference = typeof reminderPreferences.$inferInsert;
export type Reminder = typeof reminders.$inferSelect;
export type NewReminder = typeof reminders.$inferInsert;
export type Consent = typeof consents.$inferSelect;
export type NewConsent = typeof consents.$inferInsert;
export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;
