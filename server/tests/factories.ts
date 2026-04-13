// ---------------------------------------------------------------------------
// Test Data Factories — T-1794
// ---------------------------------------------------------------------------

let _seq = 0;
function seq(): number {
  return ++_seq;
}

export interface MockUser {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
}

export interface MockGuild {
  id: string;
  name: string;
  level: number;
  xp: number;
  ownerId: string;
}

export interface MockHero {
  id: string;
  name: string;
  class: string;
  level: number;
  xp: number;
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  speed: number;
  morale: number;
  guildId: string;
}

export interface MockItem {
  id: string;
  name: string;
  type: string;
  rarity: string;
  attack: number;
  defense: number;
  level: number;
}

export interface MockExpedition {
  id: string;
  regionId: string;
  heroIds: string[];
  startedAt: Date;
  durationMs: number;
  status: 'active' | 'completed' | 'failed';
}

export interface MockMarketListing {
  id: string;
  sellerId: string;
  itemId: string;
  price: number;
  quantity: number;
  createdAt: Date;
}

export function createMockUser(overrides: Partial<MockUser> = {}): MockUser {
  const n = seq();
  return {
    id: `user-${n}`,
    username: `testuser${n}`,
    email: `testuser${n}@guildtide-test.local`,
    passwordHash: '$2b$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ012',
    createdAt: new Date(),
    ...overrides,
  };
}

export function createMockGuild(overrides: Partial<MockGuild> = {}): MockGuild {
  const n = seq();
  return {
    id: `guild-${n}`,
    name: `Test Guild ${n}`,
    level: 1,
    xp: 0,
    ownerId: `user-${n}`,
    ...overrides,
  };
}

export function createMockHero(overrides: Partial<MockHero> = {}): MockHero {
  const n = seq();
  return {
    id: `hero-${n}`,
    name: `Hero ${n}`,
    class: 'warrior',
    level: 1,
    xp: 0,
    hp: 100,
    maxHp: 100,
    attack: 10,
    defense: 5,
    speed: 8,
    morale: 100,
    guildId: `guild-${n}`,
    ...overrides,
  };
}

export function createMockItem(overrides: Partial<MockItem> = {}): MockItem {
  const n = seq();
  return {
    id: `item-${n}`,
    name: `Test Sword ${n}`,
    type: 'weapon',
    rarity: 'common',
    attack: 5,
    defense: 0,
    level: 1,
    ...overrides,
  };
}

export function createMockExpedition(overrides: Partial<MockExpedition> = {}): MockExpedition {
  const n = seq();
  return {
    id: `expedition-${n}`,
    regionId: 'forest-1',
    heroIds: [`hero-${n}`],
    startedAt: new Date(),
    durationMs: 60_000,
    status: 'active',
    ...overrides,
  };
}

export function createMockMarketListing(
  overrides: Partial<MockMarketListing> = {},
): MockMarketListing {
  const n = seq();
  return {
    id: `listing-${n}`,
    sellerId: `user-${n}`,
    itemId: `item-${n}`,
    price: 100,
    quantity: 1,
    createdAt: new Date(),
    ...overrides,
  };
}
