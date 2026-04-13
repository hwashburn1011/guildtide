// ---------------------------------------------------------------------------
// Unit Tests: Heroes — T-1800 through T-1803
// ---------------------------------------------------------------------------
import { describe, it, expect } from 'vitest';
import { createMockHero, createMockItem } from './factories';

// ---- Pure formula functions -----------------------------------------------

function calculateHeroStats(
  hero: { attack: number; defense: number; speed: number; level: number },
  equipment: Array<{ attack: number; defense: number }>,
): { attack: number; defense: number; speed: number } {
  const eqAtk = equipment.reduce((s, e) => s + e.attack, 0);
  const eqDef = equipment.reduce((s, e) => s + e.defense, 0);
  const levelMod = 1 + (hero.level - 1) * 0.05;
  return {
    attack: Math.floor((hero.attack + eqAtk) * levelMod),
    defense: Math.floor((hero.defense + eqDef) * levelMod),
    speed: hero.speed,
  };
}

function xpForLevel(level: number): number {
  return Math.floor(100 * Math.pow(level, 1.5));
}

function calculatePowerScore(hero: {
  attack: number;
  defense: number;
  speed: number;
  hp: number;
  level: number;
}): number {
  return Math.floor(
    hero.attack * 1.2 + hero.defense * 1.0 + hero.speed * 0.8 + hero.hp * 0.1 + hero.level * 5,
  );
}

function applyMoraleModifier(baseStat: number, morale: number): number {
  const mod = morale >= 80 ? 1.1 : morale >= 50 ? 1.0 : morale >= 20 ? 0.85 : 0.7;
  return Math.floor(baseStat * mod);
}

describe('Hero Stat Calculation (T-1800)', () => {
  it('calculates base stats without equipment', () => {
    const hero = createMockHero({ attack: 10, defense: 5, speed: 8, level: 1 });
    const stats = calculateHeroStats(hero, []);
    expect(stats.attack).toBe(10);
    expect(stats.defense).toBe(5);
  });

  it('adds equipment bonuses', () => {
    const hero = createMockHero({ attack: 10, defense: 5, speed: 8, level: 1 });
    const eq = [createMockItem({ attack: 5, defense: 2 })];
    const stats = calculateHeroStats(hero, eq);
    expect(stats.attack).toBe(15);
    expect(stats.defense).toBe(7);
  });

  it('applies level scaling', () => {
    const hero = createMockHero({ attack: 10, defense: 5, speed: 8, level: 11 });
    const stats = calculateHeroStats(hero, []);
    expect(stats.attack).toBe(15); // 10 * 1.5
    expect(stats.defense).toBe(7); // floor(5 * 1.5)
  });
});

describe('Hero XP Curve (T-1801)', () => {
  it('level 1 requires 100 XP', () => {
    expect(xpForLevel(1)).toBe(100);
  });

  it('XP grows superlinearly', () => {
    expect(xpForLevel(10)).toBeGreaterThan(xpForLevel(9));
    expect(xpForLevel(10) - xpForLevel(9)).toBeGreaterThan(xpForLevel(2) - xpForLevel(1));
  });

  it('level 50 requires substantial XP', () => {
    expect(xpForLevel(50)).toBeGreaterThan(10_000);
  });
});

describe('Hero Power Score (T-1802)', () => {
  it('calculates composite score', () => {
    const hero = createMockHero({ attack: 10, defense: 5, speed: 8, hp: 100, level: 1 });
    const score = calculatePowerScore(hero);
    expect(score).toBeGreaterThan(0);
    expect(score).toBe(Math.floor(10 * 1.2 + 5 * 1.0 + 8 * 0.8 + 100 * 0.1 + 1 * 5));
  });

  it('higher level = higher power score', () => {
    const low = calculatePowerScore(createMockHero({ level: 1 }));
    const high = calculatePowerScore(createMockHero({ level: 20 }));
    expect(high).toBeGreaterThan(low);
  });
});

describe('Hero Morale Modifiers (T-1803)', () => {
  it('high morale gives +10%', () => {
    expect(applyMoraleModifier(100, 90)).toBe(110);
  });

  it('medium morale has no effect', () => {
    expect(applyMoraleModifier(100, 60)).toBe(100);
  });

  it('low morale penalizes by 15%', () => {
    expect(applyMoraleModifier(100, 30)).toBe(85);
  });

  it('critical low morale penalizes by 30%', () => {
    expect(applyMoraleModifier(100, 10)).toBe(70);
  });
});
