/**
 * T-1321: Narrative data schema (lore entries, quest stages, dialog trees)
 * T-1322: Lore database with 50 world history entries
 * T-1354: Prophecy system with cryptic hints about future game events
 * T-1366: World mythology entries about gods and creation
 * T-1369: Region-specific lore pools unlocked by exploring each region
 * T-1378: In-game book collection with readable text content
 */

// ── Lore entry categories ──
export type LoreCategory = 'history' | 'creatures' | 'places' | 'people' | 'mythology' | 'prophecy';

export interface LoreEntry {
  id: string;
  title: string;
  category: LoreCategory;
  text: string;
  /** Optional related entry IDs for cross-referencing */
  relatedEntries?: string[];
  /** Discovery source: how the player can find this entry */
  discoverySource: 'exploration' | 'quest' | 'event' | 'research' | 'npc' | 'expedition' | 'book';
  /** Region restriction (empty = global) */
  regionId?: string;
  /** Rarity affects how hard it is to find */
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
  /** If true, reveals a timeline event */
  isTimelineEvent?: boolean;
  /** Year in the game world's timeline */
  timelineYear?: number;
}

// ── Prophecy system ──
export interface Prophecy {
  id: string;
  title: string;
  crypticText: string;
  revealedText: string;
  /** Condition keys that must be true to reveal (e.g., 'quest_complete:main_ch5') */
  revealConditions: string[];
  rewards: { xp?: number; gold?: number; loreEntryId?: string };
}

// ── Book collection ──
export interface BookDefinition {
  id: string;
  title: string;
  author: string;
  pages: string[];
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
  /** Where the book can be found */
  sources: Array<{ type: 'expedition' | 'shop' | 'quest' | 'event'; sourceId?: string }>;
  /** Lore entry unlocked upon reading */
  unlocksLoreId?: string;
}

