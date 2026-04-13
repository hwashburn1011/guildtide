/**
 * NarrativeService — Central service for narrative systems.
 *
 * T-1323: Lore discovery system triggered by exploration and events
 * T-1326: Lore search and filter in codex
 * T-1327: Hidden pattern system — real-world data combinations unlock secrets
 * T-1328: 10 hidden patterns (e.g., full moon + rainstorm = hidden dungeon)
 * T-1329: Pattern discovery notification with dramatic reveal
 * T-1330: Pattern journal tracking discovered and hinted patterns
 * T-1331: Pattern hint system through NPC dialog and event text
 * T-1332: Pattern completion rewards (unique items, lore, achievements)
 * T-1337: NPC relationship tracking based on dialog choices
 * T-1345: Quest objective tracking with progress display
 * T-1346: Quest turn-in system with NPC dialog and reward screen
 * T-1349: Quest marker system on world map for active quests
 * T-1350: Quest notification for new quest availability
 * T-1351: World history timeline displaying major events
 * T-1352: Timeline discovery through quest completion and lore finds
 * T-1355: Prophecy revelation when conditions are met
 * T-1356: Prophecy display in Temple building
 * T-1358: Rumor accuracy variability
 * T-1359: Rumor log with verified/unverified status
 * T-1360: Narrative event narrator text for expedition encounters
 * T-1361: Narrative text variation system
 * T-1367: Mythology discovery through Temple research
 * T-1370: Lore completion percentage per region
 * T-1371: Narrative achievement system (complete all lore in category)
 * T-1373: NPC remembrance of past player choices in dialog
 * T-1375: Easter egg discovery system with obscure real-world data triggers
 * T-1376: Easter egg collection page
 * T-1377: Narrative recap summary when returning after absence
 * T-1380: Book discovery in expeditions and shops
 */

import {
  LORE_ENTRIES,
  PROPHECIES,
  BOOKS,
  getLoreByCategory,
  getLoreByRegion,
  getTimelineEntries,
  getBookById,
  getProphecyById,
} from '../data/loreEntries';
import type { LoreEntry, LoreCategory, Prophecy, BookDefinition } from '../data/loreEntries';
import {
  NPC_DEFINITIONS,
  getDialogTree,
  getNpcById,
  getRandomRumor,
  getWeatherDialog,
} from '../data/npcDefinitions';
import type { DialogNode, NpcDefinition } from '../data/npcDefinitions';
import {
  MAIN_QUEST_LINE,
  SIDE_QUESTS,
  HERO_STORY_ARCS,
  getQuestLineById,
  getAvailableQuests,
} from '../data/questLines';
import type { QuestLine, QuestStage } from '../data/questLines';

// ── Hidden Pattern definitions ──
export interface HiddenPattern {
  id: string;
  name: string;
  description: string;
  /** Conditions that must all be true simultaneously */
  conditions: Array<{ type: 'weather' | 'moon_phase' | 'season' | 'time_of_day' | 'data_metric' | 'resource_threshold' | 'building_count'; value: string }>;
  /** Hint text shown before discovery */
  hintText: string;
  /** Dramatic reveal text on discovery */
  revealText: string;
  rewards: { xp: number; gold?: number; items?: string[]; loreEntryId?: string; achievementId?: string };
  /** Is this an Easter egg? */
  isEasterEgg?: boolean;
}

