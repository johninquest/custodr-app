/**
 * Money conversion between the API's decimal representation and the database's
 * integer cents.
 *
 * Mirrors `centsToDecimal` / `decimalToCents` in the Go repository. Amounts are
 * never stored as floats — `schema.md` mandates INTEGER cents to avoid
 * floating-point precision errors.
 */

/** Convert integer cents to a decimal amount (1599 -> 15.99). */
export function centsToDecimal(cents: number): number {
  return Math.round(cents) / 100;
}

/** Convert a decimal amount to integer cents (15.99 -> 1599). */
export function decimalToCents(amount: number): number {
  return Math.round(amount * 100);
}

/**
 * Monthly divisor per billing frequency, for normalising cost.
 *
 * A quarterly contract costs `cents / 3` per month, an annual one `cents / 12`,
 * and so on. Shared by the dashboard summary and `GET /contracts/upcoming`.
 */
export const MONTHLY_DIVISOR: Record<string, number> = {
  monthly: 1,
  quarterly: 3,
  semi_annual: 6,
  annual: 12,
};

/**
 * Normalise a per-period cost in integer cents to its monthly equivalent.
 *
 * Unknown frequencies fall back to 1 (treated as monthly) so a malformed row
 * can never divide by zero or inflate the total.
 */
export function toMonthlyCents(billingFrequency: string, cents: number): number {
  const divisor = MONTHLY_DIVISOR[billingFrequency] ?? 1;
  return cents / divisor;
}
