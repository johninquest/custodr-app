/**
 * Enum-like value sets for CHECK-constrained TEXT columns.
 *
 * Per ADR 001 decision #4 these are deliberately NOT native PostgreSQL enums:
 * the value sets are expected to expand, and `ALTER TYPE ... DROP VALUE` is
 * not supported in PostgreSQL. CHECK constraints on TEXT keep the contract
 * extensible at the cost of a slightly wider column.
 *
 * These arrays are the single source of truth — they are consumed by both the
 * Drizzle `check()` constraints and the Zod request-validation schemas, so a
 * new category only has to be added here.
 */

export const CONTRACT_STATUSES = [
  'active',
  'cancelled',
  'expired',
  'paused',
  'review_needed',
] as const;

export const BILLING_FREQUENCIES = [
  'monthly',
  'quarterly',
  'semi_annual',
  'annual',
] as const;

export const CONTRACT_CATEGORIES = [
  'insurance',
  'electricity_contract',
  'gas_contract',
  'mobile_contract',
  'streaming_subscription',
  'other',
] as const;

export const REMINDER_TYPES = [
  'renewal_date',
  'cancellation_deadline',
] as const;

export const REMINDER_STATUSES = ['pending', 'sent', 'failed'] as const;

export const CONSENT_TYPES = ['email_notifications'] as const;

export const AUDIT_ENTITY_TYPES = ['contract', 'contract_share'] as const;

export const SHARE_ROLES = ['viewer'] as const;

/** Reminder windows offered to users, in days before the deadline. */
export const REMINDER_WINDOW_OPTIONS = [1, 7, 14, 30, 60, 90] as const;

/** Default reminder windows applied when a user has no stored preference. */
export const DEFAULT_REMINDER_WINDOWS = [90, 60, 30, 14, 7, 1];

export type ContractStatus = (typeof CONTRACT_STATUSES)[number];
export type BillingFrequency = (typeof BILLING_FREQUENCIES)[number];
export type ContractCategory = (typeof CONTRACT_CATEGORIES)[number];
export type ReminderType = (typeof REMINDER_TYPES)[number];
export type ReminderStatus = (typeof REMINDER_STATUSES)[number];
export type ConsentType = (typeof CONSENT_TYPES)[number];
export type AuditEntityType = (typeof AUDIT_ENTITY_TYPES)[number];
export type ShareRole = (typeof SHARE_ROLES)[number];