// T-1328: 10 hidden patterns
const HIDDEN_PATTERNS: HiddenPattern[] = [
  {
    id: 'pattern_moonrain_dungeon',
    name: 'The Moonlit Passage',
    description: 'A hidden dungeon entrance appears when moonlight combines with rainfall.',
    conditions: [{ type: 'moon_phase', value: 'full' }, { type: 'weather', value: 'rain' }],
    hintText: 'Old tales speak of a door that opens when the full moon weeps...',
    revealText: 'The rain catches the moonlight, and where droplets strike the ancient stone, a doorway shimmers into existence. A hidden dungeon awaits!',
    rewards: { xp: 500, items: ['moonstone_key'], loreEntryId: 'lore_wandering_market' },
  },
  {
    id: 'pattern_storm_forge',
    name: 'Lightning-Tempered Steel',
    description: 'Forging during a thunderstorm produces exceptional weapons.',
    conditions: [{ type: 'weather', value: 'storm' }, { type: 'building_count', value: 'forge:1' }],
    hintText: 'Kael mutters about the old smiths who only forged during storms...',
    revealText: 'Lightning strikes the forge! The essence-charged air infuses the metal with extraordinary power. Your blacksmith has produced a masterwork!',
    rewards: { xp: 300, items: ['stormforged_blade'] },
  },
  {
    id: 'pattern_harvest_moon',
    name: 'The Abundant Harvest',
    description: 'Harvesting under a harvest moon yields triple the normal crop.',
    conditions: [{ type: 'moon_phase', value: 'full' }, { type: 'season', value: 'autumn' }],
    hintText: 'Dara says the old farmers planted by the moon. Perhaps there is wisdom in it...',
    revealText: 'The harvest moon bathes the fields in golden light. Crops ripen before your eyes — triple the normal yield! The old ways hold true.',
    rewards: { xp: 200, gold: 300 },
  },
  {
    id: 'pattern_winter_solstice',
    name: 'The Solstice Revelation',
    description: 'The winter solstice reveals hidden lore in the library.',
    conditions: [{ type: 'season', value: 'winter' }, { type: 'time_of_day', value: 'night' }, { type: 'building_count', value: 'library:1' }],
    hintText: 'Cyrus noticed that certain books glow faintly during the longest night...',
    revealText: 'As the longest night deepens, hidden ink appears on the library\'s oldest pages. Ancient knowledge, visible only on the winter solstice, reveals itself!',
    rewards: { xp: 400, loreEntryId: 'myth_creation' },
  },
  {
    id: 'pattern_fog_spirits',
    name: 'The Fog Communion',
    description: 'During fog, the temple connects with ancestral spirits.',
    conditions: [{ type: 'weather', value: 'fog' }, { type: 'building_count', value: 'temple:1' }],
    hintText: 'Father Aldric says the veil between worlds thins when fog rolls in...',
    revealText: 'Ghostly figures materialize in the temple fog. The spirits of fallen heroes speak, sharing wisdom from beyond the veil. A prophecy is revealed!',
    rewards: { xp: 300, loreEntryId: 'myth_underworld' },
  },
  {
    id: 'pattern_eclipse_surge',
    name: 'The Essence Surge',
    description: 'A solar eclipse causes essence production to spike massively.',
    conditions: [{ type: 'data_metric', value: 'solar_eclipse:true' }],
    hintText: 'Zahara speaks of eclipses as moments when essence barriers weaken...',
    revealText: 'The sky darkens as the eclipse begins. Essence erupts from the earth — mines, wells, and even the air itself crackles with power. Your reserves overflow!',
    rewards: { xp: 500, gold: 500, loreEntryId: 'lore_eclipse_555' },
  },
  {
    id: 'pattern_trade_winds',
    name: 'The Trade Winds',
    description: 'Strong winds combined with high market activity summon the traveling merchant.',
    conditions: [{ type: 'weather', value: 'wind' }, { type: 'data_metric', value: 'market_activity:high' }],
    hintText: 'Silva says the trade winds carry merchants to where gold flows freely...',
    revealText: 'A strong gust carries the sound of cart wheels. Silva appears at the gate with her most exotic wares yet — drawn by the winds of commerce!',
    rewards: { xp: 200, gold: 100 },
  },
  {
    id: 'pattern_starfall_discovery',
    name: 'The Starfall Cache',
    description: 'Clear skies during a meteor shower reveal a hidden cache.',
    conditions: [{ type: 'weather', value: 'sunny' }, { type: 'data_metric', value: 'meteor_shower:true' }],
    hintText: 'Legends say that stars sometimes fall to earth carrying gifts from the Guardians...',
    revealText: 'A meteor streaks across the clear sky and impacts near your guild! In the crater, a cache of star-metal and crystallized essence glitters in the starlight.',
    rewards: { xp: 400, items: ['star_metal_ingot', 'crystallized_essence'] },
  },
  {
    id: 'pattern_blood_moon_beasts',
    name: 'The Blood Moon Hunt',
    description: 'During a blood moon, rare creatures emerge that drop legendary materials.',
    conditions: [{ type: 'moon_phase', value: 'blood' }, { type: 'time_of_day', value: 'night' }],
    hintText: 'Fenris sharpens his blade when the moon turns red. He knows what comes...',
    revealText: 'The moon turns crimson. From the shadows emerge beasts of legend — terrifying, but their hides and bones are worth a fortune to the right craftsman.',
    rewards: { xp: 350, items: ['blood_moon_hide'] },
  },
  {
    id: 'pattern_spring_awakening',
    name: 'The Spring Awakening',
    description: 'The first day of spring with rain causes all resources to regenerate rapidly.',
    conditions: [{ type: 'season', value: 'spring' }, { type: 'weather', value: 'rain' }],
    hintText: 'The old saying goes: "Spring rain on new growth, and the earth gives tenfold."',
    revealText: 'The first spring rain falls, and the land responds with explosive growth. Trees sprout new branches, mines glitter with fresh veins, and the river runs high with clean water.',
    rewards: { xp: 250, gold: 200 },
  },
];

