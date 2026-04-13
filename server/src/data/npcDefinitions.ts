/**
 * T-1333: NPC dialog system with branching conversation trees
 * T-1334: Dialog tree data structure with nodes and choice edges
 * T-1336: 15 named NPCs with unique personalities and dialog trees
 * T-1337: NPC relationship tracking based on dialog choices
 * T-1338: NPC gift system to improve relationships
 * T-1339: NPC shop integration within dialog flow
 * T-1340: NPC quest offering through dialog
 * T-1357: Rumor system where NPCs share hints about nearby opportunities
 * T-1358: Rumor accuracy variability (some rumors are false)
 * T-1372: NPC daily dialog that changes based on weather and events
 */

// ── Dialog tree structures ──
export interface DialogChoice {
  label: string;
  /** Target node ID to jump to */
  nextNodeId: string;
  /** Relationship change when this choice is picked */
  relationshipChange?: number;
  /** Required minimum relationship to see this choice */
  requiresRelationship?: number;
  /** If set, starts a quest */
  startsQuestId?: string;
  /** If set, opens the NPC shop */
  opensShop?: boolean;
  /** If set, gives player a gift in return */
  givesItem?: string;
}

export interface DialogNode {
  id: string;
  text: string;
  /** Portrait emotion to display */
  emotion?: 'neutral' | 'happy' | 'sad' | 'angry' | 'surprised' | 'thinking';
  choices: DialogChoice[];
  /** If true, this node ends the conversation */
  isTerminal?: boolean;
  /** Lore entry ID unlocked when reaching this node */
  unlocksLoreId?: string;
  /** Rumor delivered at this node */
  rumor?: { text: string; accuracy: number };
}

export interface DialogTree {
  id: string;
  /** Entry node for first meeting */
  firstMeetingNodeId: string;
  /** Entry node for subsequent meetings */
  defaultNodeId: string;
  nodes: Record<string, DialogNode>;
}

// ── NPC definition ──
export type NpcPersonality = 'friendly' | 'gruff' | 'mysterious' | 'scholarly' | 'jovial' | 'cautious' | 'ambitious';

export interface NpcGiftPreference {
  resource: string;
  /** Relationship bonus per unit given */
  bonusPerUnit: number;
  /** Flavor text when gift is accepted */
  thankText: string;
}

export interface WeatherDialog {
  condition: string;
  text: string;
}

export interface NpcDefinition {
  id: string;
  name: string;
  title: string;
  personality: NpcPersonality;
  portrait: string;
  description: string;
  /** Location in the guild hall or world */
  location: string;
  /** Dialog tree ID */
  dialogTreeId: string;
  /** Gift preferences */
  giftPreferences: NpcGiftPreference[];
  /** Whether this NPC has a shop */
  hasShop: boolean;
  /** Merchant ID if hasShop is true */
  merchantId?: string;
  /** Quest IDs this NPC can offer */
  questIds: string[];
  /** Weather-dependent dialog snippets */
  weatherDialogs: WeatherDialog[];
  /** Rumors this NPC can share */
  rumors: Array<{ text: string; accuracy: number; relatedLoreId?: string }>;
}

