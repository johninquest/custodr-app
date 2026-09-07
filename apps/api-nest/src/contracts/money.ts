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