// T-1375: Easter egg patterns
const EASTER_EGG_PATTERNS: HiddenPattern[] = [
  {
    id: 'easter_pi_day',
    name: 'The Irrational Harvest',
    description: 'Something mathematical happens on March 14th.',
    conditions: [{ type: 'data_metric', value: 'date_month_day:3_14' }],
    hintText: 'Numbers have power. Some say the ratio of a circle holds a secret...',
    revealText: 'It\'s Pi Day! The essence flows in circular patterns, and your resources multiply by 3.14 for the day. The universe appreciates good math.',
    rewards: { xp: 314, gold: 314 },
    isEasterEgg: true,
  },
  {
    id: 'easter_friday_13',
    name: 'The Unlucky Fortune',
    description: 'Friday the 13th brings surprisingly good luck.',
    conditions: [{ type: 'data_metric', value: 'friday_13:true' }],
    hintText: 'Bad luck is just good luck in disguise, if you know where to look...',
    revealText: 'Friday the 13th! Everyone expected disaster, but the opposite occurred — essence surges, markets boom, and a rare treasure appears in the guild vault.',
    rewards: { xp: 130, gold: 1300, items: ['lucky_charm'] },
    isEasterEgg: true,
  },
  {
    id: 'easter_answer_42',
    name: 'The Answer',
    description: 'Having exactly 42 of any resource triggers a cosmic event.',
    conditions: [{ type: 'resource_threshold', value: 'any:42' }],
    hintText: 'What is the answer to life, the universe, and everything?',
    revealText: 'You have exactly 42 of a resource. The universe trembles at your precision. A deep voice intones: "The answer is correct." A mysterious reward appears.',
    rewards: { xp: 420, items: ['towel_of_wisdom'] },
    isEasterEgg: true,
  },
];

// ── Narrative text variations ──
// T-1360, T-1361: Multiple descriptions for same event types
const EXPEDITION_NARRATOR_TEXTS: Record<string, string[]> = {
  encounter_start: [
    'The party rounds a bend in the trail and finds themselves face to face with danger.',
    'A shadow moves in the undergrowth. Before anyone can react, the encounter begins.',
    'The scout raises a hand — halt. Ahead, something stirs.',
    'The air changes. Every hero tenses. They know what\'s coming.',
  ],
  victory: [
    'The last foe falls. Silence returns to the trail, broken only by heavy breathing.',
    'It is done. The heroes stand victorious, battered but unbroken.',
    'Steel returns to sheaths. The danger has passed — for now.',
    'A cheer erupts from the party. Another challenge overcome.',
  ],
  defeat: [
    'The retreat is hasty but necessary. Not every battle can be won.',
    'Wounded pride and wounded bodies. The party falls back to regroup.',
    'Sometimes wisdom is knowing when to withdraw. Today was that day.',
  ],
  discovery: [
    'Among the debris, something catches the light. A discovery!',
    'Hidden in plain sight — how many have passed this spot without noticing?',
    'The scout\'s trained eye spots what others would miss.',
    'Fortune favors the observant. A rare find emerges from the shadows.',
  ],
  camp: [
    'The party makes camp as the sun dips below the horizon. Stories are shared around the fire.',
    'A brief rest. The fire crackles, and for a moment, the expedition feels almost peaceful.',
    'They eat in silence, each hero lost in thought about what lies ahead.',
  ],
};

