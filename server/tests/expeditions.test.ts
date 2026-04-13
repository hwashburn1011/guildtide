// ---------------------------------------------------------------------------
// Unit Tests: Expeditions — T-1811 through T-1814
// ---------------------------------------------------------------------------
import { describe, it, expect } from 'vitest';
import { sampleRuns } from './helpers';

// ---- Expedition formulas --------------------------------------------------

function calculateExpeditionDuration(
  regionDifficulty: number,
  partySpeed: number,
  modifiers: number,
): number {
  const baseMs = regionDifficulty * 60_000; // 1 minute per difficulty point
  const speedFactor = Math.max(0.5, 1 - partySpeed * 0.01);
  return Math.floor(baseMs * speedFactor * (1 + modifiers));
}

function encounterProbability(
  weights: Array<{ type: string; weight: number }>,
): Array<{ type: string; probability: number }> {
  const total = weights.reduce((s, w) => s + w.weight, 0);
  return weights.map((w) => ({ type: w.type, probability: w.weight / total }));
}

function rollLoot(
  drops: Array<{ itemId: string; chance: number }>,
  luckMod: number,
): string[] {
  return drops.filter((d) => Math.random() < d.chance * (1 + luckMod)).map((d) => d.itemId);
}

function calculatePartyPower(
  heroes: Array<{ attack: number; defense: number; speed: number; hp: number }>,
): number {
  return heroes.reduce(
    (total, h) =>
      total + Math.floor(h.attack * 1.2 + h.defense * 1.0 + h.speed * 0.8 + h.hp * 0.1),
    0,
  );
}

describe('Expedition Duration (T-1811)', () => {
  it('scales with difficulty', () => {
    const easy = calculateExpeditionDuration(5, 10, 0);
    const hard = calculateExpeditionDuration(20, 10, 0);
    expect(hard).toBeGreaterThan(easy);
  });

  it('speed reduces duration', () => {
    const slow = calculateExpeditionDuration(10, 5, 0);
    const fast = calculateExpeditionDuration(10, 30, 0);
    expect(fast).toBeLessThan(slow);
  });

  it('modifiers affect duration', () => {
    const base = calculateExpeditionDuration(10, 10, 0);
    const slowed = calculateExpeditionDuration(10, 10, 0.5);
    expect(slowed).toBeGreaterThan(base);
  });
});

describe('Encounter Probability (T-1812)', () => {
  it('probabilities sum to 1', () => {
    const probs = encounterProbability([
      { type: 'combat', weight: 5 },
      { type: 'treasure', weight: 2 },
      { type: 'event', weight: 3 },
    ]);
    const total = probs.reduce((s, p) => s + p.probability, 0);
    expect(total).toBeCloseTo(1);
  });

  it('weights map to proportional probabilities', () => {
    const probs = encounterProbability([
      { type: 'combat', weight: 8 },
      { type: 'treasure', weight: 2 },
    ]);
    expect(probs[0].probability).toBeCloseTo(0.8);
    expect(probs[1].probability).toBeCloseTo(0.2);
  });
});

describe('Loot Roll Distribution (T-1813)', () => {
  it('100% drop always drops', () => {
    const drops = [{ itemId: 'gold', chance: 1.0 }];
    for (let i = 0; i < 10; i++) {
      expect(rollLoot(drops, 0)).toContain('gold');
    }
  });

  it('0% drop never drops', () => {
    const drops = [{ itemId: 'legendary', chance: 0 }];
    for (let i = 0; i < 10; i++) {
      expect(rollLoot(drops, 0)).not.toContain('legendary');
    }
  });

  it('luck modifier increases drop rate statistically', () => {
    const drops = [{ itemId: 'rare-gem', chance: 0.3 }];
    const noLuck = sampleRuns(
      () => (rollLoot(drops, 0).length > 0 ? 1 : 0) as number,
      1_000,
    );
    const withLuck = sampleRuns(
      () => (rollLoot(drops, 0.5).length > 0 ? 1 : 0) as number,
      1_000,
    );
    expect(withLuck.mean).toBeGreaterThan(noLuck.mean);
  });
});

describe('Party Power Score (T-1814)', () => {
  it('sums all hero contributions', () => {
    const party = [
      { attack: 10, defense: 5, speed: 8, hp: 100 },
      { attack: 15, defense: 8, speed: 12, hp: 120 },
    ];
    const power = calculatePartyPower(party);
    expect(power).toBeGreaterThan(0);
  });

  it('more heroes = more power', () => {
    const oneHero = [{ attack: 10, defense: 5, speed: 8, hp: 100 }];
    const twoHeroes = [
      { attack: 10, defense: 5, speed: 8, hp: 100 },
      { attack: 10, defense: 5, speed: 8, hp: 100 },
    ];
    expect(calculatePartyPower(twoHeroes)).toBeGreaterThan(calculatePartyPower(oneHero));
  });
});
