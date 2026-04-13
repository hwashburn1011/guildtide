/**
 * Random encounter templates for the expedition system.
 *
 * T-0484: Expedition encounter engine with weighted random event selection
 * T-0485: Combat encounter resolution using party stats vs enemy stats
 * T-0486: Treasure encounter with loot table and roll mechanics
 * T-0487: Trap encounter with agility/perception check mechanics
 * T-0488: NPC encounter with dialog options and charisma checks
 * T-0489: Rest encounter for party healing during long expeditions
 * T-0490: Weather encounter modifying expedition difficulty
 * T-0524: Environmental hazard system (poison swamp, lava field)
 * T-0548: Merchant caravan encounter for mid-route trading
 */

export type EncounterType =
  | 'combat'
  | 'treasure'
  | 'trap'
  | 'npc'
  | 'rest'
  | 'weather'
  | 'merchant'
  | 'hazard';

export interface EncounterTemplate {
  id: string;
  type: EncounterType;
  name: string;
  description: string;
  weight: number; // higher = more likely
  minDifficulty: number;
  maxDifficulty: number;
  applicableTypes: string[]; // expedition types this applies to, empty = all
  statCheck?: 'strength' | 'agility' | 'endurance' | 'intellect' | 'luck' | 'charisma';
  checkDifficulty?: number; // DC for the stat check
  successNarrative: string;
  failureNarrative: string;
  partialNarrative?: string;
  successEffects: Record<string, number>;
  failureEffects: Record<string, number>;
  lootOnSuccess?: { resource: string; min: number; max: number; chance: number }[];
  moraleChange?: { success: number; failure: number };
  supplyChange?: { success: number; failure: number };
  seasonal?: string; // only appears in this season
  hazardType?: string;
}