// ── Player narrative state (in-memory, persisted via routes) ──
export interface NarrativeState {
  discoveredLoreIds: string[];
  completedQuestIds: string[];
  activeQuestProgress: Record<string, Record<string, number>>; // questId -> objectiveId -> progress
  npcRelationships: Record<string, number>; // npcId -> relationship level
  npcDialogHistory: Record<string, string[]>; // npcId -> visited node IDs
  discoveredPatternIds: string[];
  discoveredEasterEggIds: string[];
  hintedPatternIds: string[];
  rumorLog: Array<{ text: string; accuracy: number; verified: boolean; npcId: string; timestamp: number }>;
  revealedProphecyIds: string[];
  ownedBookIds: string[];
  readBookIds: string[];
  timelineDiscoveredYears: number[];
  narrativeAchievements: string[];
  lastLoginTimestamp: number;
}

function createDefaultNarrativeState(): NarrativeState {
  return {
    discoveredLoreIds: [],
    completedQuestIds: [],
    activeQuestProgress: {},
    npcRelationships: {},
    npcDialogHistory: {},
    discoveredPatternIds: [],
    discoveredEasterEggIds: [],
    hintedPatternIds: [],
    rumorLog: [],
    revealedProphecyIds: [],
    ownedBookIds: [],
    readBookIds: [],
    timelineDiscoveredYears: [],
    narrativeAchievements: [],
    lastLoginTimestamp: Date.now(),
  };
}

// ── Service ──
export class NarrativeService {
  // T-1323: Discover lore
  static discoverLore(state: NarrativeState, loreId: string): { entry: LoreEntry | undefined; isNew: boolean } {
    const entry = LORE_ENTRIES.find(l => l.id === loreId);
    if (!entry) return { entry: undefined, isNew: false };
    if (state.discoveredLoreIds.includes(loreId)) return { entry, isNew: false };
    state.discoveredLoreIds.push(loreId);
    // T-1352: Timeline discovery
    if (entry.isTimelineEvent && entry.timelineYear !== undefined) {
      if (!state.timelineDiscoveredYears.includes(entry.timelineYear)) {
        state.timelineDiscoveredYears.push(entry.timelineYear);
        state.timelineDiscoveredYears.sort((a, b) => a - b);
      }
    }
    // T-1371: Check narrative achievements
    NarrativeService.checkNarrativeAchievements(state);
    return { entry, isNew: true };
  }

  // T-1326: Search and filter lore
  static searchLore(
    state: NarrativeState,
    opts: { category?: LoreCategory; regionId?: string; search?: string; discoveredOnly?: boolean },
  ): LoreEntry[] {
    let entries = [...LORE_ENTRIES];
    if (opts.discoveredOnly) {
      entries = entries.filter(e => state.discoveredLoreIds.includes(e.id));
    }
    if (opts.category) {
      entries = entries.filter(e => e.category === opts.category);
    }
    if (opts.regionId) {
      entries = entries.filter(e => e.regionId === opts.regionId || !e.regionId);
    }
    if (opts.search) {
      const lower = opts.search.toLowerCase();
      entries = entries.filter(e =>
        e.title.toLowerCase().includes(lower) || e.text.toLowerCase().includes(lower),
      );
    }
    return entries;
  }

  // T-1370: Lore completion percentage per region
  static getLoreCompletion(state: NarrativeState): {
    total: { discovered: number; total: number; percent: number };
    byCategory: Record<string, { discovered: number; total: number; percent: number }>;
    byRegion: Record<string, { discovered: number; total: number; percent: number }>;
  } {
    const total = LORE_ENTRIES.length;
    const discovered = state.discoveredLoreIds.length;
    const categories: LoreCategory[] = ['history', 'creatures', 'places', 'people', 'mythology', 'prophecy'];
    const byCategory: Record<string, { discovered: number; total: number; percent: number }> = {};
    for (const cat of categories) {
      const catEntries = getLoreByCategory(cat);
      const catDiscovered = catEntries.filter(e => state.discoveredLoreIds.includes(e.id)).length;
      byCategory[cat] = { discovered: catDiscovered, total: catEntries.length, percent: catEntries.length > 0 ? Math.round((catDiscovered / catEntries.length) * 100) : 0 };
    }
    const regions = [...new Set(LORE_ENTRIES.filter(l => l.regionId).map(l => l.regionId!))];
    const byRegion: Record<string, { discovered: number; total: number; percent: number }> = {};
    for (const reg of regions) {
      const regEntries = getLoreByRegion(reg);
      const regDiscovered = regEntries.filter(e => state.discoveredLoreIds.includes(e.id)).length;
      byRegion[reg] = { discovered: regDiscovered, total: regEntries.length, percent: regEntries.length > 0 ? Math.round((regDiscovered / regEntries.length) * 100) : 0 };
    }
    return {
      total: { discovered, total, percent: total > 0 ? Math.round((discovered / total) * 100) : 0 },
      byCategory,
      byRegion,
    };
  }

