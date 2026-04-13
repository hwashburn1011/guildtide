import { HeroTrait } from '../../../shared/src/enums';

// ── Quest types ──
export type QuestType = 'fetch' | 'rescue' | 'discover' | 'defeat' | 'negotiate';

export interface QuestObjective {
  description: string;
  target: string;
  amount: number;
}

export interface QuestReward {
  xp: number;
  gold?: number;
  skillPoints?: number;
  items?: string[];
  moraleBoost?: number;
  lore?: string;
}

export interface QuestTemplate {
  id: string;
  type: QuestType;
  title: string;
  description: string;
  objectives: QuestObjective[];
  rewards: QuestReward;
  requiredTrait?: HeroTrait;
  chainId?: string;      // multi-part quest chain identifier
  chainStep?: number;     // step in the chain (1-based)
  chainTotal?: number;    // total steps in chain
  minLevel: number;
  duration: number;       // hours to complete
}

// ── Standalone quest templates ──
const standaloneQuests: QuestTemplate[] = [
  // FETCH quests
  {
    id: 'fetch_rare_herbs', type: 'fetch', title: 'Rare Herb Collection',
    description: 'A peculiar plant grows only in the deepest glades. Retrieve samples for the guild.',
    objectives: [{ description: 'Collect rare herbs', target: 'rare_herb', amount: 5 }],
    rewards: { xp: 80, gold: 30, moraleBoost: 5 }, minLevel: 1, duration: 2,
  },
  {
    id: 'fetch_ancient_ore', type: 'fetch', title: 'Ancient Ore Vein',
    description: 'Rumors of a forgotten ore deposit have surfaced. Mine it before others do.',
    objectives: [{ description: 'Mine ancient ore', target: 'ancient_ore', amount: 3 }],
    rewards: { xp: 120, gold: 50, items: ['ore_sample'] }, minLevel: 3, duration: 3,
  },
  {
    id: 'fetch_crystal_water', type: 'fetch', title: 'Crystal Spring Water',
    description: 'The Temple requests water from the crystal spring to bless the guild.',
    objectives: [{ description: 'Fill crystal vials', target: 'crystal_water', amount: 4 }],
    rewards: { xp: 60, moraleBoost: 10 }, minLevel: 1, duration: 1,
  },
  {
    id: 'fetch_lost_tools', type: 'fetch', title: 'Lost Toolset Recovery',
    description: 'A blacksmith lost his prized tools near the old ruins.',
    objectives: [{ description: 'Find lost tools', target: 'lost_tools', amount: 1 }],
    rewards: { xp: 100, gold: 40 }, minLevel: 2, duration: 2,
  },
  {
    id: 'fetch_star_fragment', type: 'fetch', title: 'Star Fragment Hunt',
    description: 'A meteorite was spotted falling near the eastern ridge.',
    objectives: [{ description: 'Recover star fragments', target: 'star_fragment', amount: 2 }],
    rewards: { xp: 200, gold: 80, items: ['star_shard'], lore: 'The sky stones hum with ancient energy.' },
    minLevel: 5, duration: 4,
  },

  // RESCUE quests
  {
    id: 'rescue_lost_scout', type: 'rescue', title: 'Missing Scout',
    description: 'A guild scout went missing in the Whispering Woods. Find them.',
    objectives: [{ description: 'Find the lost scout', target: 'lost_scout', amount: 1 }],
    rewards: { xp: 100, moraleBoost: 15 }, minLevel: 2, duration: 3,
  },
  {
    id: 'rescue_merchant_caravan', type: 'rescue', title: 'Caravan Under Siege',
    description: 'Bandits have surrounded a merchant caravan on the trade road.',
    objectives: [{ description: 'Free the caravan', target: 'caravan_rescue', amount: 1 }],
    rewards: { xp: 150, gold: 100 }, minLevel: 4, duration: 3,
  },
  {
    id: 'rescue_trapped_miners', type: 'rescue', title: 'Cave-In Rescue',
    description: 'Miners are trapped after a sudden collapse. Dig them out.',
    objectives: [{ description: 'Rescue trapped miners', target: 'trapped_miners', amount: 3 }],
    rewards: { xp: 120, gold: 60, moraleBoost: 10 }, minLevel: 3, duration: 4,
  },

  // DISCOVER quests
  {
    id: 'discover_ruins', type: 'discover', title: 'Forgotten Ruins',
    description: 'Ancient ruins have been spotted beyond the forest. Investigate them.',
    objectives: [{ description: 'Explore the ruins', target: 'ruin_chamber', amount: 3 }],
    rewards: { xp: 150, lore: 'The ruins belong to the Old Builders, a civilization that vanished overnight.' },
    minLevel: 3, duration: 4,
  },
  {
    id: 'discover_underground', type: 'discover', title: 'Subterranean Passage',
    description: 'A hidden cave entrance was found beneath the quarry.',
    objectives: [{ description: 'Map underground passages', target: 'passage_mapped', amount: 5 }],
    rewards: { xp: 180, gold: 70, items: ['cave_map'] }, minLevel: 5, duration: 5,
  },
  {
    id: 'discover_ley_line', type: 'discover', title: 'Ley Line Survey',
    description: 'Mystics sense a ley line nearby. Survey and document it.',
    objectives: [{ description: 'Mark ley line nodes', target: 'ley_node', amount: 4 }],
    rewards: { xp: 200, skillPoints: 1, lore: 'The ley lines pulse with the heartbeat of the world itself.' },
    minLevel: 6, duration: 5,
  },

  // DEFEAT quests
  {
    id: 'defeat_wolf_pack', type: 'defeat', title: 'Wolf Pack Menace',
    description: 'A wolf pack is threatening the farm fields. Drive them off.',
    objectives: [{ description: 'Defeat wolves', target: 'wolf', amount: 6 }],
    rewards: { xp: 100, gold: 40 }, minLevel: 2, duration: 2,
  },
  {
    id: 'defeat_bandit_camp', type: 'defeat', title: 'Bandit Encampment',
    description: 'A bandit camp has been harassing trade routes. Eliminate the threat.',
    objectives: [{ description: 'Clear the bandit camp', target: 'bandit', amount: 8 }],
    rewards: { xp: 200, gold: 120, items: ['bandit_loot'] }, minLevel: 5, duration: 4,
  },
  {
    id: 'defeat_golem', type: 'defeat', title: 'Rogue Golem',
    description: 'An ancient golem has awakened and wanders near the guild. Stop it.',
    objectives: [{ description: 'Defeat the golem', target: 'golem', amount: 1 }],
    rewards: { xp: 300, gold: 150, items: ['golem_core'], lore: 'The golem carried inscriptions from the First Age.' },
    minLevel: 8, duration: 5,
  },

  // NEGOTIATE quests
  {
    id: 'negotiate_trade_deal', type: 'negotiate', title: 'Trade Agreement',
    description: 'A neighboring settlement wants to establish trade relations.',
    objectives: [{ description: 'Negotiate trade terms', target: 'trade_terms', amount: 1 }],
    rewards: { xp: 80, gold: 60, moraleBoost: 5 }, minLevel: 1, duration: 2,
  },
  {
    id: 'negotiate_peace', type: 'negotiate', title: 'Border Dispute',
    description: 'Two factions argue over territory. Mediate the conflict.',
    objectives: [{ description: 'Resolve the dispute', target: 'dispute_resolved', amount: 1 }],
    rewards: { xp: 150, moraleBoost: 15 }, minLevel: 4, duration: 3,
  },
  {
    id: 'negotiate_alliance', type: 'negotiate', title: 'Guild Alliance',
    description: 'A powerful guild seeks an alliance. Impress their leader.',
    objectives: [{ description: 'Forge the alliance', target: 'alliance_formed', amount: 1 }],
    rewards: { xp: 250, gold: 100, moraleBoost: 20, lore: 'The allied guild shares secrets of their ancient crafts.' },
    minLevel: 7, duration: 4,
  },
];