export const ENCOUNTER_TEMPLATES: EncounterTemplate[] = [
  // --- Combat Encounters ---
  {
    id: 'bandit_ambush',
    type: 'combat',
    name: 'Bandit Ambush',
    description: 'A group of bandits emerges from the shadows, weapons drawn.',
    weight: 15,
    minDifficulty: 1,
    maxDifficulty: 5,
    applicableTypes: [],
    statCheck: 'strength',
    checkDifficulty: 12,
    successNarrative: 'Your party fights off the bandits with practiced coordination, sending them fleeing into the wilderness.',
    failureNarrative: 'The bandits overwhelm your party, dealing injuries before retreating with some of your supplies.',
    successEffects: { xpBonus: 10 },
    failureEffects: { damage: 15 },
    lootOnSuccess: [
      { resource: 'gold', min: 5, max: 20, chance: 0.8 },
    ],
    moraleChange: { success: 5, failure: -10 },
  },
  {
    id: 'wild_beast_pack',
    type: 'combat',
    name: 'Wild Beast Pack',
    description: 'A pack of snarling creatures blocks the path ahead.',
    weight: 12,
    minDifficulty: 2,
    maxDifficulty: 7,
    applicableTypes: ['hunt', 'explore'],
    statCheck: 'strength',
    checkDifficulty: 15,
    successNarrative: 'The beasts are driven off after a fierce skirmish. The party claims pelts and meat from the fallen.',
    failureNarrative: 'The beasts prove too aggressive. Your heroes suffer bites and claw wounds as they retreat.',
    successEffects: { xpBonus: 15 },
    failureEffects: { damage: 20 },
    lootOnSuccess: [
      { resource: 'food', min: 8, max: 20, chance: 0.9 },
    ],
    moraleChange: { success: 5, failure: -8 },
  },
  {
    id: 'skeleton_guardians',
    type: 'combat',
    name: 'Skeleton Guardians',
    description: 'Ancient skeletal warriors rise from the ground, defending this forgotten place.',
    weight: 8,
    minDifficulty: 4,
    maxDifficulty: 10,
    applicableTypes: ['explore'],
    statCheck: 'strength',
    checkDifficulty: 18,
    successNarrative: 'The undead crumble to dust as your heroes shatter their ancient bindings. Treasure gleams beneath the bones.',
    failureNarrative: 'The skeletal warriors prove relentless. Your party is forced to withdraw, battered and bruised.',
    successEffects: { xpBonus: 25 },
    failureEffects: { damage: 25 },
    lootOnSuccess: [
      { resource: 'essence', min: 3, max: 10, chance: 0.7 },
      { resource: 'gold', min: 10, max: 30, chance: 0.5 },
    ],
    moraleChange: { success: 8, failure: -15 },
  },
  {
    id: 'highway_raiders',
    type: 'combat',
    name: 'Highway Raiders',
    description: 'Armed raiders demand a toll for passage along the trade route.',
    weight: 10,
    minDifficulty: 3,
    maxDifficulty: 8,
    applicableTypes: ['trade_caravan'],
    statCheck: 'strength',
    checkDifficulty: 14,
    successNarrative: 'Your caravan guards drive off the raiders efficiently. Some of the stolen goods they carried are recovered.',
    failureNarrative: 'The raiders overpower your guards and make off with a portion of your trade goods.',
    successEffects: { xpBonus: 12 },
    failureEffects: { damage: 10, goldLoss: 15 },
    lootOnSuccess: [
      { resource: 'gold', min: 10, max: 25, chance: 0.85 },
    ],
    moraleChange: { success: 5, failure: -12 },
  },

  // --- Treasure Encounters ---
  {
    id: 'hidden_cache',
    type: 'treasure',
    name: 'Hidden Cache',
    description: 'Your scouts discover a concealed storage area behind a collapsed wall.',
    weight: 10,
    minDifficulty: 1,
    maxDifficulty: 10,
    applicableTypes: [],
    statCheck: 'luck',
    checkDifficulty: 10,
    successNarrative: 'The cache yields a bountiful collection of supplies and valuables. What a fortunate find!',
    failureNarrative: 'The cache appears to have been looted already. Only scraps remain.',
    partialNarrative: 'Some items remain, though the best pieces are long gone.',
    successEffects: { xpBonus: 8 },
    failureEffects: {},
    lootOnSuccess: [
      { resource: 'gold', min: 10, max: 40, chance: 0.9 },
      { resource: 'ore', min: 5, max: 15, chance: 0.6 },
      { resource: 'essence', min: 1, max: 5, chance: 0.3 },
    ],
    moraleChange: { success: 10, failure: -2 },
  },
  {
    id: 'ancient_chest',
    type: 'treasure',
    name: 'Ancient Chest',
    description: 'An ornate chest sits in the ruins, its lock still intact after centuries.',
    weight: 6,
    minDifficulty: 3,
    maxDifficulty: 10,
    applicableTypes: ['explore', 'scavenge'],
    statCheck: 'agility',
    checkDifficulty: 14,
    successNarrative: 'The lock clicks open with practiced finesse. Inside, rare materials and a glowing artifact await.',
    failureNarrative: 'The lock resists all attempts. A trap springs, releasing a burst of dust that irritates the party.',
    successEffects: { xpBonus: 15 },
    failureEffects: { damage: 5 },
    lootOnSuccess: [
      { resource: 'essence', min: 5, max: 15, chance: 0.8 },
      { resource: 'gold', min: 15, max: 50, chance: 0.7 },
    ],
    moraleChange: { success: 12, failure: -5 },
  },
  {
    id: 'abandoned_campsite',
    type: 'treasure',
    name: 'Abandoned Campsite',
    description: 'An old campsite with scattered belongings. Whoever was here left in a hurry.',
    weight: 12,
    minDifficulty: 1,
    maxDifficulty: 6,
    applicableTypes: [],
    statCheck: 'luck',
    checkDifficulty: 8,
    successNarrative: 'Among the abandoned supplies, your party finds useful equipment and rations.',
    failureNarrative: 'The campsite has been picked clean by previous scavengers.',
    successEffects: { xpBonus: 5 },
    failureEffects: {},
    lootOnSuccess: [
      { resource: 'food', min: 5, max: 15, chance: 0.8 },
      { resource: 'wood', min: 3, max: 10, chance: 0.6 },
    ],
    moraleChange: { success: 5, failure: -1 },
    supplyChange: { success: 5, failure: 0 },
  },

  // --- Trap Encounters ---
  {
    id: 'pit_trap',
    type: 'trap',
    name: 'Concealed Pit',
    description: 'The ground gives way beneath the lead scout!',
    weight: 10,
    minDifficulty: 2,
    maxDifficulty: 8,
    applicableTypes: [],
    statCheck: 'agility',
    checkDifficulty: 13,
    successNarrative: 'Quick reflexes save the scout from falling. The party carefully skirts the trapped area.',
    failureNarrative: 'A hero tumbles into the pit, suffering bruises and a sprained ankle.',
    successEffects: { xpBonus: 8 },
    failureEffects: { damage: 12 },
    moraleChange: { success: 3, failure: -8 },
  },
  {
    id: 'poison_dart_wall',
    type: 'trap',
    name: 'Poison Dart Wall',
    description: 'Tiny holes line the corridor walls. A faint clicking sound echoes ahead.',
    weight: 7,
    minDifficulty: 4,
    maxDifficulty: 10,
    applicableTypes: ['explore', 'scavenge'],
    statCheck: 'agility',
    checkDifficulty: 16,
    successNarrative: 'The party times their dash perfectly, weaving through the corridor untouched.',
    failureNarrative: 'Poisoned darts strike multiple heroes, causing weakness and nausea.',
    successEffects: { xpBonus: 12 },
    failureEffects: { damage: 18, poisonTurns: 2 },
    moraleChange: { success: 5, failure: -12 },
  },
  {
    id: 'tripwire_alarm',
    type: 'trap',
    name: 'Tripwire Alarm',
    description: 'A thin wire stretches across the path, barely visible in the dim light.',
    weight: 8,
    minDifficulty: 1,
    maxDifficulty: 5,
    applicableTypes: [],
    statCheck: 'agility',
    checkDifficulty: 10,
    successNarrative: 'A sharp-eyed hero spots the wire and disarms it. The mechanism was connected to a crude alarm.',
    failureNarrative: 'The alarm triggers, alerting nearby creatures. The party must hurry onward.',
    successEffects: { xpBonus: 5 },
    failureEffects: { speedPenalty: 1 },
    moraleChange: { success: 2, failure: -5 },
  },

  // --- NPC Encounters ---
  {
    id: 'wandering_scholar',
    type: 'npc',
    name: 'Wandering Scholar',
    description: 'A robed figure sits beside the road, studying a tattered map.',
    weight: 8,
    minDifficulty: 1,
    maxDifficulty: 10,
    applicableTypes: [],
    statCheck: 'intellect',
    checkDifficulty: 12,
    successNarrative: 'The scholar shares valuable knowledge about the region, revealing a shortcut and hidden lore.',
    failureNarrative: 'The scholar speaks in riddles your party cannot decipher. They part ways with a wave.',
    successEffects: { xpBonus: 15, loreGained: 1 },
    failureEffects: {},
    moraleChange: { success: 8, failure: 0 },
  },
  {
    id: 'lost_traveler',
    type: 'npc',
    name: 'Lost Traveler',
    description: 'A weary traveler asks for directions and offers a reward for help.',
    weight: 10,
    minDifficulty: 1,
    maxDifficulty: 6,
    applicableTypes: [],
    statCheck: 'charisma',
    checkDifficulty: 10,
    successNarrative: 'You guide the traveler to safety. Grateful, they share supplies and a tip about nearby treasure.',
    failureNarrative: 'The traveler wanders off, unconvinced by your directions. No harm done.',
    successEffects: { xpBonus: 8 },
    failureEffects: {},
    lootOnSuccess: [
      { resource: 'gold', min: 5, max: 15, chance: 0.7 },
      { resource: 'food', min: 3, max: 8, chance: 0.5 },
    ],
    moraleChange: { success: 8, failure: 0 },
  },
  {
    id: 'hermit_alchemist',
    type: 'npc',
    name: 'Hermit Alchemist',
    description: 'Smoke rises from a hidden cave. Inside, an eccentric alchemist offers to trade.',
    weight: 6,
    minDifficulty: 3,
    maxDifficulty: 10,
    applicableTypes: ['explore'],
    statCheck: 'intellect',
    checkDifficulty: 14,
    successNarrative: 'The alchemist is impressed by your knowledge and trades rare herbs for a few coins.',
    failureNarrative: 'The alchemist waves you away, muttering about ignorant adventurers.',
    successEffects: { xpBonus: 12 },
    failureEffects: {},
    lootOnSuccess: [
      { resource: 'herbs', min: 5, max: 20, chance: 0.9 },
      { resource: 'essence', min: 2, max: 8, chance: 0.4 },
    ],
    moraleChange: { success: 5, failure: -2 },
  },

  // --- Rest Encounters ---
  {
    id: 'sheltered_grove',
    type: 'rest',
    name: 'Sheltered Grove',
    description: 'A peaceful grove with fresh water offers a perfect resting spot.',
    weight: 10,
    minDifficulty: 1,
    maxDifficulty: 10,
    applicableTypes: [],
    successNarrative: 'The party rests in the tranquil grove, recovering strength and spirits.',
    failureNarrative: 'The grove provides modest rest, though the ground is uncomfortable.',
    successEffects: { healing: 15, moraleBoost: 10 },
    failureEffects: { healing: 5 },
    moraleChange: { success: 10, failure: 3 },
    supplyChange: { success: -2, failure: -3 },
  },
  {
    id: 'abandoned_inn',
    type: 'rest',
    name: 'Abandoned Inn',
    description: 'The ruins of a roadside inn still have a serviceable roof and hearth.',
    weight: 6,
    minDifficulty: 1,
    maxDifficulty: 8,
    applicableTypes: ['trade_caravan', 'explore'],
    successNarrative: 'A fire in the old hearth and a roof over their heads does wonders for party morale.',
    failureNarrative: 'The inn is damp and cold, but better than sleeping under the stars.',
    successEffects: { healing: 20, moraleBoost: 15 },
    failureEffects: { healing: 8 },
    moraleChange: { success: 15, failure: 5 },
    supplyChange: { success: -3, failure: -3 },
  },

  // --- Weather Encounters ---
  {
    id: 'sudden_storm',
    type: 'weather',
    name: 'Sudden Storm',
    description: 'Dark clouds roll in fast. Thunder cracks and rain hammers down.',
    weight: 10,
    minDifficulty: 1,
    maxDifficulty: 10,
    applicableTypes: [],
    statCheck: 'endurance',
    checkDifficulty: 12,
    successNarrative: 'The party endures the storm with minimal setback, pressing on through the rain.',
    failureNarrative: 'The storm forces the party to take shelter, losing time and dampening spirits.',
    successEffects: {},
    failureEffects: { speedPenalty: 1 },
    moraleChange: { success: 0, failure: -8 },
    supplyChange: { success: -1, failure: -3 },
    seasonal: 'spring',
  },
  {
    id: 'scorching_heat',
    type: 'weather',
    name: 'Scorching Heat',
    description: 'The sun beats down mercilessly, sapping strength from every step.',
    weight: 8,
    minDifficulty: 1,
    maxDifficulty: 10,
    applicableTypes: [],
    statCheck: 'endurance',
    checkDifficulty: 14,
    successNarrative: 'Hardy constitution prevails. The party keeps pace despite the brutal heat.',
    failureNarrative: 'The heat takes its toll, leaving heroes exhausted and water supplies depleted.',
    successEffects: {},
    failureEffects: { damage: 8 },
    moraleChange: { success: 0, failure: -10 },
    supplyChange: { success: -2, failure: -5 },
    seasonal: 'summer',
  },
  {
    id: 'blizzard',
    type: 'weather',
    name: 'Blizzard',
    description: 'Snow and wind reduce visibility to near zero. The cold is biting.',
    weight: 7,
    minDifficulty: 3,
    maxDifficulty: 10,
    applicableTypes: [],
    statCheck: 'endurance',
    checkDifficulty: 16,
    successNarrative: 'Bundled up and determined, the party pushes through the blizzard without losing anyone.',
    failureNarrative: 'The blizzard halts all progress. Supplies dwindle as the party huddles for warmth.',
    successEffects: {},
    failureEffects: { damage: 12, speedPenalty: 2 },
    moraleChange: { success: 3, failure: -15 },
    supplyChange: { success: -3, failure: -8 },
    seasonal: 'winter',
  },
  {
    id: 'thick_fog',
    type: 'weather',
    name: 'Thick Fog',
    description: 'An unnaturally dense fog rolls in, obscuring the path.',
    weight: 9,
    minDifficulty: 1,
    maxDifficulty: 8,
    applicableTypes: [],
    statCheck: 'intellect',
    checkDifficulty: 11,
    successNarrative: 'A clever hero uses landmarks and compass to navigate through the fog without delay.',
    failureNarrative: 'The party wanders in circles, losing time and patience.',
    successEffects: { xpBonus: 5 },
    failureEffects: { speedPenalty: 1 },
    moraleChange: { success: 2, failure: -6 },
  },

  // --- Merchant Encounters ---
  {
    id: 'traveling_merchant',
    type: 'merchant',
    name: 'Traveling Merchant',
    description: 'A merchant caravan crosses your path, offering wares and willing to trade.',
    weight: 7,
    minDifficulty: 1,
    maxDifficulty: 10,
    applicableTypes: [],
    statCheck: 'charisma',
    checkDifficulty: 11,
    successNarrative: 'You strike an excellent bargain, acquiring valuable supplies at a discount.',
    failureNarrative: 'The merchant drives a hard bargain. You trade but at no particular advantage.',
    partialNarrative: 'Fair trade all around. Both parties walk away satisfied.',
    successEffects: { xpBonus: 8 },
    failureEffects: { goldLoss: 5 },
    lootOnSuccess: [
      { resource: 'herbs', min: 5, max: 15, chance: 0.7 },
      { resource: 'food', min: 5, max: 10, chance: 0.6 },
    ],
    moraleChange: { success: 8, failure: -2 },
    supplyChange: { success: 5, failure: -2 },
  },
  {
    id: 'rare_goods_peddler',
    type: 'merchant',
    name: 'Rare Goods Peddler',
    description: 'A shady-looking peddler offers items "of unusual provenance."',
    weight: 4,
    minDifficulty: 4,
    maxDifficulty: 10,
    applicableTypes: [],
    statCheck: 'intellect',
    checkDifficulty: 15,
    successNarrative: 'Your keen eye separates the genuine artifacts from the fakes. A rare find among the junk.',
    failureNarrative: 'Everything the peddler sells turns out to be worthless. Gold wasted.',
    successEffects: { xpBonus: 15 },
    failureEffects: { goldLoss: 20 },
    lootOnSuccess: [
      { resource: 'essence', min: 3, max: 10, chance: 0.6 },
    ],
    moraleChange: { success: 10, failure: -8 },
  },

  // --- Environmental Hazard Encounters ---
  {
    id: 'poison_swamp',
    type: 'hazard',
    name: 'Poison Swamp',
    description: 'Noxious fumes rise from bubbling green pools. The only path cuts through the swamp.',
    weight: 6,
    minDifficulty: 3,
    maxDifficulty: 10,
    applicableTypes: ['explore', 'hunt'],
    statCheck: 'endurance',
    checkDifficulty: 15,
    successNarrative: 'Cloth wraps and quick steps get the party through without inhaling too much poison.',
    failureNarrative: 'Several heroes suffer from toxic exposure, coughing and weakened.',
    successEffects: { xpBonus: 10 },
    failureEffects: { damage: 15, poisonTurns: 3 },
    moraleChange: { success: 3, failure: -12 },
    hazardType: 'poison',
  },
  {
    id: 'lava_field',
    type: 'hazard',
    name: 'Lava Field',
    description: 'Rivers of molten rock crisscross the landscape. The heat is nearly unbearable.',
    weight: 4,
    minDifficulty: 6,
    maxDifficulty: 10,
    applicableTypes: ['explore'],
    statCheck: 'agility',
    checkDifficulty: 17,
    successNarrative: 'Careful path-finding across cooled rock bridges gets everyone across safely.',
    failureNarrative: 'A bridge collapses! Heroes scramble to safety, suffering burns.',
    successEffects: { xpBonus: 20 },
    failureEffects: { damage: 25 },
    moraleChange: { success: 8, failure: -15 },
    hazardType: 'fire',
  },
  {
    id: 'rockslide',
    type: 'hazard',
    name: 'Rockslide',
    description: 'The mountainside rumbles ominously. Loose rocks begin to tumble.',
    weight: 7,
    minDifficulty: 3,
    maxDifficulty: 9,
    applicableTypes: ['explore', 'scavenge'],
    statCheck: 'agility',
    checkDifficulty: 14,
    successNarrative: 'Everyone dives for cover in time. When the dust settles, the path is clear.',
    failureNarrative: 'Boulders strike the party, causing injuries and blocking the original route.',
    successEffects: { xpBonus: 10 },
    failureEffects: { damage: 18, speedPenalty: 1 },
    moraleChange: { success: 3, failure: -10 },
    hazardType: 'crush',
  },
  {
    id: 'quicksand',
    type: 'hazard',
    name: 'Quicksand',
    description: 'The ground becomes soft and treacherous. A hero begins to sink!',
    weight: 5,
    minDifficulty: 2,
    maxDifficulty: 7,
    applicableTypes: ['explore', 'hunt'],
    statCheck: 'strength',
    checkDifficulty: 13,
    successNarrative: 'Quick thinking and a strong rope pull the trapped hero free before they sink further.',
    failureNarrative: 'The rescue is messy and time-consuming. Equipment is lost in the mire.',
    successEffects: { xpBonus: 8 },
    failureEffects: { damage: 8, suppliesLost: 3 },
    moraleChange: { success: 5, failure: -8 },
    hazardType: 'terrain',
  },
];

