import { describe, expect, it } from 'vitest';

import {
  MONTHLY_DIVISOR,
  centsToDecimal,
  decimalToCents,
  toMonthlyCents,
} from './money.js';

describe('centsToDecimal', () => {
  it('converts integer cents to a decimal amount (1599 -> 15.99)', () => {
    expect(centsToDecimal(1599)).toBe(15.99);
  });

  it('converts zero (0 -> 0)', () => {
    expect(centsToDecimal(0)).toBe(0);
  });

  it('keeps whole-euro amounts integral (2500 -> 25)', () => {
    expect(centsToDecimal(2500)).toBe(25);
  });

  it('handles single-digit cents with trailing zero (1590 -> 15.9)', () => {
    // 15.9 === 15.90 numerically; float representation is exact here.
    expect(centsToDecimal(1590)).toBe(15.9);
  });

  it('rounds half-input to nearest integer cent first (1599.4 -> 15.99)', () => {
    // Defensive: DB column is INTEGER, so fractional input is a caller bug —
    // Math.round guards against it rather than propagating a fraction.
    expect(centsToDecimal(1599.4)).toBe(15.99);
  });

  it('is exact for amounts representable in binary floating point', () => {
    // 0.1 is NOT representable exactly, but the cents->decimal direction of
    // the same integer always round-trips consistently with decimalToCents.
    const amount = centsToDecimal(101);
    expect(amount).toBe(1.01);
    expect(decimalToCents(amount)).toBe(101);
  });
});

describe('decimalToCents', () => {
  it('converts a decimal amount to integer cents (15.99 -> 1599)', () => {
    expect(decimalToCents(15.99)).toBe(1599);
  });

  it('converts zero (0 -> 0)', () => {
    expect(decimalToCents(0)).toBe(0);
  });

  it('rounds classic float imprecision to the correct cent (4.35 -> 435)', () => {
    // 4.35 * 100 === 434.99999999999994 in IEEE 754; Math.round fixes it.
    expect(decimalToCents(4.35)).toBe(435);
  });

  it('rounds to nearest cent (15.995 -> 1600)', () => {
    expect(decimalToCents(15.995)).toBe(1600);
  });

  it('rounds down below the half-cent boundary (15.994 -> 1599)', () => {
    expect(decimalToCents(15.994)).toBe(1599);
  });

  it('rejects no amount the DB CHECK would accept (>= 0)', () => {
    // schema.md: contracts_cost_positive CHECK (cost >= 0) — zero is valid.
    expect(decimalToCents(0.001)).toBe(0);
  });

  it('round-trips with centsToDecimal for a sample of values', () => {
    const cents = [1, 5, 99, 100, 1599, 25000, 123456];
    for (const c of cents) {
      expect(decimalToCents(centsToDecimal(c))).toBe(c);
    }
  });
});

describe('MONTHLY_DIVISOR', () => {
  it('covers all four billing frequencies from the schema enum', () => {
    // Must stay in lockstep with BILLING_FREQUENCIES in db/schema/enums.ts:
    // monthly=1, quarterly=3, semi_annual=6, annual=12.
    expect(MONTHLY_DIVISOR).toEqual({
      monthly: 1,
      quarterly: 3,
      semi_annual: 6,
      annual: 12,
    });
  });
});

describe('toMonthlyCents', () => {
  it.each([
    ['monthly', 1599, 1599],
    ['quarterly', 3000, 1000],
    ['semi_annual', 6000, 1000],
    ['annual', 12000, 1000],
  ] as const)('%s %d cents normalises to %d/month', (freq, cents, expected) => {
    expect(toMonthlyCents(freq, cents)).toBe(expected);
  });

  it('falls back to divisor 1 for an unknown frequency (malformed row)', () => {
    // Contract per money.ts docstring: never divide by zero, never inflate.
    expect(toMonthlyCents('weekly', 1599)).toBe(1599);
    expect(toMonthlyCents('', 999)).toBe(999);
  });

  it('returns a fractional monthly cost for a non-divisible annual amount', () => {
    // 12 x 15.99 is not an integer number of cents per month — the controller
    // rounds the summed total before converting back to a decimal.
    expect(toMonthlyCents('annual', 1599)).toBeCloseTo(133.25, 6);
  });

  it('handles zero cost', () => {
    expect(toMonthlyCents('annual', 0)).toBe(0);
  });
});