// ── Dialog trees ──
const DIALOG_TREES: Record<string, DialogTree> = {
  dt_elder_maren: {
    id: 'dt_elder_maren', firstMeetingNodeId: 'first', defaultNodeId: 'greeting',
    nodes: {
      first: {
        id: 'first', emotion: 'surprised',
        text: 'Ah, a new guild leader! I am Elder Maren. I have watched guilds rise and fall from this very spot for decades. Perhaps yours will be different.',
        choices: [
          { label: 'I intend to make it last.', nextNodeId: 'confident', relationshipChange: 1 },
          { label: 'What wisdom can you share?', nextNodeId: 'wisdom', relationshipChange: 2 },
          { label: 'We\'ll see.', nextNodeId: 'end_neutral' },
        ],
      },
      greeting: {
        id: 'greeting', emotion: 'neutral',
        text: 'Welcome back, guild leader. What brings you to old Maren today?',
        choices: [
          { label: 'Tell me about the world\'s history.', nextNodeId: 'history' },
          { label: 'Any rumors?', nextNodeId: 'rumor' },
          { label: 'I have a gift for you.', nextNodeId: 'gift' },
          { label: 'Just passing through.', nextNodeId: 'end_friendly' },
        ],
      },
      confident: {
        id: 'confident', emotion: 'thinking',
        text: 'Confidence is good. Overconfidence is fatal. Remember that when the first storm hits.',
        choices: [{ label: 'I will.', nextNodeId: 'end_neutral' }],
      },
      wisdom: {
        id: 'wisdom', emotion: 'happy',
        text: 'Wisdom, eh? Here\'s the first lesson: listen to your heroes. They see things you miss from behind your desk. The second lesson: the weather always matters more than you think.',
        choices: [{ label: 'Thank you, Elder.', nextNodeId: 'end_friendly', relationshipChange: 1 }],
        unlocksLoreId: 'lore_founding',
      },
      history: {
        id: 'history', emotion: 'thinking',
        text: 'This land has seen empires rise and crumble. The Crystal War, the Dark Winter, the Beast Tide... each left its mark. Study the past, and you might avoid repeating it.',
        choices: [
          { label: 'Tell me about the Crystal War.', nextNodeId: 'crystal_war' },
          { label: 'What about the Dark Winter?', nextNodeId: 'dark_winter' },
          { label: 'Thank you.', nextNodeId: 'end_friendly' },
        ],
        unlocksLoreId: 'lore_present_age',
      },
      crystal_war: {
        id: 'crystal_war', emotion: 'sad',
        text: 'Twelve years of bloodshed over shiny rocks. The Crystal Accord ended it, but the real lesson was this: shared resources build stronger nations than hoarded ones.',
        choices: [{ label: 'I\'ll remember that.', nextNodeId: 'end_friendly', relationshipChange: 1 }],
        unlocksLoreId: 'lore_crystal_war',
      },
      dark_winter: {
        id: 'dark_winter', emotion: 'sad',
        text: 'Three years without sun. I was a child then. We survived because guilds shared everything. That\'s when I decided to spend my life helping guild leaders succeed.',
        choices: [{ label: 'Your dedication is inspiring.', nextNodeId: 'end_friendly', relationshipChange: 2 }],
        unlocksLoreId: 'lore_dark_winter',
      },
      rumor: {
        id: 'rumor', emotion: 'thinking',
        text: 'Hmm, let me think... I hear whispers on the wind, you know.',
        choices: [{ label: 'Interesting. Thank you.', nextNodeId: 'end_friendly' }],
        rumor: { text: 'They say the old mines to the north have been glowing at night. Essence deposits, perhaps.', accuracy: 0.8 },
      },
      gift: {
        id: 'gift', emotion: 'surprised',
        text: 'For me? How thoughtful! What do you have?',
        choices: [{ label: '[Give gift]', nextNodeId: 'end_friendly', relationshipChange: 3 }],
      },
      end_neutral: {
        id: 'end_neutral', emotion: 'neutral',
        text: 'Good luck out there, guild leader.', choices: [], isTerminal: true,
      },
      end_friendly: {
        id: 'end_friendly', emotion: 'happy',
        text: 'May the essence flow in your favor. Come back anytime.', choices: [], isTerminal: true,
      },
    },
  },

  dt_blacksmith_kael: {
    id: 'dt_blacksmith_kael', firstMeetingNodeId: 'first', defaultNodeId: 'greeting',
    nodes: {
      first: {
        id: 'first', emotion: 'neutral',
        text: 'Another guild, another leader. I\'m Kael. I make things. You need things made, we talk. You don\'t, we don\'t. Simple.',
        choices: [
          { label: 'I like simple.', nextNodeId: 'end_neutral', relationshipChange: 2 },
          { label: 'What can you make?', nextNodeId: 'shop_intro' },
        ],
      },
      greeting: {
        id: 'greeting', emotion: 'neutral',
        text: 'Back again. Need something forged, or just wasting my time?',
        choices: [
          { label: 'Show me your wares.', nextNodeId: 'shop', opensShop: true },
          { label: 'Any work that needs doing?', nextNodeId: 'quest_offer' },
          { label: 'Heard any rumors?', nextNodeId: 'rumor' },
          { label: 'Just checking in.', nextNodeId: 'end_neutral' },
        ],
      },
      shop_intro: {
        id: 'shop_intro', emotion: 'neutral',
        text: 'Weapons, armor, tools. All hand-forged, all quality. Take a look.',
        choices: [{ label: 'Let me see.', nextNodeId: 'end_neutral', opensShop: true }],
      },
      shop: {
        id: 'shop', emotion: 'neutral',
        text: 'Browse as long as you like. Don\'t touch the anvil.',
        choices: [{ label: 'Thanks.', nextNodeId: 'end_neutral' }], isTerminal: true,
      },
      quest_offer: {
        id: 'quest_offer', emotion: 'thinking',
        text: 'Actually, yes. I need rare ore from the deep mines. The stuff on the surface is garbage. Bring me three loads of deep ore and I\'ll forge something special for you.',
        choices: [
          { label: 'I\'ll get your ore.', nextNodeId: 'end_neutral', startsQuestId: 'side_deep_ore', relationshipChange: 1 },
          { label: 'Maybe later.', nextNodeId: 'end_neutral' },
        ],
      },
      rumor: {
        id: 'rumor', emotion: 'thinking',
        text: 'I don\'t gossip. But... I\'ve been getting strange ore lately. Veins that shouldn\'t be where they are. Something\'s shifting underground.',
        choices: [{ label: 'Strange indeed.', nextNodeId: 'end_neutral' }],
        rumor: { text: 'New ore veins are appearing in unexpected locations — the earth itself is shifting.', accuracy: 0.9 },
      },
      end_neutral: {
        id: 'end_neutral', emotion: 'neutral',
        text: 'Hmph. See you around.', choices: [], isTerminal: true,
      },
    },
  },

  dt_scout_lira: {
    id: 'dt_scout_lira', firstMeetingNodeId: 'first', defaultNodeId: 'greeting',
    nodes: {
      first: {
        id: 'first', emotion: 'happy',
        text: 'Hey there! I\'m Lira — best scout in three regions, or so they tell me. I know every trail, every shortcut, every hidden cave worth finding.',
        choices: [
          { label: 'Impressive! I could use someone like you.', nextNodeId: 'join', relationshipChange: 2 },
          { label: 'Prove it.', nextNodeId: 'prove', relationshipChange: -1 },
        ],
      },
      greeting: {
        id: 'greeting', emotion: 'happy',
        text: 'Guild leader! Ready for adventure? I\'ve got news from the trails.',
        choices: [
          { label: 'What have you found?', nextNodeId: 'discoveries' },
          { label: 'Any rumors from the road?', nextNodeId: 'rumor' },
          { label: 'I need a quest.', nextNodeId: 'quest_offer' },
          { label: 'Just saying hello.', nextNodeId: 'end_happy' },
        ],
      },
      join: { id: 'join', emotion: 'happy', text: 'You won\'t regret it! Let\'s make this guild legendary.', choices: [{ label: 'Let\'s do it!', nextNodeId: 'end_happy' }] },
      prove: { id: 'prove', emotion: 'surprised', text: 'Tough crowd! Fine — send me on any expedition and watch the results speak for themselves.', choices: [{ label: 'Fair enough.', nextNodeId: 'end_happy' }] },
      discoveries: {
        id: 'discoveries', emotion: 'happy',
        text: 'I mapped three new paths through the Whispering Forest. One of them passes an old ruin I\'ve never seen before — covered in strange symbols.',
        choices: [
          { label: 'Tell me about the ruin.', nextNodeId: 'ruin_info', relationshipChange: 1 },
          { label: 'Good work.', nextNodeId: 'end_happy' },
        ],
      },
      ruin_info: {
        id: 'ruin_info', emotion: 'thinking',
        text: 'The symbols match nothing in our archives. But they glow faintly at night — essence-infused, definitely. Could be pre-guild era.',
        choices: [{ label: 'We should investigate.', nextNodeId: 'end_happy', startsQuestId: 'side_ancient_ruin' }],
        unlocksLoreId: 'lore_sunken_ruins',
      },
      quest_offer: {
        id: 'quest_offer', emotion: 'happy',
        text: 'I spotted a rare crystal formation deep in the caverns. Too dangerous for me alone, but with a proper team we could harvest some incredible materials.',
        choices: [
          { label: 'Assemble a team!', nextNodeId: 'end_happy', startsQuestId: 'side_crystal_harvest', relationshipChange: 1 },
          { label: 'Not right now.', nextNodeId: 'end_happy' },
        ],
      },
      rumor: {
        id: 'rumor', emotion: 'thinking',
        text: 'Travelers from the east say the desert sands have been singing at night. Not wind — actual singing. Spooky stuff.',
        choices: [{ label: 'Singing sands? Interesting...', nextNodeId: 'end_happy' }],
        rumor: { text: 'The Desert of Echoes has begun producing audible sounds at night — possible essence surge.', accuracy: 0.7 },
      },
      end_happy: { id: 'end_happy', emotion: 'happy', text: 'See you on the trails! Stay sharp out there.', choices: [], isTerminal: true },
    },
  },

  // Simplified trees for remaining NPCs (same structure, fewer nodes for brevity)
  dt_generic_friendly: {
    id: 'dt_generic_friendly', firstMeetingNodeId: 'first', defaultNodeId: 'greeting',
    nodes: {
      first: { id: 'first', emotion: 'happy', text: 'Welcome! Always good to meet a guild leader.', choices: [{ label: 'Good to meet you too.', nextNodeId: 'end' }] },
      greeting: { id: 'greeting', emotion: 'happy', text: 'Good to see you again!', choices: [
        { label: 'Any rumors?', nextNodeId: 'rumor' },
        { label: 'Got any work?', nextNodeId: 'quest' },
        { label: 'Goodbye.', nextNodeId: 'end' },
      ]},
      rumor: { id: 'rumor', emotion: 'thinking', text: 'Let me think...', choices: [{ label: 'Thanks.', nextNodeId: 'end' }], rumor: { text: 'Strange lights in the northern mountains — could be essence or could be trouble.', accuracy: 0.5 } },
      quest: { id: 'quest', emotion: 'happy', text: 'I might have something for you soon. Check back later.', choices: [{ label: 'Will do.', nextNodeId: 'end' }] },
      end: { id: 'end', emotion: 'happy', text: 'Take care!', choices: [], isTerminal: true },
    },
  },
  dt_generic_gruff: {
    id: 'dt_generic_gruff', firstMeetingNodeId: 'first', defaultNodeId: 'greeting',
    nodes: {
      first: { id: 'first', emotion: 'neutral', text: 'Hmph. Another one. What do you want?', choices: [{ label: 'Just introducing myself.', nextNodeId: 'end' }] },
      greeting: { id: 'greeting', emotion: 'neutral', text: 'You again. Make it quick.', choices: [
        { label: 'Heard anything useful?', nextNodeId: 'rumor' },
        { label: 'Need anything done?', nextNodeId: 'quest' },
        { label: 'Never mind.', nextNodeId: 'end' },
      ]},
      rumor: { id: 'rumor', emotion: 'thinking', text: 'Maybe. Maybe not. Here\'s what I know...', choices: [{ label: 'Got it.', nextNodeId: 'end' }], rumor: { text: 'Bandits have been spotted on the western trade road — merchants beware.', accuracy: 0.6 } },
      quest: { id: 'quest', emotion: 'neutral', text: 'There\'s always work. Question is whether you can handle it.', choices: [{ label: 'Try me.', nextNodeId: 'end', relationshipChange: 1 }] },
      end: { id: 'end', emotion: 'neutral', text: 'Yeah. Bye.', choices: [], isTerminal: true },
    },
  },
  dt_generic_mysterious: {
    id: 'dt_generic_mysterious', firstMeetingNodeId: 'first', defaultNodeId: 'greeting',
    nodes: {
      first: { id: 'first', emotion: 'thinking', text: 'You have arrived exactly when you were meant to. Interesting.', choices: [{ label: 'Who are you?', nextNodeId: 'end' }] },
      greeting: { id: 'greeting', emotion: 'thinking', text: 'The patterns shift again. You feel it too, don\'t you?', choices: [
        { label: 'What patterns?', nextNodeId: 'rumor' },
        { label: 'Do you need help with something?', nextNodeId: 'quest' },
        { label: 'Farewell.', nextNodeId: 'end' },
      ]},
      rumor: { id: 'rumor', emotion: 'thinking', text: 'The threads of fate whisper secrets to those who listen...', choices: [{ label: 'I\'m listening.', nextNodeId: 'end' }], rumor: { text: 'A hidden dungeon reveals itself when the full moon coincides with a rainstorm — seek the old crossroads.', accuracy: 1.0 } },
      quest: { id: 'quest', emotion: 'thinking', text: 'Perhaps there is something you could do... when the time is right.', choices: [{ label: 'I\'m ready.', nextNodeId: 'end' }] },
      end: { id: 'end', emotion: 'thinking', text: 'Until the stars align again...', choices: [], isTerminal: true },
    },
  },
};