// ── Quest chains (multi-part storylines) ──
const chainQuests: QuestTemplate[] = [
  // Stormborn chain (3 parts)
  {
    id: 'storm_chain_1', type: 'discover', title: 'Echoes of Thunder',
    description: 'Strange storm patterns suggest something ancient stirs. Investigate.',
    objectives: [{ description: 'Find the storm source', target: 'storm_source', amount: 1 }],
    rewards: { xp: 100, lore: 'Lightning strikes always in the same place here — always.' },
    requiredTrait: HeroTrait.Stormborn, chainId: 'storm_legacy', chainStep: 1, chainTotal: 3,
    minLevel: 3, duration: 3,
  },
  {
    id: 'storm_chain_2', type: 'fetch', title: 'Conduit Shards',
    description: 'Collect the crystal shards that channel the storm\'s power.',
    objectives: [{ description: 'Collect conduit shards', target: 'conduit_shard', amount: 5 }],
    rewards: { xp: 200, items: ['storm_conduit'] },
    requiredTrait: HeroTrait.Stormborn, chainId: 'storm_legacy', chainStep: 2, chainTotal: 3,
    minLevel: 5, duration: 4,
  },
  {
    id: 'storm_chain_3', type: 'defeat', title: 'Taming the Tempest',
    description: 'Face the elemental guardian at the heart of the eternal storm.',
    objectives: [{ description: 'Defeat the Storm Guardian', target: 'storm_guardian', amount: 1 }],
    rewards: { xp: 400, gold: 200, skillPoints: 2, items: ['storm_crown'], lore: 'The storm bows to you now.' },
    requiredTrait: HeroTrait.Stormborn, chainId: 'storm_legacy', chainStep: 3, chainTotal: 3,
    minLevel: 8, duration: 6,
  },

  // Shrewd Trader chain (3 parts)
  {
    id: 'trader_chain_1', type: 'negotiate', title: 'The Hidden Market',
    description: 'Rumors of a black market with incredible goods. Find its entrance.',
    objectives: [{ description: 'Locate the hidden market', target: 'hidden_market', amount: 1 }],
    rewards: { xp: 100, gold: 50 },
    requiredTrait: HeroTrait.ShrewdTrader, chainId: 'trader_fortune', chainStep: 1, chainTotal: 3,
    minLevel: 3, duration: 2,
  },
  {
    id: 'trader_chain_2', type: 'negotiate', title: 'The Gilded Deal',
    description: 'Negotiate exclusive access to the hidden market\'s rarest wares.',
    objectives: [{ description: 'Secure trade access', target: 'trade_access', amount: 1 }],
    rewards: { xp: 200, gold: 100, lore: 'Gold opens doors, but cunning opens vaults.' },
    requiredTrait: HeroTrait.ShrewdTrader, chainId: 'trader_fortune', chainStep: 2, chainTotal: 3,
    minLevel: 5, duration: 3,
  },
  {
    id: 'trader_chain_3', type: 'fetch', title: 'The Merchant King\'s Hoard',
    description: 'The legendary Merchant King\'s treasure vault has been found.',
    objectives: [{ description: 'Claim the hoard', target: 'kings_hoard', amount: 1 }],
    rewards: { xp: 400, gold: 500, skillPoints: 2, items: ['merchant_crown'] },
    requiredTrait: HeroTrait.ShrewdTrader, chainId: 'trader_fortune', chainStep: 3, chainTotal: 3,
    minLevel: 8, duration: 5,
  },

  // Hardy chain (3 parts)
  {
    id: 'hardy_chain_1', type: 'defeat', title: 'Trial of Endurance',
    description: 'An ancient proving ground tests the limits of body and will.',
    objectives: [{ description: 'Survive the trial', target: 'endurance_trial', amount: 1 }],
    rewards: { xp: 120, moraleBoost: 10 },
    requiredTrait: HeroTrait.Hardy, chainId: 'iron_will', chainStep: 1, chainTotal: 3,
    minLevel: 3, duration: 3,
  },
  {
    id: 'hardy_chain_2', type: 'discover', title: 'The Iron Mountain',
    description: 'Climb the Iron Mountain to find the legendary training grounds.',
    objectives: [{ description: 'Reach the summit', target: 'mountain_summit', amount: 1 }],
    rewards: { xp: 220, items: ['iron_will_band'] },
    requiredTrait: HeroTrait.Hardy, chainId: 'iron_will', chainStep: 2, chainTotal: 3,
    minLevel: 6, duration: 4,
  },
  {
    id: 'hardy_chain_3', type: 'defeat', title: 'The Unbreakable',
    description: 'Prove you are truly unbreakable by defeating the Mountain Guardian.',
    objectives: [{ description: 'Defeat the Mountain Guardian', target: 'mountain_guardian', amount: 1 }],
    rewards: { xp: 400, skillPoints: 2, items: ['unbreakable_shield'], lore: 'The mountain itself acknowledges your strength.' },
    requiredTrait: HeroTrait.Hardy, chainId: 'iron_will', chainStep: 3, chainTotal: 3,
    minLevel: 9, duration: 6,
  },
];

export const ALL_QUEST_TEMPLATES: QuestTemplate[] = [...standaloneQuests, ...chainQuests];

export function getQuestsForHero(level: number, traits: string[]): QuestTemplate[] {
  return ALL_QUEST_TEMPLATES.filter(q => {
    if (q.minLevel > level) return false;
    if (q.requiredTrait && !traits.includes(q.requiredTrait)) return false;
    return true;
  });
}

export function getChainQuests(chainId: string): QuestTemplate[] {
  return ALL_QUEST_TEMPLATES
    .filter(q => q.chainId === chainId)
    .sort((a, b) => (a.chainStep || 0) - (b.chainStep || 0));
}

export function getNextChainStep(chainId: string, completedStep: number): QuestTemplate | undefined {
  return ALL_QUEST_TEMPLATES.find(q =>
    q.chainId === chainId && q.chainStep === completedStep + 1
  );
}