  // T-1327, T-1328, T-1329: Hidden pattern check
  static checkPatterns(
    state: NarrativeState,
    currentConditions: Record<string, string>,
  ): HiddenPattern[] {
    const allPatterns = [...HIDDEN_PATTERNS, ...EASTER_EGG_PATTERNS];
    const newlyDiscovered: HiddenPattern[] = [];
    for (const pattern of allPatterns) {
      const alreadyFound = pattern.isEasterEgg
        ? state.discoveredEasterEggIds.includes(pattern.id)
        : state.discoveredPatternIds.includes(pattern.id);
      if (alreadyFound) continue;
      const allMet = pattern.conditions.every(cond => {
        const key = `${cond.type}:${cond.value}`;
        // Check if any current condition matches
        return currentConditions[cond.type] === cond.value
          || currentConditions[key] === 'true'
          || currentConditions[cond.type]?.includes(cond.value);
      });
      if (allMet) {
        newlyDiscovered.push(pattern);
        if (pattern.isEasterEgg) {
          state.discoveredEasterEggIds.push(pattern.id);
        } else {
          state.discoveredPatternIds.push(pattern.id);
        }
        if (pattern.rewards.loreEntryId) {
          NarrativeService.discoverLore(state, pattern.rewards.loreEntryId);
        }
      }
    }
    return newlyDiscovered;
  }

  // T-1330: Pattern journal
  static getPatternJournal(state: NarrativeState): {
    discovered: HiddenPattern[];
    hinted: Array<{ id: string; hintText: string }>;
    easterEggs: HiddenPattern[];
  } {
    const allPatterns = HIDDEN_PATTERNS;
    return {
      discovered: allPatterns.filter(p => state.discoveredPatternIds.includes(p.id)),
      hinted: allPatterns
        .filter(p => state.hintedPatternIds.includes(p.id) && !state.discoveredPatternIds.includes(p.id))
        .map(p => ({ id: p.id, hintText: p.hintText })),
      easterEggs: EASTER_EGG_PATTERNS.filter(p => state.discoveredEasterEggIds.includes(p.id)),
    };
  }

  // T-1331: Deliver a pattern hint
  static deliverPatternHint(state: NarrativeState): string | undefined {
    const unhinted = HIDDEN_PATTERNS.filter(
      p => !state.hintedPatternIds.includes(p.id) && !state.discoveredPatternIds.includes(p.id),
    );
    if (unhinted.length === 0) return undefined;
    const pattern = unhinted[Math.floor(Math.random() * unhinted.length)];
    state.hintedPatternIds.push(pattern.id);
    return pattern.hintText;
  }

  // T-1337: NPC relationship
  static modifyNpcRelationship(state: NarrativeState, npcId: string, amount: number): number {
    if (!state.npcRelationships[npcId]) state.npcRelationships[npcId] = 0;
    state.npcRelationships[npcId] = Math.max(0, Math.min(100, state.npcRelationships[npcId] + amount));
    return state.npcRelationships[npcId];
  }

  // T-1338: Gift system
  static giveGift(state: NarrativeState, npcId: string, resource: string, amount: number): {
    accepted: boolean;
    thankText: string;
    relationshipGain: number;
  } {
    const npc = getNpcById(npcId);
    if (!npc) return { accepted: false, thankText: '', relationshipGain: 0 };
    const pref = npc.giftPreferences.find(p => p.resource === resource);
    if (!pref) {
      return { accepted: true, thankText: 'Oh, thank you. That\'s... nice.', relationshipGain: 1 };
    }
    const gain = Math.round(pref.bonusPerUnit * amount);
    NarrativeService.modifyNpcRelationship(state, npcId, gain);
    return { accepted: true, thankText: pref.thankText, relationshipGain: gain };
  }

