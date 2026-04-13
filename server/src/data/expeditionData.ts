import { ExpeditionType } from '../../../shared/src/enums';

export interface LootRange {
  resource: string;
  min: number;
  max: number;
  chance: number; // 0-1
}

export interface ExpeditionDestination {
  id: string;
  name: string;
  description: string;
  type: ExpeditionType;
  difficulty: number; // 1-10
  durationMinutes: number;
  lootTable: LootRange[];
  requiredPartySize: number;
}

export const EXPEDITION_DESTINATIONS: ExpeditionDestination[] = [
  {
    id: 'scrapyard_outskirts',
    name: 'Scrapyard Outskirts',
    description: 'Piles of discarded tools and building materials. Easy pickings for a small team.',
    type: ExpeditionType.Scavenge,
    difficulty: 2,
    durationMinutes: 10,
    lootTable: [
      { resource: 'stone', min: 5, max: 15, chance: 0.9 },
      { resource: 'ore', min: 3, max: 10, chance: 0.7 },
      { resource: 'wood', min: 2, max: 8, chance: 0.6 },
    ],
    requiredPartySize: 1,
  },
  {
    id: 'abandoned_warehouse',
    name: 'Abandoned Warehouse',
    description: 'A forgotten storage facility rumored to hold old trade goods and rare materials.',
    type: ExpeditionType.Scavenge,
    difficulty: 5,
    durationMinutes: 30,
    lootTable: [
      { resource: 'ore', min: 10, max: 30, chance: 0.8 },
      { resource: 'gold', min: 15, max: 40, chance: 0.6 },
      { resource: 'essence', min: 1, max: 5, chance: 0.3 },
    ],
    requiredPartySize: 2,
  },
  {
    id: 'whispering_woods',
    name: 'Whispering Woods',
    description: 'Dense forest teeming with game. Hunters thrive here, but predators lurk deeper in.',
    type: ExpeditionType.Hunt,
    difficulty: 3,
    durationMinutes: 15,
    lootTable: [
      { resource: 'food', min: 10, max: 25, chance: 0.9 },
      { resource: 'herbs', min: 3, max: 12, chance: 0.5 },
      { resource: 'wood', min: 5, max: 15, chance: 0.7 },
    ],
    requiredPartySize: 1,
  },
  {
    id: 'thunderpeak_ridge',
    name: 'Thunderpeak Ridge',
    description: 'Mountain hunting grounds where massive beasts roam. High risk, high reward.',
    type: ExpeditionType.Hunt,
    difficulty: 7,
    durationMinutes: 45,
    lootTable: [
      { resource: 'food', min: 20, max: 50, chance: 0.8 },
      { resource: 'essence', min: 3, max: 8, chance: 0.5 },
      { resource: 'gold', min: 10, max: 30, chance: 0.4 },
    ],
    requiredPartySize: 3,
  },
  {
    id: 'sunken_ruins',
    name: 'Sunken Ruins',
    description: 'Ancient structures half-submerged in marshland. Scholars say old knowledge sleeps here.',
    type: ExpeditionType.Explore,
    difficulty: 4,
    durationMinutes: 20,
    lootTable: [
      { resource: 'essence', min: 2, max: 8, chance: 0.7 },
      { resource: 'stone', min: 5, max: 15, chance: 0.6 },
      { resource: 'gold', min: 5, max: 20, chance: 0.5 },
    ],
    requiredPartySize: 2,
  },
  {
    id: 'crystal_caverns',
    name: 'Crystal Caverns',
    description: 'Glowing caves deep underground. Rich in essence but dangerously unstable.',
    type: ExpeditionType.Explore,
    difficulty: 8,
    durationMinutes: 60,
    lootTable: [
      { resource: 'essence', min: 8, max: 20, chance: 0.8 },
      { resource: 'ore', min: 15, max: 40, chance: 0.7 },
      { resource: 'gold', min: 20, max: 50, chance: 0.5 },
    ],
    requiredPartySize: 3,
  },
  {
    id: 'riverside_market',
    name: 'Riverside Market',
    description: 'A nearby trading post along the river. Safe route, modest profits.',
    type: ExpeditionType.TradeCaravan,
    difficulty: 2,
    durationMinutes: 15,
    lootTable: [
      { resource: 'gold', min: 15, max: 35, chance: 0.9 },
      { resource: 'food', min: 5, max: 15, chance: 0.5 },
      { resource: 'herbs', min: 3, max: 10, chance: 0.4 },
    ],
    requiredPartySize: 1,
  },
  {
    id: 'distant_citadel',
    name: 'Distant Citadel',
    description: 'A far-off stronghold willing to pay top coin for rare goods. The road is perilous.',
    type: ExpeditionType.TradeCaravan,
    difficulty: 6,
    durationMinutes: 45,
    lootTable: [
      { resource: 'gold', min: 40, max: 100, chance: 0.8 },
      { resource: 'essence', min: 2, max: 6, chance: 0.4 },
      { resource: 'herbs', min: 5, max: 15, chance: 0.3 },
    ],
    requiredPartySize: 2,
  },
];
