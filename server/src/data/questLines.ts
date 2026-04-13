/**
 * T-1341: Quest system data structure (objectives, stages, rewards)
 * T-1342: Main quest line with 10 story chapters
 * T-1343: Side quest pool with 20 procedural side quests
 * T-1347: Quest chain system linking quests in narrative sequence
 * T-1348: Quest requirement system (level, items, reputation prerequisites)
 * T-1363: Hero personal story arcs triggered by level milestones
 * T-1364: Hero story dialog sequences at key story beats
 * T-1365: Hero story completion rewards (unique items, titles)
 */

// ── Quest data structures ──
export type QuestStatus = 'locked' | 'available' | 'active' | 'completed' | 'failed';
export type QuestObjectiveType = 'collect' | 'defeat' | 'explore' | 'build' | 'research' | 'talk' | 'deliver' | 'discover';

export interface QuestObjective {
  id: string;
  type: QuestObjectiveType;
  description: string;
  target: string;
  required: number;
  current?: number;
}

export interface QuestRequirement {
  /** Minimum guild level */
  guildLevel?: number;
  /** Required items in inventory */
  requiredItems?: string[];
  /** Must have completed these quest IDs first */
  prerequisiteQuests?: string[];
  /** Minimum NPC relationship level */
  npcRelationship?: { npcId: string; minLevel: number };
  /** Must have discovered these lore entries */
  requiredLore?: string[];
}

export interface QuestReward {
  xp: number;
  gold?: number;
  items?: string[];
  loreEntryIds?: string[];
  /** Unique title awarded */
  title?: string;
  /** NPC relationship bonus */
  npcRelationship?: { npcId: string; amount: number };
  /** Unlock a prophecy */
  unlocksProphecyId?: string;
}

export interface QuestStage {
  id: string;
  title: string;
  description: string;
  narrativeText: string;
  objectives: QuestObjective[];
  rewards: QuestReward;
  /** Dialog sequence at this stage's story beat */
  dialogNpcId?: string;
  dialogNodeId?: string;
}

export interface QuestLine {
  id: string;
  title: string;
  description: string;
  category: 'main' | 'side' | 'hero_story';
  stages: QuestStage[];
  requirements: QuestRequirement;
  /** If hero_story, which hero role triggers it */
  heroRole?: string;
  /** Hero level milestones that trigger story beats */
  heroLevelTriggers?: number[];
  /** Final completion reward beyond stage rewards */
  completionReward?: QuestReward;
}

