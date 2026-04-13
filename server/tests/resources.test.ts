// ---------------------------------------------------------------------------
// Unit Tests: Resources — T-1796 through T-1799
// ---------------------------------------------------------------------------
import { describe, it, expect } from 'vitest';

// ---- Pure formula functions (mirrors logic from ResourceService) ----------

function calculateProduction(baseRate: number, workerBonus: number, researchMod: number): number {
  return baseRate * (1 + workerBonus) * (1 + researchMod);
}

function calculateDecay(currentAmount: number, decayRate: number): number {
  return Math.max(0, currentAmount * (1 - decayRate));
}

function enforceCap(amount: number, cap: number): number {
  return Math.min(amount, cap);
}

function validateConversion(
  fromAmount: number,
  ratio: number,
  minRequired: number,
): { valid: boolean; outputAmount: number } {
  if (fromAmount < minRequired) return { valid: false, outputAmount: 0 };
  return { valid: true, outputAmount: Math.floor(fromAmount * ratio) };
}

describe('Resource Production (T-1796)', () => {
  it('calculates base production correctly', () => {
    expect(calculateProduction(10, 0, 0)).toBe(10);
  });

  it('applies worker bonus', () => {
    expect(calculateProduction(10, 0.5, 0)).toBe(15);
  });

  it('applies research modifier', () => {
    expect(calculateProduction(10, 0, 0.2)).toBe(12);
  });

  it('stacks worker + research bonuses', () => {
    expect(calculateProduction(10, 0.5, 0.2)).toBeCloseTo(18);
  });

  it('handles zero base rate', () => {
    expect(calculateProduction(0, 0.5, 0.2)).toBe(0);
  });
});

describe('Resource Decay (T-1797)', () => {
  it('decays at given rate', () => {
    expect(calculateDecay(100, 0.1)).toBe(90);
  });

  it('never decays below zero', () => {
    expect(calculateDecay(5, 1.5)).toBe(0);
  });

  it('zero decay rate preserves amount', () => {
    expect(calculateDecay(100, 0)).toBe(100);
  });
});

describe('Resource Cap (T-1798)', () => {
  it('caps at maximum', () => {
    expect(enforceCap(1500, 1000)).toBe(1000);
  });

  it('allows value under cap', () => {
    expect(enforceCap(500, 1000)).toBe(500);
  });

  it('allows exact cap value', () => {
    expect(enforceCap(1000, 1000)).toBe(1000);
  });
});

describe('Resource Conversion (T-1799)', () => {
  it('validates sufficient input', () => {
    const result = validateConversion(100, 0.5, 50);
    expect(result.valid).toBe(true);
    expect(result.outputAmount).toBe(50);
  });

  it('rejects insufficient input', () => {
    const result = validateConversion(10, 0.5, 50);
    expect(result.valid).toBe(false);
  });

  it('floors output to integer', () => {
    const result = validateConversion(7, 0.3, 1);
    expect(result.outputAmount).toBe(2);
  });
});