/**
 * Get encounters applicable to a given expedition difficulty and type.
 */
export function getApplicableEncounters(
  difficulty: number,
  expeditionType: string,
  season?: string,
): EncounterTemplate[] {
  return ENCOUNTER_TEMPLATES.filter(enc => {
    if (difficulty < enc.minDifficulty || difficulty > enc.maxDifficulty) {
      return false;
    }
    if (enc.applicableTypes.length > 0 && !enc.applicableTypes.includes(expeditionType)) {
      return false;
    }
    if (enc.seasonal && season && enc.seasonal !== season) {
      return false;
    }
    return true;
  });
}

/**
 * Select random encounters from weighted pool.
 */
export function selectRandomEncounters(
  applicable: EncounterTemplate[],
  count: number,
): EncounterTemplate[] {
  if (applicable.length === 0) return [];

  const totalWeight = applicable.reduce((sum, e) => sum + e.weight, 0);
  const selected: EncounterTemplate[] = [];
  const used = new Set<string>();

  for (let i = 0; i < count && used.size < applicable.length; i++) {
    let roll = Math.random() * totalWeight;
    for (const enc of applicable) {
      if (used.has(enc.id)) continue;
      roll -= enc.weight;
      if (roll <= 0) {
        selected.push(enc);
        used.add(enc.id);
        break;
      }
    }
  }

  return selected;
}
