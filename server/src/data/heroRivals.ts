import { HeroRole } from '../../../shared/src/enums';

/**
 * Hero rival NPC system — hero-specific antagonists in expeditions.
 * T-0452: Create hero rival NPC system
 */

export interface RivalNPC {
  id: string;
  name: string;
  title: string;
  description: string;
  targetRole: HeroRole;
  difficulty: number;  // 1-10
  encounterChance: number; // 0-1
  rewards: {
    xp: number;
    gold: number;
    items?: string[];
    lore?: string;
  };
  taunts: string[];
  defeatLines: string[];
}

export const RIVAL_NPCS: RivalNPC[] = [
  {
    id: 'rival_farmer_blight', name: 'The Blight Sower', title: 'Corruptor of Fields',
    description: 'A twisted druid who poisons farmland for dark rituals.',
    targetRole: HeroRole.Farmer, difficulty: 4, encounterChance: 0.15,
    rewards: { xp: 150, gold: 80, lore: 'The Blight Sower\'s journal reveals a cure for crop disease.' },
    taunts: ['Your pitiful crops will wither!', 'No harvest can escape my blight!'],
    defeatLines: ['The land... it heals itself...', 'You win this season, farmer.'],
  },
  {
    id: 'rival_scout_shadow', name: 'Shadow Stalker', title: 'The Unseen Hunter',
    description: 'A phantom tracker who sabotages exploration efforts.',
    targetRole: HeroRole.Scout, difficulty: 5, encounterChance: 0.12,
    rewards: { xp: 180, gold: 100, items: ['shadow_cloak'] },
    taunts: ['You\'ll never find what you seek!', 'Every path you take, I\'ve already been there.'],
    defeatLines: ['How... how did you see me?', 'A worthy tracker indeed.'],
  },
  {
    id: 'rival_merchant_swindler', name: 'The Grand Swindler', title: 'Master of Cons',
    description: 'A notorious con artist who targets guild trade routes.',
    targetRole: HeroRole.Merchant, difficulty: 3, encounterChance: 0.18,
    rewards: { xp: 120, gold: 200, lore: 'The Swindler\'s ledger reveals profitable trade secrets.' },
    taunts: ['Everything has a price — especially your dignity!', 'Let me make you a deal you can\'t refuse...'],
    defeatLines: ['Well played... I underestimated you.', 'Fine, take your gold back. All of it.'],
  },
  {
    id: 'rival_smith_ironwraith', name: 'Ironwraith', title: 'The Cursed Forgemaster',
    description: 'A ghostly smith who creates weapons that devour their wielders.',
    targetRole: HeroRole.Blacksmith, difficulty: 6, encounterChance: 0.10,
    rewards: { xp: 220, gold: 120, items: ['purified_anvil'] },
    taunts: ['My steel is bound with souls!', 'Your craft is mere child\'s play!'],
    defeatLines: ['The curse... it lifts...', 'Forge well, worthy smith.'],
  },
  {
    id: 'rival_alch_plaguemaker', name: 'The Plaguemaker', title: 'Poisoner of Wells',
    description: 'A rogue alchemist who brews toxic compounds to terrorize villages.',
    targetRole: HeroRole.Alchemist, difficulty: 5, encounterChance: 0.12,
    rewards: { xp: 180, gold: 90, items: ['antidote_formula'], lore: 'The Plaguemaker\'s recipes contain a rare universal antidote.' },
    taunts: ['My concoctions are beyond your comprehension!', 'Taste my latest creation!'],
    defeatLines: ['Your formula... it neutralized everything...', 'Perhaps alchemy can heal after all.'],
  },
  {
    id: 'rival_hunter_apex', name: 'The Apex', title: 'Hunter of Hunters',
    description: 'A legendary hunter who views guild hunters as prey.',
    targetRole: HeroRole.Hunter, difficulty: 7, encounterChance: 0.08,
    rewards: { xp: 250, gold: 150, items: ['apex_trophy'] },
    taunts: ['You are the prey now!', 'I\'ve hunted things far more dangerous than you.'],
    defeatLines: ['I... I am no longer the apex...', 'The student surpasses the master.'],
  },
  {
    id: 'rival_defender_siege', name: 'The Siege Breaker', title: 'Destroyer of Walls',
    description: 'A ruthless warlord who specializes in breaking fortifications.',
    targetRole: HeroRole.Defender, difficulty: 6, encounterChance: 0.10,
    rewards: { xp: 200, gold: 130, lore: 'The Siege Breaker\'s tactics manual reveals fortress vulnerabilities.' },
    taunts: ['No wall can stop me!', 'Your defenses are nothing!'],
    defeatLines: ['This fortress... it held...', 'A wall I cannot break. Impressive.'],
  },
  {
    id: 'rival_mystic_void', name: 'The Voidcaller', title: 'Herald of Emptiness',
    description: 'A dark mystic who seeks to drain all magical energy from the world.',
    targetRole: HeroRole.Mystic, difficulty: 8, encounterChance: 0.07,
    rewards: { xp: 300, gold: 180, items: ['void_crystal'], lore: 'The Voidcaller\'s grimoire holds forbidden knowledge of the cosmos.' },
    taunts: ['Your magic is nothing before the void!', 'I will unmake everything you know!'],
    defeatLines: ['The light... it persists...', 'Perhaps the void is not the answer.'],
  },
  {
    id: 'rival_caravan_bandit', name: 'Red Fang', title: 'Lord of Highwaymen',
    description: 'The most feared bandit lord who controls the trade roads.',
    targetRole: HeroRole.CaravanMaster, difficulty: 5, encounterChance: 0.14,
    rewards: { xp: 180, gold: 250, items: ['safe_passage_seal'] },
    taunts: ['These roads belong to me!', 'Hand over your cargo or face my wrath!'],
    defeatLines: ['The roads... they\'re free again...', 'You\'ve earned safe passage. For now.'],
  },
  {
    id: 'rival_archivist_censor', name: 'The Grand Censor', title: 'Burner of Books',
    description: 'A fanatic who destroys knowledge they deem dangerous.',
    targetRole: HeroRole.Archivist, difficulty: 4, encounterChance: 0.13,
    rewards: { xp: 160, gold: 70, items: ['preserved_tome'], lore: 'Among the ashes, you find fragments of a lost civilization\'s history.' },
    taunts: ['Knowledge is dangerous in the wrong hands!', 'These texts must be destroyed!'],
    defeatLines: ['Perhaps... some knowledge should be preserved.', 'Guard these texts well.'],
  },
];

export function getRivalForRole(role: HeroRole): RivalNPC | undefined {
  return RIVAL_NPCS.find(r => r.targetRole === role);
}

export function checkRivalEncounter(role: HeroRole): RivalNPC | null {
  const rival = getRivalForRole(role);
  if (!rival) return null;
  return Math.random() < rival.encounterChance ? rival : null;
}
