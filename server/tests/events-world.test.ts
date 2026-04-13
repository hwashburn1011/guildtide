// ---------------------------------------------------------------------------
// Unit Tests: Events & World Data — T-1823 through T-1829
// ---------------------------------------------------------------------------
import { describe, it, expect } from 'vitest';

// ---- Event formulas -------------------------------------------------------

interface EventCondition {
  type: 'resource_above' | 'resource_below' | 'level_above' | 'season_is';
  target: string;
  value: number | string;
}

function evaluateCondition(
  condition: EventCondition,
  state: Record<string, number | string>,
): boolean {
  const actual = state[condition.target];
  switch (condition.type) {
    case 'resource_above':
      return typeof actual === 'number' && actual > (condition.value as number);
    case 'resource_below':
      return typeof actual === 'number' && actual < (condition.value as number);
    case 'level_above':
      return typeof actual === 'number' && actual > (condition.value as number);
    case 'season_is':
      return actual === condition.value;
    default:
      return false;
  }
}

function applyEventEffect(
  resources: Record<string, number>,
  effects: Array<{ resource: string; delta: number }>,
): Record<string, number> {
  const result = { ...resources };
  for (const effect of effects) {
    result[effect.resource] = Math.max(0, (result[effect.resource] ?? 0) + effect.delta);
  }
  return result;
}

function isOnCooldown(
  lastTriggered: number,
  cooldownMs: number,
  now: number,
): boolean {
  return now - lastTriggered < cooldownMs;
}

// ---- World data formulas --------------------------------------------------

function mapWeatherToEffect(weatherCode: string): { production: number; morale: number } {
  switch (weatherCode) {
    case 'clear':
      return { production: 0.1, morale: 0.05 };
    case 'rain':
      return { production: -0.05, morale: -0.02 };
    case 'storm':
      return { production: -0.2, morale: -0.1 };
    case 'snow':
      return { production: -0.1, morale: 0.0 };
    default:
      return { production: 0, morale: 0 };
  }
}

function normalizeFinancialData(
  value: number,
  min: number,
  max: number,
): number {
  return Math.max(-1, Math.min(1, (value - min) / (max - min) * 2 - 1));
}

function calculateMoonPhase(dayOfYear: number): number {
  // Simplified: lunar cycle is ~29.53 days
  return ((dayOfYear % 29.53) / 29.53) * 360;
}

function determineSeason(month: number, isNorthernHemisphere: boolean): string {
  const seasons = isNorthernHemisphere
    ? ['winter', 'winter', 'spring', 'spring', 'spring', 'summer', 'summer', 'summer', 'autumn', 'autumn', 'autumn', 'winter']
    : ['summer', 'summer', 'autumn', 'autumn', 'autumn', 'winter', 'winter', 'winter', 'spring', 'spring', 'spring', 'summer'];
  return seasons[month];
}

describe('Event Condition Evaluation (T-1823)', () => {
  it('resource_above passes when above threshold', () => {
    expect(
      evaluateCondition(
        { type: 'resource_above', target: 'gold', value: 100 },
        { gold: 150 },
      ),
    ).toBe(true);
  });

  it('resource_above fails when below threshold', () => {
    expect(
      evaluateCondition(
        { type: 'resource_above', target: 'gold', value: 100 },
        { gold: 50 },
      ),
    ).toBe(false);
  });

  it('season_is matches correctly', () => {
    expect(
      evaluateCondition(
        { type: 'season_is', target: 'season', value: 'winter' },
        { season: 'winter' },
      ),
    ).toBe(true);
  });
});

describe('Event Effect Application (T-1824)', () => {
  it('adds positive effects', () => {
    const result = applyEventEffect(
      { gold: 100, wood: 50 },
      [{ resource: 'gold', delta: 50 }],
    );
    expect(result.gold).toBe(150);
  });

  it('subtracts negative effects without going below 0', () => {
    const result = applyEventEffect(
      { gold: 30 },
      [{ resource: 'gold', delta: -50 }],
    );
    expect(result.gold).toBe(0);
  });
});

describe('Event Cooldown (T-1825)', () => {
  it('is on cooldown within window', () => {
    expect(isOnCooldown(1000, 5000, 3000)).toBe(true);
  });

  it('is not on cooldown after window expires', () => {
    expect(isOnCooldown(1000, 5000, 7000)).toBe(false);
  });
});

describe('Weather Mapping (T-1826)', () => {
  it('clear weather boosts production', () => {
    const effect = mapWeatherToEffect('clear');
    expect(effect.production).toBeGreaterThan(0);
  });

  it('storm weather penalizes', () => {
    const effect = mapWeatherToEffect('storm');
    expect(effect.production).toBeLessThan(0);
    expect(effect.morale).toBeLessThan(0);
  });

  it('unknown weather has no effect', () => {
    const effect = mapWeatherToEffect('unknown');
    expect(effect.production).toBe(0);
  });
});

describe('Financial Data Normalization (T-1827)', () => {
  it('midpoint normalizes to 0', () => {
    expect(normalizeFinancialData(50, 0, 100)).toBeCloseTo(0);
  });

  it('max normalizes to 1', () => {
    expect(normalizeFinancialData(100, 0, 100)).toBeCloseTo(1);
  });

  it('min normalizes to -1', () => {
    expect(normalizeFinancialData(0, 0, 100)).toBeCloseTo(-1);
  });

  it('clamps outliers', () => {
    expect(normalizeFinancialData(200, 0, 100)).toBe(1);
    expect(normalizeFinancialData(-50, 0, 100)).toBe(-1);
  });
});

describe('Moon Phase (T-1828)', () => {
  it('returns 0-360 degrees', () => {
    for (let d = 1; d <= 365; d++) {
      const phase = calculateMoonPhase(d);
      expect(phase).toBeGreaterThanOrEqual(0);
      expect(phase).toBeLessThan(360);
    }
  });

  it('cycles approximately every 29.5 days', () => {
    const phase1 = calculateMoonPhase(1);
    const phase30 = calculateMoonPhase(30);
    expect(Math.abs(phase30 - phase1)).toBeLessThan(20); // roughly same phase
  });
});

describe('Season Determination (T-1829)', () => {
  it('January is winter in northern hemisphere', () => {
    expect(determineSeason(0, true)).toBe('winter');
  });

  it('July is summer in northern hemisphere', () => {
    expect(determineSeason(6, true)).toBe('summer');
  });

  it('January is summer in southern hemisphere', () => {
    expect(determineSeason(0, false)).toBe('summer');
  });

  it('all 12 months return valid seasons', () => {
    const validSeasons = ['spring', 'summer', 'autumn', 'winter'];
    for (let m = 0; m < 12; m++) {
      expect(validSeasons).toContain(determineSeason(m, true));
    }
  });
});