// ── 50 world history lore entries ──
export const LORE_ENTRIES: LoreEntry[] = [
  // ── History (15 entries) ──
  {
    id: 'lore_founding', title: 'The Founding of the First Guild', category: 'history',
    text: 'In the Age of Scattered Stones, when no mortal dared venture beyond their village walls, a blacksmith named Torvald One-Eye gathered seven strangers beneath the Great Oak. They swore an oath to face the wilds together. Thus was born the first guild, and the world was never the same.',
    discoverySource: 'quest', rarity: 'common', isTimelineEvent: true, timelineYear: 1,
    relatedEntries: ['lore_torvald', 'lore_great_oak'],
  },
  {
    id: 'lore_crystal_war', title: 'The Crystal War', category: 'history',
    text: 'When essence crystals were discovered in the northern caves, three kingdoms waged war for control. The conflict lasted twelve years and ended only when the Crystal Accord established shared mining rights. The scars of battle still mark the landscape.',
    discoverySource: 'exploration', rarity: 'uncommon', isTimelineEvent: true, timelineYear: 87,
    regionId: 'tundra',
  },
  {
    id: 'lore_merchant_road', title: 'The Great Merchant Road', category: 'history',
    text: 'Built over thirty years by the Merchant Consortium, the Great Road connects all major settlements. Bandit raids were so common during construction that the Consortium hired the first professional escort guilds, giving rise to the hero tradition.',
    discoverySource: 'event', rarity: 'common', isTimelineEvent: true, timelineYear: 145,
  },
  {
    id: 'lore_dark_winter', title: 'The Dark Winter of Year 200', category: 'history',
    text: 'An unnatural winter gripped the world for three years. Crops failed, rivers froze, and creatures from the deep emerged. Only the guilds, sharing resources and defending settlements, prevented total collapse. The event cemented guilds as essential institutions.',
    discoverySource: 'research', rarity: 'uncommon', isTimelineEvent: true, timelineYear: 200,
  },
  {
    id: 'lore_observatory_built', title: 'Construction of the Grand Observatory', category: 'history',
    text: 'Scholar Aelina Starwatch petitioned the Council for twenty years before receiving permission to build an observatory atop Mount Clarity. Her discovery that celestial events influence essence flow changed how guilds planned their expeditions forever.',
    discoverySource: 'research', rarity: 'rare', isTimelineEvent: true, timelineYear: 312,
    relatedEntries: ['lore_aelina'],
  },
  {
    id: 'lore_beast_tide', title: 'The Beast Tide', category: 'history',
    text: 'In Year 350, an unprecedented surge of creatures poured from the Whispering Forest. Dozens of settlements were overrun. The allied guild defense, led by Commander Brakken, turned the tide at the Battle of Iron Bridge.',
    discoverySource: 'expedition', rarity: 'uncommon', isTimelineEvent: true, timelineYear: 350,
    regionId: 'forest',
  },
  {
    id: 'lore_alchemy_revolution', title: 'The Alchemy Revolution', category: 'history',
    text: 'Master Alchemist Yira discovered that combining essence with common herbs produced potions of extraordinary power. Her published formulae transformed medicine, warfare, and agriculture within a single generation.',
    discoverySource: 'research', rarity: 'common', isTimelineEvent: true, timelineYear: 410,
  },
  {
    id: 'lore_guild_council', title: 'Formation of the Guild Council', category: 'history',
    text: 'After decades of inter-guild disputes, the five most powerful guilds convened the first Council to establish rules of conduct, territory boundaries, and shared defense pacts. The Council\'s charter remains the foundation of guild law.',
    discoverySource: 'quest', rarity: 'common', isTimelineEvent: true, timelineYear: 500,
  },
  {
    id: 'lore_lost_city', title: 'The Lost City of Meridia', category: 'history',
    text: 'Meridia, once the greatest city in the world, vanished overnight during the Eclipse of Year 555. Expeditions to its rumored location return empty-handed. Some believe the city still exists, hidden behind a veil of concentrated essence.',
    discoverySource: 'expedition', rarity: 'rare', isTimelineEvent: true, timelineYear: 555,
    relatedEntries: ['lore_eclipse_555'],
  },
  {
    id: 'lore_eclipse_555', title: 'The Eclipse of Year 555', category: 'history',
    text: 'A total eclipse lasting seven days plunged the world into darkness. Essence levels surged to dangerous extremes. When the sun returned, entire landscapes had been transformed, and creatures of shadow lingered in the deep places.',
    discoverySource: 'research', rarity: 'rare', isTimelineEvent: true, timelineYear: 555,
  },
  {
    id: 'lore_iron_pact', title: 'The Iron Pact', category: 'history',
    text: 'Facing extinction from the shadow creatures, all guilds signed the Iron Pact — a mutual defense agreement requiring guilds to answer any call to arms. The Pact has been invoked seventeen times in recorded history.',
    discoverySource: 'quest', rarity: 'uncommon', isTimelineEvent: true, timelineYear: 560,
  },
  {
    id: 'lore_trade_golden_age', title: 'The Golden Age of Trade', category: 'history',
    text: 'Between Years 600 and 700, unprecedented peace allowed trade to flourish. New merchant routes opened, rare goods flowed freely, and guilds grew wealthy. The period ended with the Sapphire Crisis, when a counterfeit gem ring collapsed market confidence.',
    discoverySource: 'event', rarity: 'common', isTimelineEvent: true, timelineYear: 650,
  },
  {
    id: 'lore_hero_tradition', title: 'Origins of the Hero Tradition', category: 'history',
    text: 'The tradition of guilds recruiting specialized heroes began when Rowan the Defender single-handedly held Bridgewatch Pass against a raiding party. Guilds realized that investing in exceptional individuals yielded returns beyond what numbers alone could achieve.',
    discoverySource: 'npc', rarity: 'common', isTimelineEvent: true, timelineYear: 180,
    relatedEntries: ['lore_rowan'],
  },
  {
    id: 'lore_sapphire_crisis', title: 'The Sapphire Crisis', category: 'history',
    text: 'A network of counterfeiters flooded the market with fake sapphires, crashing the gemstone exchange. Guilds lost fortunes. The crisis led to the creation of the Sapphire Exchange, a regulated trading body that still operates today.',
    discoverySource: 'event', rarity: 'uncommon', isTimelineEvent: true, timelineYear: 700,
  },
  {
    id: 'lore_present_age', title: 'The Current Age', category: 'history',
    text: 'We live in the Age of Restoration. After centuries of upheaval, guilds are rebuilding and rediscovering lost knowledge. Strange readings from the Observatory suggest that essence flows are shifting in patterns not seen since the Eclipse of 555.',
    discoverySource: 'quest', rarity: 'common', isTimelineEvent: true, timelineYear: 900,
  },

  // ── Creatures (8 entries) ──
  {
    id: 'lore_shadow_beasts', title: 'Shadow Beasts', category: 'creatures',
    text: 'Born from concentrated darkness during the Eclipse of 555, these creatures lurk in caves and ruins. They are weakened by essence light but never truly die — they reform in shadow after being defeated.',
    discoverySource: 'expedition', rarity: 'common',
  },
  {
    id: 'lore_crystal_drakes', title: 'Crystal Drakes', category: 'creatures',
    text: 'Serpentine creatures whose scales are made of living crystal. They nest near essence veins and are fiercely territorial. Their shed scales are among the most valuable crafting materials known.',
    discoverySource: 'expedition', rarity: 'uncommon', regionId: 'mountains',
  },
  {
    id: 'lore_moss_golems', title: 'Moss Golems', category: 'creatures',
    text: 'Animated by ancient nature magic, these slow-moving giants guard the oldest parts of the forest. They are not inherently hostile but will crush anyone who harms the trees they protect.',
    discoverySource: 'exploration', rarity: 'common', regionId: 'forest',
  },
  {
    id: 'lore_sand_wraiths', title: 'Sand Wraiths', category: 'creatures',
    text: 'Ethereal beings that drift across the desert at dusk. They feed on the memories of travelers, leaving their victims alive but disoriented. Wise caravans travel only by day.',
    discoverySource: 'expedition', rarity: 'uncommon', regionId: 'desert',
  },
  {
    id: 'lore_tide_serpents', title: 'Tide Serpents', category: 'creatures',
    text: 'Massive aquatic creatures that surface during storms. Ancient mariners believed they controlled the tides. Modern scholars think they are drawn to the electromagnetic energy of lightning.',
    discoverySource: 'exploration', rarity: 'rare', regionId: 'coast',
  },
  {
    id: 'lore_ember_foxes', title: 'Ember Foxes', category: 'creatures',
    text: 'Small, flame-furred creatures that live near volcanic vents. Alchemists prize their shed fur for fire-resistant potions. They are surprisingly intelligent and can be tamed with patience.',
    discoverySource: 'expedition', rarity: 'common',
  },
  {
    id: 'lore_iron_beetles', title: 'Iron Beetles', category: 'creatures',
    text: 'Beetles with shells harder than steel that burrow through solid rock. Miners both curse and bless them — they destroy tunnels but expose rich ore veins in the process.',
    discoverySource: 'exploration', rarity: 'common',
  },
  {
    id: 'lore_whisper_moths', title: 'Whisper Moths', category: 'creatures',
    text: 'Nocturnal insects that produce a faint humming sound matching the frequency of essence vibrations. Scholars use them as living essence detectors, following their swarms to hidden deposits.',
    discoverySource: 'research', rarity: 'uncommon',
  },

  // ── Places (8 entries) ──
  {
    id: 'lore_great_oak', title: 'The Great Oak', category: 'places',
    text: 'The oldest living tree in the known world, under which the first guild was founded. Its roots run so deep that they tap into an essence vein, keeping the tree eternally green. Pilgrimages to the Oak are a guild tradition.',
    discoverySource: 'quest', rarity: 'common', regionId: 'forest',
  },
  {
    id: 'lore_iron_bridge', title: 'Iron Bridge', category: 'places',
    text: 'A massive bridge spanning the River Keld, built from ore reinforced with essence. The site of Commander Brakken\'s famous stand during the Beast Tide. Scratch marks from the battle still scar its railings.',
    discoverySource: 'exploration', rarity: 'uncommon',
  },
  {
    id: 'lore_crystal_caverns', title: 'The Crystal Caverns', category: 'places',
    text: 'A vast underground network where essence crystallizes naturally. The caverns glow with inner light and hum with energy. Many expeditions have been lost in their ever-shifting passages.',
    discoverySource: 'expedition', rarity: 'uncommon', regionId: 'mountains',
  },
  {
    id: 'lore_sunken_ruins', title: 'The Sunken Ruins', category: 'places',
    text: 'The remains of a pre-guild civilization, half-submerged in a coastal bay. Strange mechanisms still function within, powered by an unknown energy source. Divers report hearing music in the deepest chambers.',
    discoverySource: 'expedition', rarity: 'rare', regionId: 'coast',
  },
  {
    id: 'lore_whispering_forest', title: 'The Whispering Forest', category: 'places',
    text: 'A dense woodland where the wind seems to carry voices. Scholars believe the trees have absorbed so much essence that they have developed a rudimentary consciousness. The forest is the source of the Beast Tide.',
    discoverySource: 'exploration', rarity: 'common', regionId: 'forest',
  },
  {
    id: 'lore_mount_clarity', title: 'Mount Clarity', category: 'places',
    text: 'The tallest peak in the region, home to the Grand Observatory. The air at the summit is so pure that essence readings taken there are the most accurate in the world.',
    discoverySource: 'research', rarity: 'uncommon', regionId: 'mountains',
  },
  {
    id: 'lore_desert_of_echoes', title: 'The Desert of Echoes', category: 'places',
    text: 'A vast desert where sound behaves strangely — whispers carry for miles while shouts vanish instantly. Some say the sand itself remembers every word spoken upon it.',
    discoverySource: 'expedition', rarity: 'uncommon', regionId: 'desert',
  },
  {
    id: 'lore_frozen_harbor', title: 'The Frozen Harbor', category: 'places',
    text: 'Once a thriving port, now locked in permanent ice since the Dark Winter. Ships are frozen mid-voyage, their cargo perfectly preserved. Salvage expeditions are lucrative but dangerous.',
    discoverySource: 'expedition', rarity: 'rare', regionId: 'tundra',
  },

  // ── People (7 entries) ──
  {
    id: 'lore_torvald', title: 'Torvald One-Eye', category: 'people',
    text: 'The founder of the first guild. A blacksmith who lost his right eye fighting a shadow beast. He forged the first essence-tempered blade and used it to protect his village. His hammer is preserved in the Guild Council chambers.',
    discoverySource: 'quest', rarity: 'common',
    relatedEntries: ['lore_founding'],
  },
  {
    id: 'lore_aelina', title: 'Aelina Starwatch', category: 'people',
    text: 'The astronomer who built the Grand Observatory and discovered the connection between celestial events and essence flow. She mapped the night sky with unprecedented precision and predicted the next Eclipse — due in our lifetime.',
    discoverySource: 'research', rarity: 'rare',
    relatedEntries: ['lore_observatory_built'],
  },
  {
    id: 'lore_rowan', title: 'Rowan the Defender', category: 'people',
    text: 'The legendary hero who held Bridgewatch Pass alone for three days. His feat inspired the hero recruitment tradition. He later founded a training school whose methods are still used by defenders today.',
    discoverySource: 'npc', rarity: 'uncommon',
    relatedEntries: ['lore_hero_tradition'],
  },
  {
    id: 'lore_yira', title: 'Master Yira', category: 'people',
    text: 'The alchemist who discovered essence-herb synthesis. She refused to patent her discoveries, publishing them freely. "Knowledge hoarded is knowledge wasted," she wrote. Her generosity revolutionized the world.',
    discoverySource: 'research', rarity: 'uncommon',
  },
  {
    id: 'lore_brakken', title: 'Commander Brakken', category: 'people',
    text: 'The guild commander who led the allied defense during the Beast Tide. A tactical genius who devised the "Iron Wall" formation still taught in guild academies. He disappeared after the battle and was never seen again.',
    discoverySource: 'expedition', rarity: 'uncommon',
  },
  {
    id: 'lore_shadow_king', title: 'The Shadow King', category: 'people',
    text: 'A figure spoken of in whispers — said to rule the shadow beasts from a throne deep beneath the earth. No one has confirmed the Shadow King\'s existence, but patterns in beast attacks suggest coordinated intelligence.',
    discoverySource: 'expedition', rarity: 'legendary',
  },
  {
    id: 'lore_merchant_queen', title: 'The Merchant Queen', category: 'people',
    text: 'Known only by her title, this mysterious figure controls the largest trade network in the world. She has never been seen in person — all dealings are conducted through intermediaries. Some believe she is an immortal from the pre-guild era.',
    discoverySource: 'event', rarity: 'rare',
  },

  // ── Mythology (7 entries) ──
  {
    id: 'myth_creation', title: 'The Creation Song', category: 'mythology',
    text: 'In the beginning, the world was silence. Then the First Voice sang a single note, and essence flowed into the void. Where it pooled, stone formed. Where it scattered, air filled. Where it burned, fire sparked. Where it cooled, water flowed. The song continues — essence is the echo of creation.',
    discoverySource: 'research', rarity: 'uncommon',
  },
  {
    id: 'myth_four_guardians', title: 'The Four Guardians', category: 'mythology',
    text: 'Four divine beings were appointed to watch over the elements: Pyrathos of Fire, Aqualis of Water, Terran of Earth, and Zephira of Air. The temples built in their honor channel their residual essence, granting blessings to the faithful.',
    discoverySource: 'research', rarity: 'common',
    relatedEntries: ['myth_pyrathos', 'myth_aqualis'],
  },
  {
    id: 'myth_pyrathos', title: 'Pyrathos, Guardian of Fire', category: 'mythology',
    text: 'Pyrathos forged the sun and placed it in the sky to warm the world. When angry, volcanoes erupt. When pleased, hearthfires burn bright. Blacksmiths pray to Pyrathos before working the forge, and miners leave offerings at volcanic vents.',
    discoverySource: 'research', rarity: 'uncommon',
  },
  {
    id: 'myth_aqualis', title: 'Aqualis, Guardian of Water', category: 'mythology',
    text: 'Aqualis wept tears of joy when life first appeared, and those tears became the oceans. Rivers are said to be her veins, rain her blessing. Fishermen and sailors honor her with the first catch, cast back into the sea.',
    discoverySource: 'research', rarity: 'uncommon',
  },
  {
    id: 'myth_eclipse_prophecy', title: 'The Prophecy of the Last Eclipse', category: 'mythology',
    text: 'Ancient texts speak of a final Eclipse when essence will surge beyond all control. "When the shadow eats the sun for the last time, the world will be remade — or unmade — by those who hold the essence." Scholars debate whether this is metaphor or warning.',
    discoverySource: 'research', rarity: 'rare',
    relatedEntries: ['lore_eclipse_555'],
  },
  {
    id: 'myth_underworld', title: 'The World Below', category: 'mythology',
    text: 'Beneath the deepest mines lies the World Below, where essence originates. The dead are said to descend there, their memories dissolving into pure essence that rises back to the surface. This cycle is called the Eternal Return.',
    discoverySource: 'research', rarity: 'uncommon',
  },
  {
    id: 'myth_first_tree', title: 'The First Tree', category: 'mythology',
    text: 'Before the Great Oak, there was the First Tree — planted by the Guardians as a conduit between the surface and the World Below. When it was struck down by a jealous god, its seeds scattered across the world, becoming the forests we know today.',
    discoverySource: 'research', rarity: 'rare',
    relatedEntries: ['lore_great_oak'],
  },

  // ── Additional entries to reach 50 ──
  {
    id: 'lore_guild_ranks', title: 'The Guild Ranking System', category: 'history',
    text: 'The Council established a ranking system based on a guild\'s total contributions to the common good. Higher-ranked guilds receive priority access to expedition sites, trade routes, and Council votes. The system, while imperfect, incentivizes cooperation.',
    discoverySource: 'quest', rarity: 'common', isTimelineEvent: true, timelineYear: 520,
  },
  {
    id: 'lore_essence_sickness', title: 'Essence Sickness', category: 'creatures',
    text: 'Prolonged exposure to raw essence causes a condition known as Essence Sickness — tremors, hallucinations, and eventually transformation into a crystalline statue. Alchemists developed protective salves, but miners still fear the deep veins.',
    discoverySource: 'research', rarity: 'uncommon',
  },
  {
    id: 'lore_wandering_market', title: 'The Wandering Market', category: 'places',
    text: 'A legendary market that appears at crossroads during certain moon phases. Merchants there sell impossible goods — weapons from the future, maps to places that don\'t exist yet, and memories bottled in crystal vials.',
    discoverySource: 'event', rarity: 'legendary',
  },
  {
    id: 'lore_storm_sailors', title: 'The Storm Sailors', category: 'people',
    text: 'An elite group of mariners who navigate by reading essence currents rather than stars. They can sail through any storm and find passage where none exists. Their techniques are a closely guarded secret passed only through apprenticeship.',
    discoverySource: 'npc', rarity: 'rare',
  },
  {
    id: 'lore_herb_lore', title: 'The Living Pharmacy', category: 'creatures',
    text: 'Certain plants in the Whispering Forest have been observed moving to follow injured animals, wrapping around wounds and secreting healing sap. Whether this is instinct or intelligence remains the subject of fierce scholarly debate.',
    discoverySource: 'exploration', rarity: 'common', regionId: 'forest',
  },
];