// ── Main quest line: 10 story chapters ──
export const MAIN_QUEST_LINE: QuestLine = {
  id: 'main_quest',
  title: 'The Restoration',
  description: 'Rebuild your guild, uncover ancient secrets, and prepare for a coming darkness that threatens to reshape the world.',
  category: 'main',
  requirements: {},
  completionReward: {
    xp: 5000, gold: 2000, title: 'Savior of the Realm',
    loreEntryIds: ['lore_present_age'],
  },
  stages: [
    {
      id: 'main_ch1', title: 'Chapter 1: A New Beginning',
      description: 'Establish your guild hall and recruit your first heroes.',
      narrativeText: 'You stand before the ruins of what was once a great guild hall. The stones are cracked, the banners faded, but the foundation is solid. This is where your story begins.',
      objectives: [
        { id: 'ch1_build', type: 'build', description: 'Build your Guild Hall', target: 'guild_hall', required: 1 },
        { id: 'ch1_recruit', type: 'collect', description: 'Recruit 3 heroes', target: 'heroes', required: 3 },
      ],
      rewards: { xp: 100, gold: 50, loreEntryIds: ['lore_founding'] },
      dialogNpcId: 'npc_elder_maren', dialogNodeId: 'first',
    },
    {
      id: 'main_ch2', title: 'Chapter 2: First Expedition',
      description: 'Send your heroes on their first expedition and discover what lies beyond the guild walls.',
      narrativeText: 'Elder Maren speaks of ruins beyond the Whispering Forest. Ruins that hold answers about why this land was abandoned. Your heroes are ready — the question is, are you?',
      objectives: [
        { id: 'ch2_expedition', type: 'explore', description: 'Complete an expedition', target: 'expedition', required: 1 },
        { id: 'ch2_resources', type: 'collect', description: 'Gather 500 total resources', target: 'total_resources', required: 500 },
      ],
      rewards: { xp: 200, gold: 100 },
      dialogNpcId: 'npc_elder_maren', dialogNodeId: 'history',
    },
    {
      id: 'main_ch3', title: 'Chapter 3: Whispers in the Dark',
      description: 'Investigate strange occurrences near the abandoned mines.',
      narrativeText: 'Reports filter in from the mining crews: strange sounds echoing from the deep shafts. Torgen\'s miners refuse to go below the third level. Something is stirring beneath the earth.',
      objectives: [
        { id: 'ch3_mine', type: 'build', description: 'Build a Mine', target: 'mine', required: 1 },
        { id: 'ch3_explore_mine', type: 'explore', description: 'Explore the Deep Mines', target: 'deep_mines', required: 1 },
        { id: 'ch3_defeat', type: 'defeat', description: 'Defeat shadow creatures', target: 'shadow_beast', required: 5 },
      ],
      rewards: { xp: 300, loreEntryIds: ['lore_shadow_beasts'], npcRelationship: { npcId: 'npc_miner_torgen', amount: 5 } },
    },
    {
      id: 'main_ch4', title: 'Chapter 4: The Scholar\'s Theory',
      description: 'Research the connection between essence and the shadow creatures.',
      narrativeText: 'Cyrus, the librarian, believes the shadow creatures are drawn to areas where essence concentrations are abnormal. If he is right, understanding essence flow could reveal where threats will emerge next.',
      objectives: [
        { id: 'ch4_library', type: 'build', description: 'Build a Library', target: 'library', required: 1 },
        { id: 'ch4_research', type: 'research', description: 'Complete 3 research projects', target: 'research', required: 3 },
        { id: 'ch4_lore', type: 'discover', description: 'Discover 10 lore entries', target: 'lore_entries', required: 10 },
      ],
      rewards: { xp: 400, gold: 200, loreEntryIds: ['lore_essence_sickness'] },
      dialogNpcId: 'npc_librarian_cyrus',
    },
    {
      id: 'main_ch5', title: 'Chapter 5: The Observatory',
      description: 'Build the Observatory and confirm Aelina\'s ancient predictions.',
      narrativeText: 'Zahara, the mystic, insists that celestial events hold the key. She wants to rebuild the Observatory on Mount Clarity and verify Aelina Starwatch\'s centuries-old calculations.',
      objectives: [
        { id: 'ch5_observatory', type: 'build', description: 'Build the Observatory', target: 'observatory', required: 1 },
        { id: 'ch5_observe', type: 'research', description: 'Complete celestial observation', target: 'celestial_observation', required: 1 },
      ],
      rewards: { xp: 500, loreEntryIds: ['lore_observatory_built', 'lore_aelina'], unlocksProphecyId: 'prophecy_eclipse' },
      dialogNpcId: 'npc_mystic_zahara',
    },
    {
      id: 'main_ch6', title: 'Chapter 6: Alliance Forged',
      description: 'Unite neighboring guilds against the growing shadow threat.',
      narrativeText: 'The shadow creatures are not just threatening your guild — they are spreading across the region. Elara proposes reaching out to neighboring guilds to form a defensive alliance, echoing the Iron Pact of old.',
      objectives: [
        { id: 'ch6_alliance', type: 'talk', description: 'Form an alliance with another guild', target: 'alliance', required: 1 },
        { id: 'ch6_barracks', type: 'build', description: 'Build Barracks', target: 'barracks', required: 1 },
        { id: 'ch6_train', type: 'collect', description: 'Train 5 heroes to level 5', target: 'hero_level_5', required: 5 },
      ],
      rewards: { xp: 600, gold: 300, loreEntryIds: ['lore_iron_pact'], npcRelationship: { npcId: 'npc_diplomat_elara', amount: 10 } },
    },
    {
      id: 'main_ch7', title: 'Chapter 7: The Crystal Caverns',
      description: 'Venture into the Crystal Caverns to find the source of the essence disruption.',
      narrativeText: 'All signs point to the Crystal Caverns — the ancient underground network where essence crystallizes. Something within is warping the natural flow, feeding the shadow creatures. A major expedition is needed.',
      objectives: [
        { id: 'ch7_prepare', type: 'collect', description: 'Stockpile 2000 supplies', target: 'supplies', required: 2000 },
        { id: 'ch7_expedition', type: 'explore', description: 'Complete the Crystal Caverns expedition', target: 'crystal_caverns', required: 1 },
        { id: 'ch7_boss', type: 'defeat', description: 'Defeat the Cavern Guardian', target: 'cavern_guardian', required: 1 },
      ],
      rewards: { xp: 800, gold: 500, loreEntryIds: ['lore_crystal_caverns'] },
    },
    {
      id: 'main_ch8', title: 'Chapter 8: The Great Oak Withers',
      description: 'The Great Oak is dying — find a way to save it before the forest falls.',
      narrativeText: 'News arrives that the Great Oak — the tree under which the first guild was founded — is dying. Its leaves are turning black, and the essence vein beneath it is drying up. If the Oak falls, the forest will follow.',
      objectives: [
        { id: 'ch8_investigate', type: 'explore', description: 'Investigate the Great Oak', target: 'great_oak', required: 1 },
        { id: 'ch8_seed', type: 'collect', description: 'Find a seed of the First Tree', target: 'first_tree_seed', required: 1 },
        { id: 'ch8_plant', type: 'deliver', description: 'Plant the seed beneath the Great Oak', target: 'plant_seed', required: 1 },
      ],
      rewards: { xp: 1000, loreEntryIds: ['lore_great_oak', 'myth_first_tree'], unlocksProphecyId: 'prophecy_first_tree' },
    },
    {
      id: 'main_ch9', title: 'Chapter 9: The Shadow King',
      description: 'Descend into the World Below and confront the Shadow King.',
      narrativeText: 'Zahara\'s visions are clear now: the Shadow King is real, and he is preparing something terrible. The entrance to his domain lies in the deepest part of the Crystal Caverns. This is the final expedition.',
      objectives: [
        { id: 'ch9_gather', type: 'collect', description: 'Gather a party of 8 heroes level 10+', target: 'elite_heroes', required: 8 },
        { id: 'ch9_descend', type: 'explore', description: 'Enter the World Below', target: 'world_below', required: 1 },
        { id: 'ch9_defeat_king', type: 'defeat', description: 'Defeat the Shadow King', target: 'shadow_king', required: 1 },
      ],
      rewards: { xp: 2000, gold: 1000, loreEntryIds: ['lore_shadow_king', 'myth_underworld'] },
    },
    {
      id: 'main_ch10', title: 'Chapter 10: Dawn',
      description: 'With the shadow threat ended, build a legacy that will last for generations.',
      narrativeText: 'The Shadow King is defeated. Essence flows freely once more. The Great Oak blooms with new life. But a guild leader\'s work is never done — there is a world to rebuild, alliances to strengthen, and new horizons to explore.',
      objectives: [
        { id: 'ch10_buildings', type: 'build', description: 'Build 15 total buildings', target: 'total_buildings', required: 15 },
        { id: 'ch10_heroes', type: 'collect', description: 'Have 20 heroes', target: 'total_heroes', required: 20 },
        { id: 'ch10_lore', type: 'discover', description: 'Discover 40 lore entries', target: 'total_lore', required: 40 },
      ],
      rewards: { xp: 3000, gold: 2000, title: 'Guildmaster Supreme' },
    },
  ],
};

