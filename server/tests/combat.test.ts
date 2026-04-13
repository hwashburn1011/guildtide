// ---------------------------------------------------------------------------
// Unit Tests: Combat — T-1804 through T-1807
// ---------------------------------------------------------------------------
import { describe, it, expect } from 'vitest';
import { sampleRuns } from './helpers';

// ---- Pure combat formulas -------------------------------------------------

function calculateDamage(
  attack: number,
  defense: number,
  critMultiplier: number,
  elementalMod: number,
): number {
  const baseDmg = Math.max(1, attack - defense * 0.5);
  return Math.floor(baseDmg * critMultiplier * (1 + elementalMod));
}

function critProbability(luck: number, baseCritChance: number): number {
  return Math.min(1, baseCritChance + luck * 0.002);
}

function rollCrit(luck: number, baseCritChance: number): boolean {
  return Math.random() < critProbability(luck, baseCritChance);
}

function calculateInitiative(speed: number, randomFactor: number): number {
  return speed + Math.floor(randomFactor * 10);
}

function sortByInitiative(
  combatants: Array<{ id: string; speed: number }>,
): Array<{ id: string; initiative: number }> {
  return combatants
    .map((c) => ({ id: c.id, initiative: calculateInitiative(c.speed, Math.random()) }))
    .sort((a, b) => b.initiative - a.initiative);
}

interface StatusEffect {
  type: string;
  duration: number;
  modifier: number;
}

function applyStatusEffect(effects: StatusEffect[]): StatusEffect[] {
  return effects
    .map((e) => ({ ...e, duration: e.duration - 1 }))
    .filter((e) => e.duration > 0);
}

describe('Combat Damage Formula (T-1804)', () => {
  it('deals minimum 1 damage when defense exceeds attack', () => {
    expect(calculateDamage(5, 100, 1, 0)).toBe(1);
  });

  it('applies critical multiplier', () => {
    const normal = calculateDamage(20, 10, 1, 0);
    const crit = calculateDamage(20, 10, 2, 0);
    expect(crit).toBe(normal * 2);
  });

  it('applies elemental modifier', () => {
    const base = calculateDamage(20, 10, 1, 0);
    const boosted = calculateDamage(20, 10, 1, 0.5);
    expect(boosted).toBeGreaterThan(base);
  });

  it('all modifiers stack correctly', () => {
    const dmg = calculateDamage(30, 10, 1.5, 0.25);
    const expected = Math.floor(Math.max(1, 30 - 10 * 0.5) * 1.5 * 1.25);
    expect(dmg).toBe(expected);
  });
});

describe('Combat Critical Hit (T-1805)', () => {
  it('base crit chance is respected', () => {
    expect(critProbability(0, 0.05)).toBeCloseTo(0.05);
  });

  it('luck increases crit chance', () => {
    expect(critProbability(50, 0.05)).toBeCloseTo(0.15);
  });

  it('crit chance caps at 100%', () => {
    expect(critProbability(1000, 0.5)).toBe(1);
  });

  it('statistical crit rate matches probability', () => {
    const { mean } = sampleRuns(() => (rollCrit(50, 0.05) ? 1 : 0) as number, 5_000);
    expect(mean).toBeGreaterThan(0.1);
    expect(mean).toBeLessThan(0.2);
  });
});

describe('Combat Initiative (T-1806)', () => {
  it('higher speed generally goes first', () => {
    const combatants = [
      { id: 'fast', speed: 20 },
      { id: 'slow', speed: 5 },
    ];
    // Run multiple times — fast should win majority
    let fastFirst = 0;
    for (let i = 0; i < 100; i++) {
      const order = sortByInitiative(combatants);
      if (order[0].id === 'fast') fastFirst++;
    }
    expect(fastFirst).toBeGreaterThan(70);
  });
});

describe('Combat Status Effects (T-1807)', () => {
  it('decrements duration each tick', () => {
    const effects: StatusEffect[] = [{ type: 'poison', duration: 3, modifier: -5 }];
    const after = applyStatusEffect(effects);
    expect(after[0].duration).toBe(2);
  });

  it('removes expired effects', () => {
    const effects: StatusEffect[] = [{ type: 'poison', duration: 1, modifier: -5 }];
    const after = applyStatusEffect(effects);
    expect(after).toHaveLength(0);
  });

  it('preserves active effects', () => {
    const effects: StatusEffect[] = [
      { type: 'poison', duration: 1, modifier: -5 },
      { type: 'buff', duration: 5, modifier: 10 },
    ];
    const after = applyStatusEffect(effects);
    expect(after).toHaveLength(1);
    expect(after[0].type).toBe('buff');
  });
});