  // T-1373: Track dialog choices
  static recordDialogChoice(state: NarrativeState, npcId: string, nodeId: string): void {
    if (!state.npcDialogHistory[npcId]) state.npcDialogHistory[npcId] = [];
    if (!state.npcDialogHistory[npcId].includes(nodeId)) {
      state.npcDialogHistory[npcId].push(nodeId);
    }
  }

  // T-1333-1335: Get dialog for NPC
  static getNpcDialog(
    state: NarrativeState,
    npcId: string,
    nodeId?: string,
  ): DialogNode | undefined {
    const npc = getNpcById(npcId);
    if (!npc) return undefined;
    const tree = getDialogTree(npc.dialogTreeId);
    if (!tree) return undefined;
    const history = state.npcDialogHistory[npcId] || [];
    const isFirstMeeting = history.length === 0;
    const targetNode = nodeId
      ?? (isFirstMeeting ? tree.firstMeetingNodeId : tree.defaultNodeId);
    const node = tree.nodes[targetNode];
    if (!node) return undefined;
    // Filter choices by relationship requirements
    const rel = state.npcRelationships[npcId] || 0;
    const filteredNode: DialogNode = {
      ...node,
      choices: node.choices.filter(c => !c.requiresRelationship || rel >= c.requiresRelationship),
    };
    return filteredNode;
  }

  // T-1345: Quest objective tracking
  static updateQuestProgress(
    state: NarrativeState,
    questId: string,
    objectiveId: string,
    progress: number,
  ): { completed: boolean; objectiveComplete: boolean } {
    if (!state.activeQuestProgress[questId]) state.activeQuestProgress[questId] = {};
    state.activeQuestProgress[questId][objectiveId] = progress;
    const quest = getQuestLineById(questId);
    if (!quest) return { completed: false, objectiveComplete: false };
    // Find the current stage
    const currentStage = NarrativeService.getCurrentStage(state, questId);
    if (!currentStage) return { completed: false, objectiveComplete: false };
    const objective = currentStage.objectives.find(o => o.id === objectiveId);
    const objectiveComplete = objective ? progress >= objective.required : false;
    const allComplete = currentStage.objectives.every(o =>
      (state.activeQuestProgress[questId][o.id] || 0) >= o.required,
    );
    return { completed: allComplete, objectiveComplete };
  }

  // Get current stage of a quest
  static getCurrentStage(state: NarrativeState, questId: string): QuestStage | undefined {
    const quest = getQuestLineById(questId);
    if (!quest) return undefined;
    for (const stage of quest.stages) {
      const stageComplete = stage.objectives.every(o =>
        (state.activeQuestProgress[questId]?.[o.id] || 0) >= o.required,
      );
      if (!stageComplete) return stage;
    }
    return undefined; // All stages complete
  }

  // T-1346: Turn in quest
  static turnInQuest(state: NarrativeState, questId: string): QuestStage['rewards'] | undefined {
    const quest = getQuestLineById(questId);
    if (!quest) return undefined;
    // Check all stages are complete
    const allDone = quest.stages.every(stage =>
      stage.objectives.every(o =>
        (state.activeQuestProgress[questId]?.[o.id] || 0) >= o.required,
      ),
    );
    if (!allDone) return undefined;
    state.completedQuestIds.push(questId);
    delete state.activeQuestProgress[questId];
    // Aggregate rewards
    const finalStage = quest.stages[quest.stages.length - 1];
    const rewards = { ...finalStage.rewards };
    // Discover any lore rewards
    if (rewards.loreEntryIds) {
      for (const lId of rewards.loreEntryIds) {
        NarrativeService.discoverLore(state, lId);
      }
    }
    if (rewards.npcRelationship) {
      NarrativeService.modifyNpcRelationship(state, rewards.npcRelationship.npcId, rewards.npcRelationship.amount);
    }
    // T-1355: Check prophecy revelations
    NarrativeService.checkProphecies(state);
    return rewards;
  }

  // T-1349: Quest markers
  static getQuestMarkers(state: NarrativeState): Array<{ questId: string; stageTitle: string; location: string; objectiveDescription: string }> {
    const markers: Array<{ questId: string; stageTitle: string; location: string; objectiveDescription: string }> = [];
    for (const questId of Object.keys(state.activeQuestProgress)) {
      const stage = NarrativeService.getCurrentStage(state, questId);
      if (!stage) continue;
      const incomplete = stage.objectives.find(o =>
        (state.activeQuestProgress[questId][o.id] || 0) < o.required,
      );
      if (incomplete) {
        markers.push({
          questId,
          stageTitle: stage.title,
          location: incomplete.target,
          objectiveDescription: incomplete.description,
        });
      }
    }
    return markers;
  }

