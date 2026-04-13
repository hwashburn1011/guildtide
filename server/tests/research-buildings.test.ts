// ---------------------------------------------------------------------------
// Unit Tests: Research & Buildings — T-1815 through T-1822
// ---------------------------------------------------------------------------
import { describe, it, expect } from 'vitest';

// ---- Research formulas ----------------------------------------------------

function calculateResearchTime(
  baseTime: number,
  modifiers: number,
  libraryBonus: number,
): number {
  return Math.max(1_000, Math.floor(baseTime * (1 - modifiers) * (1 - libraryBonus)));
}

function validatePrerequisites(
  completed: string[],
  required: string[],
): { valid: boolean; missing: string[] } {
  const missing = required.filter((r) => !completed.includes(r));
  return { valid: missing.length === 0, missing };
}

function applyResearchEffect(
  currentValue: number,
  effectType: 'flat' | 'percent',
  effectValue: number,
): number {
  if (effectType === 'flat') return currentValue + effectValue;
  return Math.floor(currentValue * (1 + effectValue / 100));
}

// ---- Building formulas ----------------------------------------------------

function calculateBuildingProduction(
  baseRate: number,
  workerCount: number,
  workerEfficiency: number,
  adjacencyBonus: number,
): number {
  return Math.floor(baseRate * (1 + workerCount * workerEfficiency) * (1 + adjacencyBonus));
}

function calculateUpgradeCost(
  baseCost: number,
  currentLevel: number,
  scalingFactor: number,
): number {
  return Math.floor(baseCost * Math.pow(scalingFactor, currentLevel));
}

function calculateAdjacencyBonus(
  neighbors: Array<{ type: string; level: number }>,
  bonusMap: Record<string, number>,
): number {
  return neighbors.reduce((total, n) => total + (bonusMap[n.type] ?? 0) * n.level * 0.01, 0);
}

// ---- Guild formulas -------------------------------------------------------

function calculateGuildXp(sources: Array<{ type: string; amount: number }>): number {
  return sources.reduce((total, s) => total + s.amount, 0);
}

function guildLevelUpThreshold(currentLevel: number): number {
  return Math.floor(500 * Math.pow(currentLevel, 1.8));
}

describe('Research Time (T-1815)', () => {
  it('reduces with modifiers', () => {
    const base = calculateResearchTime(60_000, 0, 0);
    const boosted = calculateResearchTime(60_000, 0.2, 0);
    expect(boosted).toBeLessThan(base);
  });

  it('library bonus stacks with modifiers', () => {
    const result = calculateResearchTime(60_000, 0.1, 0.1);
    expect(result).toBeLessThan(60_000);
  });

  it('never below 1 second', () => {
    expect(calculateResearchTime(1_000, 0.99, 0.99)).toBeGreaterThanOrEqual(1_000);
  });
});

describe('Research Prerequisites (T-1816)', () => {
  it('passes when all prerequisites met', () => {
    const result = validatePrerequisites(['a', 'b', 'c'], ['a', 'b']);
    expect(result.valid).toBe(true);
    expect(result.missing).toHaveLength(0);
  });

  it('fails with missing prerequisites', () => {
    const result = validatePrerequisites(['a'], ['a', 'b', 'c']);
    expect(result.valid).toBe(false);
    expect(result.missing).toEqual(['b', 'c']);
  });
});

describe('Research Effect Application (T-1817)', () => {
  it('applies flat bonus', () => {
    expect(applyResearchEffect(100, 'flat', 25)).toBe(125);
  });

  it('applies percent bonus', () => {
    expect(applyResearchEffect(100, 'percent', 20)).toBe(120);
  });
});

describe('Building Production (T-1818)', () => {
  it('increases with workers', () => {
    const noWorker = calculateBuildingProduction(10, 0, 0.1, 0);
    const withWorkers = calculateBuildingProduction(10, 3, 0.1, 0);
    expect(withWorkers).toBeGreaterThan(noWorker);
  });

  it('applies adjacency bonus', () => {
    const noAdj = calculateBuildingProduction(10, 1, 0.1, 0);
    const withAdj = calculateBuildingProduction(10, 1, 0.1, 0.2);
    expect(withAdj).toBeGreaterThan(noAdj);
  });
});

describe('Building Upgrade Cost (T-1819)', () => {
  it('cost grows with level', () => {
    const lvl1 = calculateUpgradeCost(100, 1, 1.5);
    const lvl5 = calculateUpgradeCost(100, 5, 1.5);
    expect(lvl5).toBeGreaterThan(lvl1);
  });

  it('scaling factor controls growth rate', () => {
    const slow = calculateUpgradeCost(100, 5, 1.2);
    const fast = calculateUpgradeCost(100, 5, 2.0);
    expect(fast).toBeGreaterThan(slow);
  });
});

describe('Building Adjacency (T-1820)', () => {
  it('sums neighbor bonuses', () => {
    const neighbors = [
      { type: 'farm', level: 2 },
      { type: 'warehouse', level: 3 },
    ];
    const bonusMap = { farm: 5, warehouse: 3 };
    const bonus = calculateAdjacencyBonus(neighbors, bonusMap);
    expect(bonus).toBeCloseTo(0.19);
  });

  it('ignores unknown building types', () => {
    const neighbors = [{ type: 'unknown', level: 5 }];
    const bonusMap = { farm: 5 };
    expect(calculateAdjacencyBonus(neighbors, bonusMap)).toBe(0);
  });
});

describe('Guild XP (T-1821)', () => {
  it('sums all XP sources', () => {
    const sources = [
      { type: 'expedition', amount: 50 },
      { type: 'building', amount: 20 },
      { type: 'research', amount: 30 },
    ];
    expect(calculateGuildXp(sources)).toBe(100);
  });
});

describe('Guild Level-Up Threshold (T-1822)', () => {
  it('threshold increases with level', () => {
    expect(guildLevelUpThreshold(5)).toBeGreaterThan(guildLevelUpThreshold(2));
  });

  it('level 1 threshold is base value', () => {
    expect(guildLevelUpThreshold(1)).toBe(500);
  });
});
