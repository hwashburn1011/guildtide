/**
 * NPC Merchant definitions with rotating stock and merchant types.
 *
 * T-0565: NPC merchant system with 5 merchant types
 * T-0566: NPC merchant inventory rotation (new stock every 6 hours)
 * T-0569: Traveling merchant event (arrives randomly, sells rare items)
 */
import { ResourceType } from '../../../shared/src/enums';

export type MerchantType = 'general' | 'rare' | 'exotic' | 'bulk' | 'traveling';

export interface MerchantInventorySlot {
  resource: ResourceType;
  quantity: number;
  /** Price multiplier vs base market price (1.0 = market rate) */
  priceMultiplier: number;
}

export interface NpcMerchantDef {
  id: string;
  name: string;
  type: MerchantType;
  greeting: string;
  farewell: string;
  description: string;
  /** Base inventory pool. Actual stock rotates from this. */
  inventoryPool: MerchantInventorySlot[];
  /** How many slots are available each rotation */
  slotsPerRotation: number;
  /** Rotation interval in hours */
  rotationHours: number;
  /** Reputation threshold for unlocking bonus slots */
  bonusSlotsRepThreshold: number;
  /** Extra discount per reputation level (0.01 = 1%) */
  repDiscountPerLevel: number;
}

export const NPC_MERCHANTS: NpcMerchantDef[] = [
  {
    id: 'merchant_general',
    name: 'Garrick the General',
    type: 'general',
    greeting: 'Welcome, friend! I have all the basics you could need.',
    farewell: 'Come back anytime! My doors are always open.',
    description: 'A reliable merchant dealing in common resources at fair prices.',
    inventoryPool: [
      { resource: ResourceType.Wood, quantity: 200, priceMultiplier: 1.0 },
      { resource: ResourceType.Stone, quantity: 150, priceMultiplier: 1.0 },
      { resource: ResourceType.Food, quantity: 250, priceMultiplier: 0.95 },
      { resource: ResourceType.Water, quantity: 300, priceMultiplier: 0.95 },
      { resource: ResourceType.Herbs, quantity: 100, priceMultiplier: 1.05 },
      { resource: ResourceType.Ore, quantity: 80, priceMultiplier: 1.1 },
    ],
    slotsPerRotation: 4,
    rotationHours: 6,
    bonusSlotsRepThreshold: 10,
    repDiscountPerLevel: 0.005,
  },
  {
    id: 'merchant_rare',
    name: 'Elara Moonwhisper',
    type: 'rare',
    greeting: 'Ah, a discerning buyer. I have curated treasures for you.',
    farewell: 'May fortune favor your guild.',
    description: 'Deals in uncommon and rare materials at premium prices.',
    inventoryPool: [
      { resource: ResourceType.Essence, quantity: 30, priceMultiplier: 0.9 },
      { resource: ResourceType.Herbs, quantity: 80, priceMultiplier: 0.85 },
      { resource: ResourceType.Ore, quantity: 60, priceMultiplier: 0.9 },
    ],
    slotsPerRotation: 2,
    rotationHours: 6,
    bonusSlotsRepThreshold: 20,
    repDiscountPerLevel: 0.008,
  },
  {
    id: 'merchant_exotic',
    name: 'Zephyr the Wanderer',
    type: 'exotic',
    greeting: 'From distant lands, I bring things you have never seen!',
    farewell: 'Until the winds carry me back...',
    description: 'Exotic merchant with unique goods. Stock is very limited.',
    inventoryPool: [
      { resource: ResourceType.Essence, quantity: 15, priceMultiplier: 0.8 },
      { resource: ResourceType.Ore, quantity: 40, priceMultiplier: 0.85 },
      { resource: ResourceType.Herbs, quantity: 50, priceMultiplier: 0.8 },
    ],
    slotsPerRotation: 2,
    rotationHours: 6,
    bonusSlotsRepThreshold: 30,
    repDiscountPerLevel: 0.01,
  },
  {
    id: 'merchant_bulk',
    name: 'Magnus Ironhand',
    type: 'bulk',
    greeting: 'Buying in bulk? You came to the right dwarf.',
    farewell: 'Big orders, big savings. Remember that!',
    description: 'Specializes in large quantity trades at discounted rates.',
    inventoryPool: [
      { resource: ResourceType.Wood, quantity: 500, priceMultiplier: 0.85 },
      { resource: ResourceType.Stone, quantity: 400, priceMultiplier: 0.85 },
      { resource: ResourceType.Food, quantity: 600, priceMultiplier: 0.8 },
      { resource: ResourceType.Water, quantity: 500, priceMultiplier: 0.8 },
      { resource: ResourceType.Ore, quantity: 200, priceMultiplier: 0.88 },
    ],
    slotsPerRotation: 3,
    rotationHours: 6,
    bonusSlotsRepThreshold: 15,
    repDiscountPerLevel: 0.006,
  },
  {
    id: 'merchant_traveling',
    name: 'Silke the Nomad',
    type: 'traveling',
    greeting: 'My caravan rests here only briefly. Trade fast!',
    farewell: 'The road calls. Catch me if you can next time!',
    description: 'Arrives randomly with rare items. Limited time only.',
    inventoryPool: [
      { resource: ResourceType.Essence, quantity: 25, priceMultiplier: 0.75 },
      { resource: ResourceType.Herbs, quantity: 100, priceMultiplier: 0.7 },
      { resource: ResourceType.Ore, quantity: 80, priceMultiplier: 0.75 },
      { resource: ResourceType.Food, quantity: 200, priceMultiplier: 0.7 },
    ],
    slotsPerRotation: 3,
    rotationHours: 4,
    bonusSlotsRepThreshold: 5,
    repDiscountPerLevel: 0.012,
  },
];

/** Get merchant def by ID */
export function getMerchantById(id: string): NpcMerchantDef | undefined {
  return NPC_MERCHANTS.find(m => m.id === id);
}

/** Deterministically pick inventory for a rotation window */
export function getRotatedInventory(
  merchant: NpcMerchantDef,
  regionId: string,
  reputation: number = 0,
): MerchantInventorySlot[] {
  const now = Date.now();
  const rotationWindow = Math.floor(now / (merchant.rotationHours * 3600000));
  const seed = hashCode(`${merchant.id}:${regionId}:${rotationWindow}`);
  const rng = seededRandom(seed);

  const pool = [...merchant.inventoryPool];
  const slots = merchant.slotsPerRotation + (reputation >= merchant.bonusSlotsRepThreshold ? 1 : 0);

  // Fisher-Yates shuffle with seeded RNG
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  const selected = pool.slice(0, Math.min(slots, pool.length));

  // Apply reputation discount
  const repLevels = Math.floor(reputation / 5);
  return selected.map(slot => ({
    ...slot,
    priceMultiplier: Math.max(0.5, slot.priceMultiplier - repLevels * merchant.repDiscountPerLevel),
  }));
}

/** Check if the traveling merchant is currently visiting */
export function isTravelingMerchantPresent(regionId: string): boolean {
  const dayIndex = Math.floor(Date.now() / 86400000);
  const seed = hashCode(`traveling:${regionId}:${dayIndex}`);
  const rng = seededRandom(seed);
  // 25% chance per day
  return rng() < 0.25;
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}