  // T-1350: Available quests notification
  static getNewlyAvailableQuests(state: NarrativeState, guildLevel: number): QuestLine[] {
    return getAvailableQuests(state.completedQuestIds, guildLevel)
      .filter(q => !state.activeQuestProgress[q.id]);
  }

  // T-1351, T-1352: Timeline
  static getTimeline(state: NarrativeState): Array<{ year: number; title: string; text: string; discovered: boolean }> {
    return getTimelineEntries().map(entry => ({
      year: entry.timelineYear!,
      title: entry.title,
      text: state.discoveredLoreIds.includes(entry.id) ? entry.text : '???',
      discovered: state.discoveredLoreIds.includes(entry.id),
    }));
  }

  // T-1355: Prophecy check
  static checkProphecies(state: NarrativeState): Prophecy[] {
    const revealed: Prophecy[] = [];
    for (const prophecy of PROPHECIES) {
      if (state.revealedProphecyIds.includes(prophecy.id)) continue;
      const allMet = prophecy.revealConditions.every(cond => {
        if (cond.startsWith('quest_complete:')) {
          return state.completedQuestIds.includes(cond.replace('quest_complete:', ''));
        }
        if (cond.startsWith('lore_discovered:')) {
          return state.discoveredLoreIds.includes(cond.replace('lore_discovered:', ''));
        }
        return false;
      });
      if (allMet) {
        state.revealedProphecyIds.push(prophecy.id);
        revealed.push(prophecy);
        if (prophecy.rewards.loreEntryId) {
          NarrativeService.discoverLore(state, prophecy.rewards.loreEntryId);
        }
      }
    }
    return revealed;
  }

  // T-1356: Get prophecies for temple display
  static getProphecies(state: NarrativeState): Array<{
    id: string; title: string; text: string; revealed: boolean;
  }> {
    return PROPHECIES.map(p => ({
      id: p.id,
      title: p.title,
      text: state.revealedProphecyIds.includes(p.id) ? p.revealedText : p.crypticText,
      revealed: state.revealedProphecyIds.includes(p.id),
    }));
  }

  // T-1357-1359: Rumor system
  static hearRumor(state: NarrativeState, npcId: string): {
    text: string; accuracy: number; relatedLoreId?: string;
  } | undefined {
    const rumor = getRandomRumor(npcId);
    if (!rumor) return undefined;
    state.rumorLog.push({
      text: rumor.text,
      accuracy: rumor.accuracy,
      verified: false,
      npcId,
      timestamp: Date.now(),
    });
    return rumor;
  }

  static verifyRumor(state: NarrativeState, index: number): boolean {
    if (index < 0 || index >= state.rumorLog.length) return false;
    const rumor = state.rumorLog[index];
    const isTrue = Math.random() < rumor.accuracy;
    rumor.verified = true;
    return isTrue;
  }

  // T-1360, T-1361: Narrative text variation
  static getNarratorText(eventType: string): string {
    const texts = EXPEDITION_NARRATOR_TEXTS[eventType];
    if (!texts || texts.length === 0) return '';
    return texts[Math.floor(Math.random() * texts.length)];
  }

  // T-1367: Mythology through temple research
  static researchMythology(state: NarrativeState): LoreEntry | undefined {
    const mythEntries = getLoreByCategory('mythology');
    const undiscovered = mythEntries.filter(e => !state.discoveredLoreIds.includes(e.id));
    if (undiscovered.length === 0) return undefined;
    const entry = undiscovered[Math.floor(Math.random() * undiscovered.length)];
    NarrativeService.discoverLore(state, entry.id);
    return entry;
  }