// ── Side quests (20 procedural side quests) ──
export const SIDE_QUESTS: QuestLine[] = [
  {
    id: 'side_deep_ore', title: 'Deep Ore Delivery', description: 'Kael needs rare ore from the deep mines.',
    category: 'side', requirements: { prerequisiteQuests: ['main_ch3'] },
    stages: [{
      id: 'side_deep_ore_1', title: 'Mine Deep Ore', description: 'Retrieve ore from the lowest mine levels.',
      narrativeText: 'Kael\'s eyes narrow as he examines his latest blade. "Surface ore. Garbage. I need the real stuff — from below the third level. Three loads."',
      objectives: [{ id: 'sdo_collect', type: 'collect', description: 'Collect deep ore', target: 'deep_ore', required: 3 }],
      rewards: { xp: 150, items: ['essence_blade'], npcRelationship: { npcId: 'npc_blacksmith_kael', amount: 5 } },
    }],
  },
  {
    id: 'side_rare_herbs', title: 'Rare Herb Collection', description: 'The alchemist needs rare herbs for an experiment.',
    category: 'side', requirements: {},
    stages: [{
      id: 'side_rare_herbs_1', title: 'Gather Rare Herbs', description: 'Find rare herbs in the wild.',
      narrativeText: 'Apprentice Yira bounces with excitement. "I\'m so close to a breakthrough! I just need five samples of Moonbloom — they only grow in essence-rich clearings."',
      objectives: [{ id: 'srh_collect', type: 'collect', description: 'Collect Moonbloom herbs', target: 'moonbloom', required: 5 }],
      rewards: { xp: 100, gold: 40, npcRelationship: { npcId: 'npc_alchemist_yira', amount: 3 } },
    }],
  },
  {
    id: 'side_bandit_patrol', title: 'Bandit Patrol', description: 'Clear bandits from the western trade road.',
    category: 'side', requirements: { guildLevel: 3 },
    stages: [{
      id: 'side_bandit_1', title: 'Patrol the Road', description: 'Hunt down bandits threatening merchants.',
      narrativeText: 'Captain Brakken slams his fist on the table. "Bandits on the western road again. Take some fighters and clean them out."',
      objectives: [{ id: 'sb_defeat', type: 'defeat', description: 'Defeat bandit groups', target: 'bandits', required: 3 }],
      rewards: { xp: 200, gold: 100, npcRelationship: { npcId: 'npc_guard_brakken', amount: 5 } },
    }],
  },
  {
    id: 'side_harvest_festival', title: 'Harvest Festival', description: 'Help prepare for the seasonal harvest festival.',
    category: 'side', requirements: {},
    stages: [{
      id: 'side_harvest_1', title: 'Festival Preparations', description: 'Gather supplies for the festival.',
      narrativeText: 'Dara wipes her brow and smiles. "The harvest festival is coming! We need extra food and decorations. Can you help?"',
      objectives: [
        { id: 'shf_food', type: 'collect', description: 'Collect food', target: 'food', required: 100 },
        { id: 'shf_wood', type: 'collect', description: 'Collect wood for decorations', target: 'wood', required: 50 },
      ],
      rewards: { xp: 120, npcRelationship: { npcId: 'npc_farmer_dara', amount: 5 } },
    }],
  },
  {
    id: 'side_lost_texts', title: 'Lost Texts Recovery', description: 'Help Cyrus find missing library texts.',
    category: 'side', requirements: { prerequisiteQuests: ['main_ch4'] },
    stages: [{
      id: 'side_lost_texts_1', title: 'Find the Texts', description: 'Search for missing texts in expedition sites.',
      narrativeText: 'Cyrus adjusts his spectacles nervously. "Several important texts are missing from the archives. I believe they were taken during an expedition years ago. Can you search the known sites?"',
      objectives: [{ id: 'slt_find', type: 'explore', description: 'Search expedition sites for texts', target: 'lost_texts', required: 3 }],
      rewards: { xp: 180, loreEntryIds: ['lore_alchemy_revolution'], npcRelationship: { npcId: 'npc_librarian_cyrus', amount: 5 } },
    }],
  },
  {
    id: 'side_beast_hunt', title: 'Great Beast Hunt', description: 'Track and defeat a dangerous creature.',
    category: 'side', requirements: { guildLevel: 5 },
    stages: [{
      id: 'side_beast_1', title: 'The Hunt', description: 'Track and defeat the creature reported by Fenris.',
      narrativeText: 'Fenris speaks quietly: "Something big moved through the eastern woods last night. Not a shadow beast — something worse. I tracked it to a cave. Too dangerous for me alone."',
      objectives: [{ id: 'sbh_defeat', type: 'defeat', description: 'Defeat the Great Beast', target: 'great_beast', required: 1 }],
      rewards: { xp: 300, gold: 150, items: ['beast_trophy'], npcRelationship: { npcId: 'npc_hunter_fenris', amount: 8 } },
    }],
  },
  {
    id: 'side_trade_route', title: 'New Trade Route', description: 'Establish a new trade route with Silva\'s help.',
    category: 'side', requirements: { guildLevel: 4 },
    stages: [{
      id: 'side_trade_1', title: 'Scout the Route', description: 'Find a safe path for the new trade route.',
      narrativeText: 'Silva rubs her hands together gleefully. "There\'s a faster route to the eastern markets — if we can clear the path. Safer too. Want to help me pioneer it?"',
      objectives: [
        { id: 'str_scout', type: 'explore', description: 'Scout the new route', target: 'eastern_route', required: 1 },
        { id: 'str_clear', type: 'defeat', description: 'Clear threats from the path', target: 'route_threats', required: 3 },
      ],
      rewards: { xp: 250, gold: 200, npcRelationship: { npcId: 'npc_merchant_silva', amount: 5 } },
    }],
  },
  {
    id: 'side_temple_research', title: 'Temple Mysteries', description: 'Research ancient temple inscriptions.',
    category: 'side', requirements: { prerequisiteQuests: ['main_ch4'] },
    stages: [{
      id: 'side_temple_1', title: 'Decipher the Inscriptions', description: 'Study temple walls for hidden knowledge.',
      narrativeText: 'Father Aldric leads you to a wall covered in faded symbols. "These inscriptions predate the temple itself. I believe they are a prophecy — but I cannot read the old script."',
      objectives: [{ id: 'stm_research', type: 'research', description: 'Research temple inscriptions', target: 'temple_inscriptions', required: 1 }],
      rewards: { xp: 200, loreEntryIds: ['myth_four_guardians'], unlocksProphecyId: 'prophecy_guardian_return', npcRelationship: { npcId: 'npc_priest_aldric', amount: 5 } },
    }],
  },
  {
    id: 'side_prophecy_hunt', title: 'Fragments of Prophecy', description: 'Collect prophecy fragments from various sources.',
    category: 'side', requirements: { prerequisiteQuests: ['main_ch5'] },
    stages: [{
      id: 'side_prophecy_1', title: 'Gather Fragments', description: 'Find scattered prophecy fragments.',
      narrativeText: 'Zahara closes her eyes. "The prophecies were not written in one place. They are scattered — in temples, ruins, and the minds of the old. Find me three fragments, and I can piece together the whole."',
      objectives: [{ id: 'sph_collect', type: 'collect', description: 'Find prophecy fragments', target: 'prophecy_fragment', required: 3 }],
      rewards: { xp: 300, loreEntryIds: ['myth_eclipse_prophecy'], npcRelationship: { npcId: 'npc_mystic_zahara', amount: 8 } },
    }],
  },
  {
    id: 'side_tavern_trouble', title: 'Tavern Trouble', description: 'Help Rosa deal with a rowdy patron problem.',
    category: 'side', requirements: {},
    stages: [{
      id: 'side_tavern_1', title: 'Settle the Dispute', description: 'Handle the troublemakers in the tavern.',
      narrativeText: 'Rosa wrings her hands. "Those mercenaries are back. They\'re scaring off my regulars. Could you... have a word with them? A firm word, preferably."',
      objectives: [{ id: 'stt_talk', type: 'talk', description: 'Confront the mercenaries', target: 'mercenaries', required: 1 }],
      rewards: { xp: 80, gold: 30, npcRelationship: { npcId: 'npc_tavern_keeper_rosa', amount: 5 } },
    }],
  },
  {
    id: 'side_ancient_ruin', title: 'The Ancient Ruin', description: 'Investigate the ruin Lira found in the forest.',
    category: 'side', requirements: { prerequisiteQuests: ['main_ch2'] },
    stages: [{
      id: 'side_ruin_1', title: 'Explore the Ruin', description: 'Investigate the mysterious ruin.',
      narrativeText: 'Lira leads you to a moss-covered entrance half-hidden by vines. "The symbols glow brighter at night. I didn\'t go inside alone — seemed like a bad idea."',
      objectives: [{ id: 'sar_explore', type: 'explore', description: 'Explore the ancient ruin', target: 'ancient_ruin', required: 1 }],
      rewards: { xp: 200, loreEntryIds: ['lore_sunken_ruins'], npcRelationship: { npcId: 'npc_scout_lira', amount: 5 } },
    }],
  },
  {
    id: 'side_crystal_harvest', title: 'Crystal Harvest', description: 'Harvest rare crystals from the caverns.',
    category: 'side', requirements: { guildLevel: 3 },
    stages: [{
      id: 'side_crystal_1', title: 'Harvest Crystals', description: 'Carefully extract crystals from the formation.',
      narrativeText: 'Lira marks a spot on the map. "Right here — a crystal formation the likes of which I\'ve never seen. But the cavern is unstable. We need skilled miners and a careful approach."',
      objectives: [{ id: 'sch_collect', type: 'collect', description: 'Harvest essence crystals', target: 'essence_crystal', required: 5 }],
      rewards: { xp: 250, gold: 150, items: ['pure_crystal'] },
    }],
  },
  {
    id: 'side_alliance_mission', title: 'Diplomatic Mission', description: 'Strengthen ties with a neighboring guild.',
    category: 'side', requirements: { prerequisiteQuests: ['main_ch6'] },
    stages: [{
      id: 'side_alliance_1', title: 'Deliver the Treaty', description: 'Bring the alliance treaty to the neighboring guild.',
      narrativeText: 'Elara hands you a sealed scroll. "This treaty could secure our eastern border. Deliver it personally — these things require a guild leader\'s authority."',
      objectives: [{ id: 'sam_deliver', type: 'deliver', description: 'Deliver the alliance treaty', target: 'alliance_treaty', required: 1 }],
      rewards: { xp: 200, gold: 100, npcRelationship: { npcId: 'npc_diplomat_elara', amount: 5 } },
    }],
  },
  {
    id: 'side_lost_ballad', title: 'The Lost Ballad', description: 'Help Finn recover a legendary lost song.',
    category: 'side', requirements: {},
    stages: [{
      id: 'side_ballad_1', title: 'Find the Ballad', description: 'Search for the original manuscript of the Lost Ballad.',
      narrativeText: 'Finn strums a melancholy chord. "There was a song — the Ballad of Torvald. The original lyrics are lost, but I believe a copy exists in the ruins of the old guild hall."',
      objectives: [{ id: 'slb_find', type: 'explore', description: 'Find the ballad manuscript', target: 'ballad_manuscript', required: 1 }],
      rewards: { xp: 120, loreEntryIds: ['lore_torvald'], npcRelationship: { npcId: 'npc_bard_finn', amount: 8 } },
    }],
  },
  {
    id: 'side_mine_expansion', title: 'Mine Expansion', description: 'Help Torgen expand the mine to new depths.',
    category: 'side', requirements: { guildLevel: 4 },
    stages: [{
      id: 'side_mine_1', title: 'Expand the Mine', description: 'Clear and reinforce a new mine level.',
      narrativeText: 'Torgen surveys the rock face. "There\'s a rich vein below, I can feel it. But we need timber, workers, and someone to clear the creatures nesting in the new shaft."',
      objectives: [
        { id: 'sme_wood', type: 'collect', description: 'Deliver timber', target: 'wood', required: 100 },
        { id: 'sme_clear', type: 'defeat', description: 'Clear creatures from the shaft', target: 'mine_creatures', required: 5 },
      ],
      rewards: { xp: 200, gold: 100, npcRelationship: { npcId: 'npc_miner_torgen', amount: 5 } },
    }],
  },
  {
    id: 'side_pest_control', title: 'Pest Control', description: 'Deal with pests threatening the farms.',
    category: 'side', requirements: {},
    stages: [{
      id: 'side_pest_1', title: 'Eliminate Pests', description: 'Remove the pests from the farm fields.',
      narrativeText: 'Dara points to chewed stalks. "Iron beetles have gotten into the wheat fields again. If we don\'t stop them, we\'ll lose the whole harvest."',
      objectives: [{ id: 'spc_defeat', type: 'defeat', description: 'Eliminate iron beetles', target: 'iron_beetle', required: 10 }],
      rewards: { xp: 80, npcRelationship: { npcId: 'npc_farmer_dara', amount: 3 } },
    }],
  },
  {
    id: 'side_defense_drill', title: 'Defense Drill', description: 'Run a defense drill to improve guild readiness.',
    category: 'side', requirements: { guildLevel: 3 },
    stages: [{
      id: 'side_defense_1', title: 'Complete the Drill', description: 'Coordinate a full defense drill.',
      narrativeText: 'Captain Brakken crosses his arms. "Your defenses are sloppy. Let me run a drill — if your people survive it, they\'ll be ready for anything."',
      objectives: [
        { id: 'sdd_train', type: 'collect', description: 'Train defenders', target: 'defender_training', required: 3 },
        { id: 'sdd_build', type: 'build', description: 'Build a watchtower', target: 'watchtower', required: 1 },
      ],
      rewards: { xp: 150, npcRelationship: { npcId: 'npc_guard_brakken', amount: 5 } },
    }],
  },
  {
    id: 'side_essence_experiment', title: 'Essence Experiment', description: 'Assist in a dangerous essence experiment.',
    category: 'side', requirements: { prerequisiteQuests: ['main_ch4'] },
    stages: [{
      id: 'side_essence_1', title: 'The Experiment', description: 'Help Yira conduct a volatile essence experiment.',
      narrativeText: 'Yira\'s eyes gleam with scientific fervor. "I\'ve theorized that combining three types of essence in precise ratios could create a stable compound. I just need supplies and... someone to stand behind the blast shield."',
      objectives: [{ id: 'see_essence', type: 'collect', description: 'Gather essence samples', target: 'essence', required: 50 }],
      rewards: { xp: 200, items: ['stabilized_essence'], npcRelationship: { npcId: 'npc_alchemist_yira', amount: 5 } },
    }],
  },
  {
    id: 'side_trade_negotiation', title: 'Trade Negotiation', description: 'Negotiate better trade terms.',
    category: 'side', requirements: { guildLevel: 5 },
    stages: [{
      id: 'side_trade_neg_1', title: 'Negotiate', description: 'Accompany Elara to a trade negotiation.',
      narrativeText: 'Elara studies her notes. "The eastern consortium is offering bulk pricing if we commit to regular shipments. It\'s a good deal, but they always hide traps in the fine print. I need your authority at the table."',
      objectives: [{ id: 'stn_negotiate', type: 'talk', description: 'Complete negotiation', target: 'trade_negotiation', required: 1 }],
      rewards: { xp: 200, gold: 300, npcRelationship: { npcId: 'npc_diplomat_elara', amount: 5 } },
    }],
  },
  {
    id: 'side_codex_completion', title: 'Complete the Codex', description: 'Help Cyrus complete his reference codex.',
    category: 'side', requirements: { prerequisiteQuests: ['main_ch4'], requiredLore: ['lore_founding', 'lore_crystal_war'] },
    stages: [{
      id: 'side_codex_1', title: 'Fill the Gaps', description: 'Find missing information for the codex.',
      narrativeText: 'Cyrus spreads a partially filled manuscript across the table. "My codex of world knowledge is nearly complete — but there are gaps. I need lore from three different regions to fill them."',
      objectives: [{ id: 'scc_discover', type: 'discover', description: 'Discover region-specific lore', target: 'region_lore', required: 3 }],
      rewards: { xp: 300, gold: 100, title: 'Scholar\'s Friend', npcRelationship: { npcId: 'npc_librarian_cyrus', amount: 10 } },
    }],
  },
];

