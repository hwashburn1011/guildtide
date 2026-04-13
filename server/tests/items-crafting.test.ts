// ---------------------------------------------------------------------------
// Unit Tests: Items & Crafting — T-1830 through T-1832
// ---------------------------------------------------------------------------
import { describe, it, expect } from 'vitest';
import { sampleRuns } from './helpers';

// ---- Item formulas --------------------------------------------------------

function randomizeStat(
  base: number,
  variance: number,
): number {
  const min = Math.floor(base * (1 - variance));
  const max = Math.ceil(base * (1 + variance));
  return min + Math.floor(Math.random() * (max - min + 1));
}

function checkSetBonus(
  equippedSetPieces: number,
  thresholds: Array<{ pieces: number; bonus: Record<string, number> }>,
): Record<string, number> {
  const active: Record<string, number> = {};
  for (const t of thresholds) {
    if (equippedSetPieces >= t.pieces) {
      for (const [stat, val] of Object.entries(t.bonus)) {
        active[stat] = (active[stat] ?? 0) + val;
      }
    }
  }
  return active;
}

function rollCraftingQuality(
  baseQuality: number,
  skillLevel: number,
  luckMod: number,
): string {
  const roll = baseQuality + skillLevel * 0.5 + Math.random() * luckMod;
  if (roll >= 90) return 'legendary';
  if (roll >= 70) return 'epic';
  if (roll >= 50) return 'rare';
  if (roll >= 30) return 'uncommon';
  return 'common';
}

describe('Item Stat Randomization (T-1830)', () => {
  it('stays within bounds', () => {
    const { min, max } = sampleRuns(() => randomizeStat(100, 0.2) as number, 1_000);
    expect(min).toBeGreaterThanOrEqual(80);
    expect(max).toBeLessThanOrEqual(120);
  });

  it('zero variance produces exact value', () => {
    for (let i = 0; i < 20; i++) {
      expect(randomizeStat(50, 0)).toBe(50);
    }
  });
});

describe('Item Set Bonus (T-1831)', () => {
  it('activates bonus at threshold', () => {
    const thresholds = [
      { pieces: 2, bonus: { attack: 5 } },
      { pieces: 4, bonus: { defense: 10 } },
    ];
    const bonus = checkSetBonus(2, thresholds);
    expect(bonus.attack).toBe(5);
    expect(bonus.defense).toBeUndefined();
  });

  it('stacks multiple thresholds', () => {
    const thresholds = [
      { pieces: 2, bonus: { attack: 5 } },
      { pieces: 4, bonus: { attack: 10, defense: 10 } },
    ];
    const bonus = checkSetBonus(4, thresholds);
    expect(bonus.attack).toBe(15);
    expect(bonus.defense).toBe(10);
  });

  it('no bonus below minimum pieces', () => {
    const thresholds = [{ pieces: 3, bonus: { attack: 5 } }];
    const bonus = checkSetBonus(1, thresholds);
    expect(Object.keys(bonus)).toHaveLength(0);
  });
});

describe('Crafting Quality Roll (T-1832)', () => {
  it('high skill produces higher quality on average', () => {
    const lowSkill = sampleRuns(
      () => (rollCraftingQuality(20, 5, 10) === 'common' ? 1 : 0) as number,
      500,
    );
    const highSkill = sampleRuns(
      () => (rollCraftingQuality(20, 50, 10) === 'common' ? 1 : 0) as number,
      500,
    );
    expect(highSkill.mean).toBeLessThan(lowSkill.mean);
  });

  it('returns valid quality strings', () => {
    const validQualities = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
    for (let i = 0; i < 50; i++) {
      expect(validQualities).toContain(rollCraftingQuality(50, 10, 20));
    }
  });
});