// ── Prophecies ──
export const PROPHECIES: Prophecy[] = [
  {
    id: 'prophecy_eclipse', title: 'The Coming Darkness',
    crypticText: 'When seven moons align and shadows stretch beyond their source, the veil shall thin and what was lost shall stir beneath the stone.',
    revealedText: 'The prophecy speaks of a rare celestial alignment that will cause essence to surge. The Lost City of Meridia may briefly become accessible during this event.',
    revealConditions: ['quest_complete:main_ch5', 'lore_discovered:lore_eclipse_555'],
    rewards: { xp: 500, loreEntryId: 'lore_lost_city' },
  },
  {
    id: 'prophecy_guardian_return', title: 'The Guardians\' Return',
    crypticText: 'Four temples lit as one shall call the sleeping watchers home. Iron and crystal, flame and wave — the old pact shall be honored.',
    revealedText: 'Building and upgrading all four temple types simultaneously will unlock a special blessing event with powerful rewards.',
    revealConditions: ['building_built:temple_fire', 'building_built:temple_water', 'building_built:temple_earth', 'building_built:temple_air'],
    rewards: { xp: 1000, gold: 500 },
  },
  {
    id: 'prophecy_shadow_king', title: 'The Throne Below',
    crypticText: 'He who sits on shadow\'s throne weaves the darkness like a loom. Seek the thread where beasts emerge, and pull until the pattern breaks.',
    revealedText: 'The Shadow King is real. Defeating enough shadow beasts in expeditions will reveal the entrance to his domain — the ultimate dungeon.',
    revealConditions: ['shadow_beasts_defeated:100', 'lore_discovered:lore_shadow_king'],
    rewards: { xp: 750, loreEntryId: 'lore_shadow_king' },
  },
  {
    id: 'prophecy_merchant_queen', title: 'The Unseen Hand',
    crypticText: 'Gold flows to one who has no face. Follow the coin from hand to hand, and at the journey\'s end you\'ll find the one who counts the world.',
    revealedText: 'The Merchant Queen monitors all trade activity. Reaching maximum reputation with all merchants will trigger her invitation.',
    revealConditions: ['merchant_rep_max:3', 'lore_discovered:lore_merchant_queen'],
    rewards: { xp: 600, gold: 1000 },
  },
  {
    id: 'prophecy_first_tree', title: 'Seeds of Rebirth',
    crypticText: 'When the last leaf falls from the oldest bough, plant what you find beneath. From death, new life — from ending, a beginning without end.',
    revealedText: 'The Great Oak is dying. A special quest will allow players to plant a seed from the First Tree, restoring the forest and unlocking a permanent production bonus.',
    revealConditions: ['quest_complete:main_ch8', 'lore_discovered:myth_first_tree'],
    rewards: { xp: 800 },
  },
];