// ── Hero story arcs ──
export const HERO_STORY_ARCS: QuestLine[] = [
  {
    id: 'hero_story_defender', title: 'The Defender\'s Oath', description: 'A defender hero confronts their past and reaffirms their purpose.',
    category: 'hero_story', heroRole: 'defender', heroLevelTriggers: [3, 5, 8, 10],
    requirements: {},
    stages: [
      {
        id: 'hsd_1', title: 'The First Test', description: 'A crisis tests the defender\'s resolve.',
        narrativeText: 'Your defender stares at the horizon. "I became a defender because I failed to protect someone once. I won\'t fail again."',
        objectives: [{ id: 'hsd1_defend', type: 'defeat', description: 'Defend the guild from an attack', target: 'defense_event', required: 1 }],
        rewards: { xp: 150 },
      },
      {
        id: 'hsd_2', title: 'Echoes of the Past', description: 'The defender revisits the place of their failure.',
        narrativeText: 'The defender stops at a ruined village. "This is where it happened. This is where I failed." They kneel among the stones, then stand with new determination.',
        objectives: [{ id: 'hsd2_explore', type: 'explore', description: 'Visit the ruined village', target: 'ruined_village', required: 1 }],
        rewards: { xp: 200, loreEntryIds: ['lore_hero_tradition'] },
      },
      {
        id: 'hsd_3', title: 'The Shield Unbroken', description: 'Prove that no shield is stronger than the will behind it.',
        narrativeText: 'The defender forges a new shield from the rubble of the old village. "What was broken can be made whole. What was lost can be remembered."',
        objectives: [{ id: 'hsd3_craft', type: 'collect', description: 'Forge the Remembrance Shield', target: 'remembrance_shield_materials', required: 1 }],
        rewards: { xp: 300, items: ['remembrance_shield'] },
      },
      {
        id: 'hsd_4', title: 'The Oath Renewed', description: 'The defender takes a new oath before the guild.',
        narrativeText: '"I swear to defend this guild and all who shelter within it, with my life if needed, until my last breath." The words echo through the hall, and everyone knows they are true.',
        objectives: [{ id: 'hsd4_oath', type: 'talk', description: 'Witness the oath ceremony', target: 'oath_ceremony', required: 1 }],
        rewards: { xp: 500, title: 'Oath-Keeper' },
      },
    ],
    completionReward: { xp: 1000, title: 'Shield of the Realm', items: ['legendary_defender_armor'] },
  },
  {
    id: 'hero_story_scout', title: 'The Scout\'s Horizon', description: 'A scout hero discovers something that changes everything.',
    category: 'hero_story', heroRole: 'scout', heroLevelTriggers: [3, 5, 8, 10],
    requirements: {},
    stages: [
      {
        id: 'hss_1', title: 'Beyond the Map', description: 'The scout finds something the maps don\'t show.',
        narrativeText: 'Your scout returns from a routine patrol with wide eyes. "There\'s something out there. Something the maps don\'t show. I need to go back."',
        objectives: [{ id: 'hss1_explore', type: 'explore', description: 'Explore the unmapped area', target: 'unmapped_area', required: 1 }],
        rewards: { xp: 150 },
      },
      {
        id: 'hss_2', title: 'The Hidden Path', description: 'Follow the trail to its source.',
        narrativeText: 'The scout traces strange markings on the trees. "Someone — or something — has been leaving a trail. It wants to be followed."',
        objectives: [{ id: 'hss2_follow', type: 'explore', description: 'Follow the trail markers', target: 'trail_markers', required: 5 }],
        rewards: { xp: 200 },
      },
      {
        id: 'hss_3', title: 'What Was Found', description: 'The discovery changes the scout forever.',
        narrativeText: 'At the trail\'s end, the scout finds an ancient waystation — perfectly preserved, with maps of routes that no longer exist. Or do they?',
        objectives: [{ id: 'hss3_discover', type: 'discover', description: 'Catalog the waystation', target: 'ancient_waystation', required: 1 }],
        rewards: { xp: 300, loreEntryIds: ['lore_merchant_road'] },
      },
      {
        id: 'hss_4', title: 'New Horizons', description: 'The scout opens a new chapter.',
        narrativeText: 'Using the ancient maps, the scout charts three new expedition routes. "There\'s so much more out there. We\'ve barely scratched the surface."',
        objectives: [{ id: 'hss4_chart', type: 'explore', description: 'Chart new expedition routes', target: 'new_routes', required: 3 }],
        rewards: { xp: 500, title: 'Pathfinder' },
      },
    ],
    completionReward: { xp: 1000, title: 'Master Pathfinder', items: ['ancient_compass_artifact'] },
  },
];

// ── Helper functions ──
export function getQuestLineById(id: string): QuestLine | undefined {
  if (MAIN_QUEST_LINE.id === id) return MAIN_QUEST_LINE;
  return SIDE_QUESTS.find(q => q.id === id)
    ?? HERO_STORY_ARCS.find(q => q.id === id);
}

export function getAllQuestLines(): QuestLine[] {
  return [MAIN_QUEST_LINE, ...SIDE_QUESTS, ...HERO_STORY_ARCS];
}

export function getAvailableQuests(completedQuestIds: string[], guildLevel: number): QuestLine[] {
  return getAllQuestLines().filter(q => {
    if (completedQuestIds.includes(q.id)) return false;
    const req = q.requirements;
    if (req.guildLevel && guildLevel < req.guildLevel) return false;
    if (req.prerequisiteQuests) {
      for (const pre of req.prerequisiteQuests) {
        if (!completedQuestIds.includes(pre)) return false;
      }
    }
    return true;
  });
}