// ── 15 Named NPCs ──
export const NPC_DEFINITIONS: NpcDefinition[] = [
  {
    id: 'npc_elder_maren', name: 'Elder Maren', title: 'Village Elder',
    personality: 'scholarly', portrait: 'npc_elder_maren',
    description: 'A wise elder who has witnessed the rise and fall of many guilds. She is the keeper of local history and a trusted advisor.',
    location: 'guild_hall', dialogTreeId: 'dt_elder_maren',
    giftPreferences: [
      { resource: 'essence', bonusPerUnit: 0.5, thankText: 'Essence! The lifeblood of knowledge. Thank you, dear.' },
      { resource: 'herbs', bonusPerUnit: 0.3, thankText: 'Medicinal herbs — my old bones appreciate these.' },
    ],
    hasShop: false, questIds: ['main_ch1', 'main_ch2', 'side_history_research'],
    weatherDialogs: [
      { condition: 'rain', text: 'Rain cleanses the land and the spirit. A good day for reflection.' },
      { condition: 'storm', text: 'Storms like this remind me of the Dark Winter. Stay safe.' },
      { condition: 'sunny', text: 'What a beautiful day. The essence flows strong under clear skies.' },
    ],
    rumors: [
      { text: 'The old mines to the north have been glowing at night. Essence deposits, perhaps.', accuracy: 0.8, relatedLoreId: 'lore_crystal_caverns' },
      { text: 'I heard a traveler found a door in the mountainside that wasn\'t there the day before.', accuracy: 0.6 },
    ],
  },
  {
    id: 'npc_blacksmith_kael', name: 'Kael', title: 'Master Blacksmith',
    personality: 'gruff', portrait: 'npc_blacksmith_kael',
    description: 'A taciturn blacksmith whose work speaks louder than his words. His forge produces the finest weapons in the region.',
    location: 'forge', dialogTreeId: 'dt_blacksmith_kael',
    giftPreferences: [
      { resource: 'ore', bonusPerUnit: 0.4, thankText: 'Good ore. I can work with this.' },
      { resource: 'essence', bonusPerUnit: 0.3, thankText: 'Essence-tempered steel... now you\'re speaking my language.' },
    ],
    hasShop: true, merchantId: 'merchant_blacksmith', questIds: ['side_deep_ore', 'side_legendary_forge'],
    weatherDialogs: [
      { condition: 'rain', text: 'Rain cools the forge too fast. Bad for tempering.' },
      { condition: 'storm', text: 'Lightning and metal don\'t mix. I\'m taking a break.' },
    ],
    rumors: [
      { text: 'New ore veins are appearing in unexpected locations — the earth itself is shifting.', accuracy: 0.9 },
      { text: 'A rival blacksmith claims to have forged an unbreakable blade. I doubt it.', accuracy: 0.3 },
    ],
  },
  {
    id: 'npc_scout_lira', name: 'Lira', title: 'Chief Scout',
    personality: 'friendly', portrait: 'npc_scout_lira',
    description: 'An energetic scout who knows every trail in three regions. Her maps are invaluable for expedition planning.',
    location: 'expedition_hall', dialogTreeId: 'dt_scout_lira',
    giftPreferences: [
      { resource: 'food', bonusPerUnit: 0.3, thankText: 'Trail rations! You know the way to a scout\'s heart.' },
      { resource: 'water', bonusPerUnit: 0.2, thankText: 'Clean water — worth its weight in gold on the road.' },
    ],
    hasShop: false, questIds: ['side_ancient_ruin', 'side_crystal_harvest', 'side_map_fragments'],
    weatherDialogs: [
      { condition: 'fog', text: 'Fog makes scouting nearly impossible. But it also hides us from predators.' },
      { condition: 'sunny', text: 'Perfect scouting weather! I can see for miles from the ridge.' },
    ],
    rumors: [
      { text: 'The Desert of Echoes has begun producing audible sounds at night — possible essence surge.', accuracy: 0.7, relatedLoreId: 'lore_desert_of_echoes' },
      { text: 'I found tracks near the northern pass that don\'t match any known creature.', accuracy: 0.8 },
    ],
  },
  {
    id: 'npc_alchemist_yira', name: 'Apprentice Yira', title: 'Alchemist',
    personality: 'scholarly', portrait: 'npc_alchemist_yira',
    description: 'Named after the legendary Master Yira, this young alchemist is determined to live up to her namesake. She brews potions and studies essence reactions.',
    location: 'laboratory', dialogTreeId: 'dt_generic_friendly',
    giftPreferences: [
      { resource: 'herbs', bonusPerUnit: 0.5, thankText: 'Perfect specimens! These will be wonderful in my research.' },
      { resource: 'essence', bonusPerUnit: 0.4, thankText: 'Pure essence — the foundation of all alchemy. Thank you!' },
    ],
    hasShop: true, merchantId: 'merchant_alchemist', questIds: ['side_rare_herbs', 'side_essence_experiment'],
    weatherDialogs: [
      { condition: 'rain', text: 'Rain water is the purest solvent. I\'m collecting samples!' },
      { condition: 'storm', text: 'Lightning-struck essence has unique properties. I must observe!' },
    ],
    rumors: [
      { text: 'A new herb species has been spotted growing near the old ruins — could have alchemical properties.', accuracy: 0.85 },
      { text: 'Someone claims they transmuted lead into gold. Absolute nonsense, of course.', accuracy: 0.1 },
    ],
  },
  {
    id: 'npc_priest_aldric', name: 'Father Aldric', title: 'Temple Keeper',
    personality: 'cautious', portrait: 'npc_priest_aldric',
    description: 'A devout keeper of the old temples. He studies the prophecies and maintains the sacred sites.',
    location: 'temple', dialogTreeId: 'dt_generic_mysterious',
    giftPreferences: [
      { resource: 'essence', bonusPerUnit: 0.5, thankText: 'Essence for the temple flames. The Guardians smile upon you.' },
      { resource: 'water', bonusPerUnit: 0.3, thankText: 'Sacred water for the blessing pool. Bless you, child.' },
    ],
    hasShop: false, questIds: ['side_temple_research', 'side_prophecy_hunt'],
    weatherDialogs: [
      { condition: 'rain', text: 'Aqualis weeps with joy today. The crops will flourish.' },
      { condition: 'storm', text: 'Pyrathos rages. We must pray for calm.' },
      { condition: 'sunny', text: 'A blessed day. The Guardians are at peace.' },
    ],
    rumors: [
      { text: 'The temple texts speak of a hidden chamber beneath the oldest shrine. I lack the key.', accuracy: 1.0, relatedLoreId: 'myth_four_guardians' },
      { text: 'Pilgrims report visions near the Great Oak — the tree may be trying to communicate.', accuracy: 0.5 },
    ],
  },
  {
    id: 'npc_merchant_silva', name: 'Silva', title: 'Traveling Merchant',
    personality: 'jovial', portrait: 'npc_merchant_silva',
    description: 'A cheerful traveling merchant who appears periodically with exotic goods from distant lands.',
    location: 'marketplace', dialogTreeId: 'dt_generic_friendly',
    giftPreferences: [
      { resource: 'gold', bonusPerUnit: 0.1, thankText: 'Gold! The universal language. You understand commerce!' },
    ],
    hasShop: true, merchantId: 'merchant_traveling', questIds: ['side_trade_route', 'side_exotic_delivery'],
    weatherDialogs: [
      { condition: 'rain', text: 'Rain on the trade road means muddy wheels and late deliveries. But I\'m here!' },
      { condition: 'sunny', text: 'Perfect traveling weather! My cart is full of wonders today.' },
    ],
    rumors: [
      { text: 'The Wandering Market appeared near the eastern crossroads last full moon.', accuracy: 0.4, relatedLoreId: 'lore_wandering_market' },
      { text: 'Prices for essence are skyrocketing in the western kingdoms. Good time to sell.', accuracy: 0.7 },
    ],
  },
  {
    id: 'npc_guard_brakken', name: 'Captain Brakken', title: 'Guard Captain',
    personality: 'gruff', portrait: 'npc_guard_brakken',
    description: 'A descendant of the legendary Commander Brakken. He takes security very seriously and runs the local guard with iron discipline.',
    location: 'barracks', dialogTreeId: 'dt_generic_gruff',
    giftPreferences: [
      { resource: 'ore', bonusPerUnit: 0.3, thankText: 'Good steel for the guards. Appreciated.' },
      { resource: 'food', bonusPerUnit: 0.2, thankText: 'My soldiers eat well tonight. Thanks.' },
    ],
    hasShop: false, questIds: ['side_bandit_patrol', 'side_defense_drill'],
    weatherDialogs: [
      { condition: 'storm', text: 'Storms bring bandits out of hiding. Double the patrols.' },
      { condition: 'fog', text: 'Fog is a soldier\'s enemy. Stay vigilant.' },
    ],
    rumors: [
      { text: 'Bandits have been spotted on the western trade road — merchants beware.', accuracy: 0.6 },
      { text: 'The old watchtower is structurally sound. Could be repaired for a strategic advantage.', accuracy: 0.9 },
    ],
  },
  {
    id: 'npc_farmer_dara', name: 'Dara', title: 'Head Farmer',
    personality: 'friendly', portrait: 'npc_farmer_dara',
    description: 'A warm-hearted farmer who manages the guild\'s agricultural operations. She has an uncanny ability to predict weather.',
    location: 'farm', dialogTreeId: 'dt_generic_friendly',
    giftPreferences: [
      { resource: 'water', bonusPerUnit: 0.4, thankText: 'Water for the crops! You\'re a lifesaver.' },
      { resource: 'herbs', bonusPerUnit: 0.3, thankText: 'I\'ll plant these right away. Thank you!' },
    ],
    hasShop: false, questIds: ['side_harvest_festival', 'side_pest_control'],
    weatherDialogs: [
      { condition: 'rain', text: 'Beautiful rain! The fields will love this.' },
      { condition: 'heatwave', text: 'This heat is withering the crops. We need more water.' },
    ],
    rumors: [
      { text: 'The soil near the old ruins is unusually fertile. Something in the ground, maybe.', accuracy: 0.75 },
    ],
  },
  {
    id: 'npc_librarian_cyrus', name: 'Cyrus', title: 'Head Librarian',
    personality: 'scholarly', portrait: 'npc_librarian_cyrus',
    description: 'A meticulous librarian who catalogs every scrap of knowledge that enters the guild. He is the go-to source for research and lore.',
    location: 'library', dialogTreeId: 'dt_generic_friendly',
    giftPreferences: [
      { resource: 'essence', bonusPerUnit: 0.3, thankText: 'Essence to power the reading lamps. Much appreciated.' },
    ],
    hasShop: false, questIds: ['side_lost_texts', 'side_codex_completion'],
    weatherDialogs: [
      { condition: 'rain', text: 'Perfect reading weather. I hope the roof holds.' },
      { condition: 'sunny', text: 'Natural light makes the old texts much easier to decipher.' },
    ],
    rumors: [
      { text: 'A merchant recently offered a book written in a language no one recognizes. Pre-guild era, perhaps.', accuracy: 0.8, relatedLoreId: 'lore_lost_city' },
      { text: 'The observatory records mention a celestial event approaching. Aelina predicted it centuries ago.', accuracy: 0.95 },
    ],
  },
  {
    id: 'npc_tavern_keeper_rosa', name: 'Rosa', title: 'Tavern Keeper',
    personality: 'jovial', portrait: 'npc_tavern_keeper_rosa',
    description: 'The heart of the guild\'s social life. Rosa runs the tavern where heroes rest, celebrate, and share stories.',
    location: 'tavern', dialogTreeId: 'dt_generic_friendly',
    giftPreferences: [
      { resource: 'food', bonusPerUnit: 0.3, thankText: 'Fresh ingredients! Tonight\'s stew will be legendary.' },
      { resource: 'water', bonusPerUnit: 0.2, thankText: 'Clean water keeps the ale flowing. Cheers!' },
    ],
    hasShop: true, merchantId: 'merchant_tavern', questIds: ['side_tavern_trouble', 'side_hero_recruitment'],
    weatherDialogs: [
      { condition: 'rain', text: 'Rain drives everyone indoors. Good for business!' },
      { condition: 'storm', text: 'Nothing like a warm tavern during a storm. Pull up a chair!' },
    ],
    rumors: [
      { text: 'A stranger came through last night asking about the Lost City of Meridia. Paid in sapphires.', accuracy: 0.5, relatedLoreId: 'lore_lost_city' },
      { text: 'Two heroes got into a fistfight over who discovered the crystal caves first.', accuracy: 0.9 },
    ],
  },
  {
    id: 'npc_hunter_fenris', name: 'Fenris', title: 'Master Hunter',
    personality: 'cautious', portrait: 'npc_hunter_fenris',
    description: 'A seasoned hunter who tracks beasts and supplies the guild with pelts, meat, and warnings about dangerous creatures.',
    location: 'hunting_grounds', dialogTreeId: 'dt_generic_gruff',
    giftPreferences: [
      { resource: 'food', bonusPerUnit: 0.2, thankText: 'Jerky for the trail. Practical gift. I approve.' },
    ],
    hasShop: false, questIds: ['side_beast_hunt', 'side_rare_pelt'],
    weatherDialogs: [
      { condition: 'fog', text: 'Fog means the beasts are on the move. Stay sharp.' },
      { condition: 'snow', text: 'Snow reveals tracks. Best hunting conditions there are.' },
    ],
    rumors: [
      { text: 'I spotted tracks of something large near the eastern ridge. Not a known species.', accuracy: 0.85 },
      { text: 'The shadow beasts are growing bolder — they\'ve been spotted closer to settlements than ever.', accuracy: 0.7, relatedLoreId: 'lore_shadow_beasts' },
    ],
  },
  {
    id: 'npc_mystic_zahara', name: 'Zahara', title: 'The Mystic',
    personality: 'mysterious', portrait: 'npc_mystic_zahara',
    description: 'A enigmatic mystic who reads essence patterns and claims to see glimpses of the future. Her predictions are unsettlingly accurate.',
    location: 'observatory', dialogTreeId: 'dt_generic_mysterious',
    giftPreferences: [
      { resource: 'essence', bonusPerUnit: 0.6, thankText: 'The essence speaks... it says you are generous. How delightful.' },
    ],
    hasShop: false, questIds: ['side_prophecy_hunt', 'side_essence_alignment'],
    weatherDialogs: [
      { condition: 'storm', text: 'The storm carries whispers from beyond the veil. Listen closely.' },
      { condition: 'sunny', text: 'The sun hides nothing. But nothing hides from the sun, either.' },
    ],
    rumors: [
      { text: 'A hidden dungeon reveals itself when the full moon coincides with a rainstorm.', accuracy: 1.0 },
      { text: 'The stars are aligning in a pattern not seen since the Eclipse of 555.', accuracy: 0.95, relatedLoreId: 'lore_eclipse_555' },
    ],
  },
  {
    id: 'npc_miner_torgen', name: 'Torgen', title: 'Foreman',
    personality: 'gruff', portrait: 'npc_miner_torgen',
    description: 'The grizzled foreman of the mining operations. He has spent decades underground and knows the earth better than anyone.',
    location: 'mine', dialogTreeId: 'dt_generic_gruff',
    giftPreferences: [
      { resource: 'food', bonusPerUnit: 0.3, thankText: 'The miners eat well tonight. Good.' },
      { resource: 'wood', bonusPerUnit: 0.2, thankText: 'Timber for the mine supports. Always needed.' },
    ],
    hasShop: false, questIds: ['side_deep_ore', 'side_mine_expansion'],
    weatherDialogs: [
      { condition: 'rain', text: 'Rain means flooding in the lower shafts. Pulling the crews back.' },
      { condition: 'storm', text: 'Thunder shakes the tunnels. No one goes below today.' },
    ],
    rumors: [
      { text: 'We broke through into a new cavern last week. The walls were covered in crystals.', accuracy: 0.9, relatedLoreId: 'lore_crystal_caverns' },
      { text: 'Some of the older miners swear they hear singing from the deepest shafts.', accuracy: 0.4 },
    ],
  },
  {
    id: 'npc_diplomat_elara', name: 'Elara', title: 'Guild Diplomat',
    personality: 'ambitious', portrait: 'npc_diplomat_elara',
    description: 'A sharp-tongued diplomat who handles inter-guild relations. She is always three moves ahead in any negotiation.',
    location: 'council_chamber', dialogTreeId: 'dt_generic_friendly',
    giftPreferences: [
      { resource: 'gold', bonusPerUnit: 0.15, thankText: 'Gold greases the wheels of diplomacy. Well played.' },
      { resource: 'essence', bonusPerUnit: 0.2, thankText: 'Essence makes a fine diplomatic gift. I\'ll put it to good use.' },
    ],
    hasShop: false, questIds: ['side_alliance_mission', 'side_trade_negotiation'],
    weatherDialogs: [
      { condition: 'sunny', text: 'Good weather puts negotiating partners in a generous mood.' },
      { condition: 'rain', text: 'Rain makes people want to finish meetings quickly. Use that to your advantage.' },
    ],
    rumors: [
      { text: 'A rival guild has been making overtures to the Merchant Queen. We should act first.', accuracy: 0.65, relatedLoreId: 'lore_merchant_queen' },
      { text: 'The Council is considering a new expedition charter. Could open new territories.', accuracy: 0.8 },
    ],
  },
  {
    id: 'npc_bard_finn', name: 'Finn', title: 'The Bard',
    personality: 'jovial', portrait: 'npc_bard_finn',
    description: 'A wandering bard who collects and performs songs about guild history. His tales are a mix of truth and creative embellishment.',
    location: 'tavern', dialogTreeId: 'dt_generic_friendly',
    giftPreferences: [
      { resource: 'gold', bonusPerUnit: 0.2, thankText: 'A patron of the arts! I\'ll compose a ballad in your honor.' },
      { resource: 'food', bonusPerUnit: 0.15, thankText: 'A full belly makes for better singing. Thank you!' },
    ],
    hasShop: false, questIds: ['side_lost_ballad', 'side_legend_of_torvald'],
    weatherDialogs: [
      { condition: 'rain', text: 'Rain inspires melancholy ballads. My best work comes from rainy days.' },
      { condition: 'storm', text: 'A storm! Perfect backdrop for an epic tale of adventure!' },
    ],
    rumors: [
      { text: 'I heard a song in a distant tavern about a door that opens only at midnight. True story... mostly.', accuracy: 0.3 },
      { text: 'An old ballad mentions a treasure buried under the Iron Bridge. Worth investigating?', accuracy: 0.6, relatedLoreId: 'lore_iron_bridge' },
    ],
  },
];

// ── Helper functions ──
export function getNpcById(id: string): NpcDefinition | undefined {
  return NPC_DEFINITIONS.find(n => n.id === id);
}

export function getDialogTree(treeId: string): DialogTree | undefined {
  return DIALOG_TREES[treeId];
}

export function getNpcsByLocation(location: string): NpcDefinition[] {
  return NPC_DEFINITIONS.filter(n => n.location === location);
}

export function getRandomRumor(npcId: string): { text: string; accuracy: number; relatedLoreId?: string } | undefined {
  const npc = getNpcById(npcId);
  if (!npc || npc.rumors.length === 0) return undefined;
  return npc.rumors[Math.floor(Math.random() * npc.rumors.length)];
}

export function getWeatherDialog(npcId: string, condition: string): string | undefined {
  const npc = getNpcById(npcId);
  if (!npc) return undefined;
  const wd = npc.weatherDialogs.find(w => w.condition === condition);
  return wd?.text;
}