// ── Book collection ──
export const BOOKS: BookDefinition[] = [
  {
    id: 'book_guild_handbook', title: 'The Guild Handbook', author: 'Council of Guilds',
    pages: [
      'Chapter 1: Founding Your Guild\n\nEvery great endeavor begins with a single step. Your guild hall is more than walls and a roof — it is a declaration of intent. Choose your location wisely, for the land remembers who builds upon it.',
      'Chapter 2: Recruiting Heroes\n\nA guild is only as strong as its members. Seek individuals with complementary skills. A defender without a healer is a wall without mortar. A scout without a merchant loses half the value of every discovery.',
      'Chapter 3: The Art of Expedition\n\nPreparation is nine-tenths of survival. Stock supplies generously, study the route, and always have a contingency plan. The wilds do not forgive poor planning.',
    ],
    rarity: 'common',
    sources: [{ type: 'quest', sourceId: 'main_ch1' }],
    unlocksLoreId: 'lore_founding',
  },
  {
    id: 'book_starwatch_journal', title: 'Aelina\'s Star Journal', author: 'Aelina Starwatch',
    pages: [
      'Day 1: I have finally received permission to build. Twenty years of petitions, and all it took was one earthquake to convince the Council that understanding the heavens matters.',
      'Day 147: The observatory dome is complete. First observations tonight. My hands tremble — not from cold, but anticipation.',
      'Day 892: I have confirmed it. Essence flow correlates directly with celestial positions. The moon, the stars, even distant comets — they all pull on the invisible threads of essence. We are connected to the cosmos in ways we never imagined.',
      'Day 1204: I have seen something in the calculations that frightens me. Another Eclipse is coming. Not in my lifetime, perhaps, but soon. And this one will be worse than the last.',
    ],
    rarity: 'rare',
    sources: [{ type: 'expedition', sourceId: 'crystal_caverns' }],
    unlocksLoreId: 'lore_aelina',
  },
  {
    id: 'book_beast_compendium', title: 'A Compendium of Beasts', author: 'Scholar Maren',
    pages: [
      'On Shadow Beasts: These creatures are not alive in any conventional sense. They are essence given form by absence — shaped by the void where light should be. They hunger not for flesh but for warmth.',
      'On Crystal Drakes: Observe from a safe distance. Their scales refract essence into blinding patterns. A full-grown drake can shatter stone with its tail and melt iron with its breath. Approach only in groups of five or more.',
      'On Moss Golems: Patient beyond mortal comprehension. I once watched one stand motionless for three months before moving a single step to block a woodcutter. They are ancient, wise, and utterly implacable.',
    ],
    rarity: 'uncommon',
    sources: [{ type: 'shop' }, { type: 'expedition' }],
  },
  {
    id: 'book_merchant_tales', title: 'Tales of the Trade Road', author: 'Anonymous Merchant',
    pages: [
      'The road teaches you things no school can. How to read a customer\'s eyes. How to spot a loaded die. How to sleep with one eye open and both hands on your coin purse.',
      'I met the Merchant Queen\'s agent once. At least, I think I did. She bought everything I had at triple price and vanished before I could ask why. The goods appeared in a market three kingdoms away the next week, sold at ten times what she paid.',
      'The Wandering Market is real. I found it at a crossroads under a blue moon. They sold me a map to a mine that shouldn\'t exist. It did. I am now retired.',
    ],
    rarity: 'rare',
    sources: [{ type: 'event' }],
    unlocksLoreId: 'lore_wandering_market',
  },
  {
    id: 'book_alchemy_primer', title: 'Alchemy for the Curious', author: 'Master Yira',
    pages: [
      'Lesson 1: Essence is not magic. It is a natural force, like gravity or magnetism. We do not conjure it — we redirect it. Understanding this distinction is the first step toward mastery.',
      'Lesson 2: Every herb has an essence affinity. Moonbloom resonates with water essence. Sunleaf with fire. Ironroot with earth. Learn these affinities, and synthesis becomes intuition rather than guesswork.',
    ],
    rarity: 'common',
    sources: [{ type: 'shop' }, { type: 'quest', sourceId: 'side_alchemy_intro' }],
    unlocksLoreId: 'lore_alchemy_revolution',
  },
  {
    id: 'book_shadow_chronicles', title: 'Chronicles of the Dark Winter', author: 'Unknown Survivor',
    pages: [
      'The sun grew dim on the third day of autumn. By the seventh day, it was gone. Not hidden behind clouds — simply gone, as if the sky had swallowed it.',
      'The cold was unlike any winter I had known. It crept into your bones and stayed there. Fires burned but gave no warmth. Water froze in the pot while the flame still licked beneath it.',
      'We survived because the guilds shared. Every scrap of food, every drop of essence, every warm corner was distributed by need. Without the guilds, we would all have perished.',
    ],
    rarity: 'uncommon',
    sources: [{ type: 'expedition', sourceId: 'frozen_harbor' }],
    unlocksLoreId: 'lore_dark_winter',
  },
  {
    id: 'book_prophecy_fragments', title: 'Fragments of Prophecy', author: 'Temple Archives',
    pages: [
      'These fragments were gathered from temple walls, ancient scrolls, and the ravings of essence-touched seers. Their authenticity is debated, but their persistence across cultures is undeniable.',
      '"The world turns on seven axes, and when the seventh stops, all shall be rewritten." — Inscription, Temple of Terran',
      '"Water remembers. Stone forgets. Fire transforms. Air carries. In the end, essence decides." — Oracle of the Blue Moon',
    ],
    rarity: 'rare',
    sources: [{ type: 'quest', sourceId: 'side_temple_research' }],
  },
  {
    id: 'book_explorer_guide', title: 'The Explorer\'s Survival Guide', author: 'Guild Scouts Association',
    pages: [
      'Rule 1: Always tell someone where you are going and when you expect to return. The wilds are beautiful but unforgiving.',
      'Rule 2: Carry twice as much water as you think you need. You will need it.',
      'Rule 3: If a Moss Golem blocks your path, go around. Always around. Never through.',
      'Rule 4: Whisper Moths glow brighter near essence deposits. Follow the swarm, but not into caves — that is how you find Crystal Drakes.',
    ],
    rarity: 'common',
    sources: [{ type: 'shop' }],
  },
];

// ── Helper functions ──
export function getLoreById(id: string): LoreEntry | undefined {
  return LORE_ENTRIES.find(l => l.id === id);
}

export function getLoreByCategory(category: LoreCategory): LoreEntry[] {
  return LORE_ENTRIES.filter(l => l.category === category);
}

export function getLoreByRegion(regionId: string): LoreEntry[] {
  return LORE_ENTRIES.filter(l => l.regionId === regionId);
}

export function getTimelineEntries(): LoreEntry[] {
  return LORE_ENTRIES
    .filter(l => l.isTimelineEvent && l.timelineYear !== undefined)
    .sort((a, b) => (a.timelineYear ?? 0) - (b.timelineYear ?? 0));
}

export function getBookById(id: string): BookDefinition | undefined {
  return BOOKS.find(b => b.id === id);
}

export function getProphecyById(id: string): Prophecy | undefined {
  return PROPHECIES.find(p => p.id === id);
}