  // T-1371: Narrative achievements
  static checkNarrativeAchievements(state: NarrativeState): string[] {
    const newAchievements: string[] = [];
    const categories: LoreCategory[] = ['history', 'creatures', 'places', 'people', 'mythology', 'prophecy'];
    for (const cat of categories) {
      const achievementId = `lore_complete_${cat}`;
      if (state.narrativeAchievements.includes(achievementId)) continue;
      const catEntries = getLoreByCategory(cat);
      const allDiscovered = catEntries.every(e => state.discoveredLoreIds.includes(e.id));
      if (allDiscovered && catEntries.length > 0) {
        state.narrativeAchievements.push(achievementId);
        newAchievements.push(achievementId);
      }
    }
    // All lore discovered
    if (!state.narrativeAchievements.includes('lore_complete_all')) {
      if (state.discoveredLoreIds.length >= LORE_ENTRIES.length) {
        state.narrativeAchievements.push('lore_complete_all');
        newAchievements.push('lore_complete_all');
      }
    }
    // All patterns discovered
    if (!state.narrativeAchievements.includes('patterns_complete_all')) {
      if (state.discoveredPatternIds.length >= HIDDEN_PATTERNS.length) {
        state.narrativeAchievements.push('patterns_complete_all');
        newAchievements.push('patterns_complete_all');
      }
    }
    // Main quest complete
    if (!state.narrativeAchievements.includes('main_quest_complete')) {
      if (state.completedQuestIds.includes('main_quest')) {
        state.narrativeAchievements.push('main_quest_complete');
        newAchievements.push('main_quest_complete');
      }
    }
    return newAchievements;
  }

  // T-1377: Narrative recap
  static getRecap(state: NarrativeState): {
    daysSinceLastLogin: number;
    summary: string[];
  } {
    const now = Date.now();
    const daysSince = Math.floor((now - state.lastLoginTimestamp) / (1000 * 60 * 60 * 24));
    const summary: string[] = [];
    if (daysSince >= 1) {
      summary.push(`Welcome back! You were away for ${daysSince} day${daysSince > 1 ? 's' : ''}.`);
      const activeQuests = Object.keys(state.activeQuestProgress);
      if (activeQuests.length > 0) {
        summary.push(`You have ${activeQuests.length} active quest${activeQuests.length > 1 ? 's' : ''} in progress.`);
      }
      const loreProgress = NarrativeService.getLoreCompletion(state);
      summary.push(`Lore codex: ${loreProgress.total.percent}% complete (${loreProgress.total.discovered}/${loreProgress.total.total} entries).`);
      if (state.rumorLog.filter(r => !r.verified).length > 0) {
        summary.push(`You have ${state.rumorLog.filter(r => !r.verified).length} unverified rumor${state.rumorLog.filter(r => !r.verified).length > 1 ? 's' : ''} to investigate.`);
      }
    }
    state.lastLoginTimestamp = now;
    return { daysSinceLastLogin: daysSince, summary };
  }

  // T-1380: Book discovery
  static discoverBook(state: NarrativeState, bookId: string): { book: BookDefinition | undefined; isNew: boolean } {
    const book = getBookById(bookId);
    if (!book) return { book: undefined, isNew: false };
    if (state.ownedBookIds.includes(bookId)) return { book, isNew: false };
    state.ownedBookIds.push(bookId);
    return { book, isNew: true };
  }

  static readBook(state: NarrativeState, bookId: string): { pages: string[]; unlockedLore: LoreEntry | undefined } | undefined {
    if (!state.ownedBookIds.includes(bookId)) return undefined;
    const book = getBookById(bookId);
    if (!book) return undefined;
    let unlockedLore: LoreEntry | undefined;
    if (!state.readBookIds.includes(bookId)) {
      state.readBookIds.push(bookId);
      if (book.unlocksLoreId) {
        const result = NarrativeService.discoverLore(state, book.unlocksLoreId);
        if (result.isNew) unlockedLore = result.entry;
      }
    }
    return { pages: book.pages, unlockedLore };
  }

  // T-1372: Weather-dependent NPC dialog
  static getWeatherNpcDialog(npcId: string, weatherCondition: string): string | undefined {
    return getWeatherDialog(npcId, weatherCondition);
  }

  // Static data accessors
  static getAllPatterns(): HiddenPattern[] { return [...HIDDEN_PATTERNS]; }
  static getAllEasterEggs(): HiddenPattern[] { return [...EASTER_EGG_PATTERNS]; }
  static getAllNpcs(): NpcDefinition[] { return [...NPC_DEFINITIONS]; }
  static getAllBooks(): BookDefinition[] { return [...BOOKS]; }
  static getDefaultState(): NarrativeState { return createDefaultNarrativeState(); }
}
