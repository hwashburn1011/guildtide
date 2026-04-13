// ---------------------------------------------------------------------------
// Unit Tests: Market — T-1808 through T-1810
// ---------------------------------------------------------------------------
import { describe, it, expect } from 'vitest';

// ---- Market formulas ------------------------------------------------------

function calculateMarketPrice(
  basePrice: number,
  supply: number,
  demand: number,
): number {
  const ratio = demand / Math.max(1, supply);
  return Math.max(1, Math.floor(basePrice * ratio));
}

function calculateFee(price: number, feeRate: number, minFee: number): number {
  return Math.max(minFee, Math.floor(price * feeRate));
}

function validateBid(
  bidAmount: number,
  currentHighBid: number,
  minIncrement: number,
): { valid: boolean; reason?: string } {
  if (bidAmount <= 0) return { valid: false, reason: 'Bid must be positive' };
  if (bidAmount <= currentHighBid)
    return { valid: false, reason: 'Bid must exceed current high bid' };
  if (bidAmount - currentHighBid < minIncrement)
    return { valid: false, reason: `Minimum increment is ${minIncrement}` };
  return { valid: true };
}

describe('Market Price Calculation (T-1808)', () => {
  it('equal supply and demand yields base price', () => {
    expect(calculateMarketPrice(100, 50, 50)).toBe(100);
  });

  it('high demand increases price', () => {
    expect(calculateMarketPrice(100, 50, 100)).toBe(200);
  });

  it('high supply decreases price', () => {
    expect(calculateMarketPrice(100, 200, 50)).toBe(25);
  });

  it('never goes below 1', () => {
    expect(calculateMarketPrice(100, 10_000, 1)).toBe(1);
  });

  it('handles zero supply gracefully', () => {
    expect(calculateMarketPrice(100, 0, 50)).toBe(5_000);
  });
});

describe('Market Fee Calculation (T-1809)', () => {
  it('applies percentage fee', () => {
    expect(calculateFee(1000, 0.05, 1)).toBe(50);
  });

  it('enforces minimum fee', () => {
    expect(calculateFee(10, 0.05, 5)).toBe(5);
  });

  it('floors to integer', () => {
    expect(calculateFee(33, 0.05, 1)).toBe(1);
  });
});

describe('Auction Bidding Validation (T-1810)', () => {
  it('accepts valid bid above current + increment', () => {
    const result = validateBid(150, 100, 10);
    expect(result.valid).toBe(true);
  });

  it('rejects bid equal to current', () => {
    const result = validateBid(100, 100, 10);
    expect(result.valid).toBe(false);
  });

  it('rejects bid below minimum increment', () => {
    const result = validateBid(105, 100, 10);
    expect(result.valid).toBe(false);
  });

  it('rejects zero or negative bids', () => {
    expect(validateBid(0, 100, 10).valid).toBe(false);
    expect(validateBid(-50, 100, 10).valid).toBe(false);
  });
});
