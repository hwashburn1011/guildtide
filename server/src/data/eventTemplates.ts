export interface EventTemplate {
  id: string;
  title: string;
  description: string;
  trigger: {
    weather?: string[];
    minFloodRisk?: number;
    minEssence?: number;
    season?: string[];
    chance: number;
  };
  durationHours: number;
  choices: EventChoice[];
}

export interface EventChoice {
  label: string;
  description: string;
  requires?: {
    heroRole?: string;
    heroCount?: number;
    resource?: string;
    amount?: number;
    research?: string;
  };
  risk: number;
  rewards: {
    resources?: Record<string, number>;
    xp?: number;
    items?: string[];
    narrative: string;
  };
  failNarrative: string;
}

export const EVENT_TEMPLATES: EventTemplate[] = [
  {
    id: 'storm_beast_hunt',
    title: 'Storm-Touched Beast Sighted',
    description: 'Lightning has awakened something in the marshes. Strange tracks lead deep into storm-soaked territory. A hunting party could pursue it — or you could set traps and wait.',
    trigger: { weather: ['stormy'], chance: 0.35 },
    durationHours: 12,
    choices: [
      {
        label: 'Send hunters',
        description: 'Dispatch your best hunters to track the beast.',
        requires: { heroRole: 'hunter', heroCount: 1 },
        risk: 0.25,
        rewards: {
          resources: { essence: 15, gold: 40 },
          xp: 30,
          narrative: 'Your hunters tracked the beast through the storm and brought it down. The creature yielded rare essence and valuable materials.',
        },
        failNarrative: 'The beast proved too elusive in the storm. Your hunters returned empty-handed but wiser.',
      },
      {
        label: 'Set traps',
        description: 'Place traps along the known paths. Slower but safer.',
        risk: 0.1,
        rewards: {
          resources: { essence: 8, food: 20 },
          xp: 15,
          narrative: 'Your traps caught smaller storm-touched creatures. Not the main beast, but useful materials nonetheless.',
        },
        failNarrative: 'The storm washed away your traps before anything was caught.',
      },
      {
        label: 'Observe from afar',
        description: 'Study the beast without engaging. Knowledge is power.',
        risk: 0,
        rewards: {
          xp: 10,
          narrative: 'Your scouts observed the beast from safety. They learned its patterns — this knowledge will help in future encounters.',
        },
        failNarrative: '',
      },
    ],
  },
  {
    id: 'flood_salvage',
    title: 'Floodwaters Reveal Ancient Ruins',
    description: 'Rising waters have eroded the riverbank, exposing what appears to be an old structure buried underground. The flooding makes access dangerous, but the potential finds could be valuable.',
    trigger: { minFloodRisk: 0.15, chance: 0.3 },
    durationHours: 8,
    choices: [
      {
        label: 'Send scouts to investigate',
        description: 'A quick reconnaissance before the waters rise further.',
        requires: { heroRole: 'scout', heroCount: 1 },
        risk: 0.2,
        rewards: {
          resources: { gold: 30, stone: 25, essence: 5 },
          xp: 25,
          narrative: 'Your scouts navigated the flooded passages and recovered ancient coins and carved stonework from the ruins.',
        },
        failNarrative: 'The flooding was too severe. Your scouts had to retreat before reaching the ruins.',
      },
      {
        label: 'Salvage building materials',
        description: 'Focus on extracting useful stone and materials.',
        risk: 0.1,
        rewards: {
          resources: { stone: 40, wood: 20 },
          xp: 10,
          narrative: 'Your workers extracted quality building materials from the exposed ruins before the water claimed them again.',
        },
        failNarrative: 'The materials crumbled when exposed to more rain.',
      },
    ],
  },
  {
    id: 'merchant_windfall',
    title: 'Traveling Merchant Caravan',
    description: 'A merchant caravan has arrived seeking shelter. They offer to trade exotic goods at favorable prices — but only briefly.',
    trigger: { weather: ['clear'], chance: 0.2 },
    durationHours: 6,
    choices: [
      {
        label: 'Trade aggressively',
        description: 'Invest gold for premium goods.',
        requires: { resource: 'gold', amount: 30 },
        risk: 0.05,
        rewards: {
          resources: { herbs: 25, ore: 15, essence: 3 },
          xp: 15,
          narrative: 'The merchants were pleased with your generosity. They left you with rare herbs and quality ore.',
        },
        failNarrative: 'The merchants\' goods were not as advertised. A lesson in caution.',
      },
      {
        label: 'Offer hospitality',
        description: 'Provide food and shelter. Build goodwill.',
        requires: { resource: 'food', amount: 20 },
        risk: 0,
        rewards: {
          resources: { gold: 15 },
          xp: 20,
          narrative: 'The grateful merchants shared trade secrets and left a generous tip. Your guild\'s reputation grows.',
        },
        failNarrative: '',
      },
    ],
  },
  {
    id: 'rare_herb_bloom',
    title: 'Rare Herb Bloom',
    description: 'The recent moisture conditions have triggered a rare bloom of medicinal herbs in the surrounding meadows. They won\'t last long.',
    trigger: { weather: ['rainy'], chance: 0.25 },
    durationHours: 10,
    choices: [
      {
        label: 'Mass harvest',
        description: 'Send workers to gather as many herbs as possible.',
        requires: { heroRole: 'farmer', heroCount: 1 },
        risk: 0.05,
        rewards: {
          resources: { herbs: 50 },
          xp: 20,
          narrative: 'Your farmers worked through the rain and gathered an exceptional harvest of rare herbs.',
        },
        failNarrative: 'The herbs wilted faster than expected. Only a small amount was saved.',
      },
      {
        label: 'Selective harvest',
        description: 'Carefully select the rarest specimens.',
        risk: 0,
        rewards: {
          resources: { herbs: 20, essence: 5 },
          xp: 15,
          narrative: 'By choosing carefully, you gathered herbs of exceptional potency, some infused with essence.',
        },
        failNarrative: '',
      },
    ],
  },
  {
    id: 'cold_preservation',
    title: 'Deep Freeze Opportunity',
    description: 'The extreme cold has created perfect conditions for long-term food preservation. Your stores could benefit greatly if you act fast.',
    trigger: { weather: ['snowy'], chance: 0.3 },
    durationHours: 12,
    choices: [
      {
        label: 'Preserve surplus food',
        description: 'Use the cold to preserve your food stores.',
        requires: { resource: 'food', amount: 30 },
        risk: 0,
        rewards: {
          resources: { food: 60 },
          xp: 15,
          narrative: 'The cold snap let you double your preserved food stores. Your guild will eat well for weeks.',
        },
        failNarrative: '',
      },
      {
        label: 'Ice harvest',
        description: 'Collect ice blocks for water storage.',
        risk: 0,
        rewards: {
          resources: { water: 40 },
          xp: 10,
          narrative: 'Clean ice blocks harvested and stored. Your water reserves are well-stocked.',
        },
        failNarrative: '',
      },
    ],
  },
  {
    id: 'fog_essence_surge',
    title: 'Mystical Fog Rolls In',
    description: 'An unusually thick fog has descended, and your mystics sense powerful essence currents within it. The fog distorts perception but offers rare opportunities.',
    trigger: { weather: ['foggy'], chance: 0.35 },
    durationHours: 8,
    choices: [
      {
        label: 'Send mystics to harvest',
        description: 'Your mystics can channel the fog\'s essence.',
        requires: { heroRole: 'mystic', heroCount: 1 },
        risk: 0.15,
        rewards: {
          resources: { essence: 20 },
          xp: 30,
          narrative: 'The mystics wove through the fog, drawing out concentrated essence from the mist itself.',
        },
        failNarrative: 'The fog\'s currents shifted unpredictably. Your mystics returned disoriented but unharmed.',
      },
      {
        label: 'Collect fog-dew',
        description: 'Set up collectors for the moisture-rich fog.',
        risk: 0,
        rewards: {
          resources: { water: 30, herbs: 10 },
          xp: 10,
          narrative: 'Fog collectors gathered water infused with trace essence. Some herbs thrived in the mist.',
        },
        failNarrative: '',
      },
    ],
  },
  {
    id: 'wind_damage',
    title: 'Strong Winds Threaten Structures',
    description: 'Powerful gusts are battering your guild buildings. Quick action could prevent damage — or you could hunker down and wait it out.',
    trigger: { weather: ['windy', 'stormy'], chance: 0.2 },
    durationHours: 6,
    choices: [
      {
        label: 'Reinforce structures',
        description: 'Spend resources to protect your buildings.',
        requires: { resource: 'wood', amount: 20 },
        risk: 0,
        rewards: {
          resources: { stone: 10 },
          xp: 20,
          narrative: 'Your workers reinforced critical structures. The wind even dislodged useful stone from nearby cliffs.',
        },
        failNarrative: '',
      },
      {
        label: 'Scavenge blown debris',
        description: 'The wind carries useful materials from afar.',
        risk: 0.1,
        rewards: {
          resources: { wood: 15, ore: 5 },
          xp: 10,
          narrative: 'Your scavengers found useful timber and ore fragments blown in by the wind.',
        },
        failNarrative: 'The wind was too dangerous. Your scavengers stayed inside.',
      },
    ],
  },
  {
    id: 'heat_alchemy',
    title: 'Alchemical Resonance',
    description: 'The intense heat has activated dormant minerals in your stores. Your alchemists report that certain reactions are unusually potent right now.',
    trigger: { weather: ['hot'], chance: 0.25 },
    durationHours: 10,
    choices: [
      {
        label: 'Intensive brewing',
        description: 'Push your alchemists to produce while conditions last.',
        requires: { heroRole: 'alchemist', heroCount: 1 },
        risk: 0.1,
        rewards: {
          resources: { essence: 12, gold: 25 },
          xp: 25,
          narrative: 'Your alchemists produced concentrated elixirs worth significant gold, plus pure essence.',
        },
        failNarrative: 'A batch went wrong in the heat. Minor resources lost, but valuable lessons learned.',
      },
      {
        label: 'Dry herb processing',
        description: 'Use the heat to dry and process herb stockpiles.',
        requires: { resource: 'herbs', amount: 15 },
        risk: 0,
        rewards: {
          resources: { gold: 30 },
          xp: 10,
          narrative: 'Dried herbs fetch premium prices. Your processed stock sold well.',
        },
        failNarrative: '',
      },
    ],
  },
  {
    id: 'market_crash_opportunity',
    title: 'Merchant Guild Panic',
    description: 'The merchant guilds are in disarray — confidence is low and prices are volatile. Distressed traders are offloading goods cheaply, but the instability could spread.',
    trigger: { chance: 0.1 },
    durationHours: 14,
    choices: [
      {
        label: 'Buy distressed goods',
        description: 'Invest gold now for undervalued materials.',
        requires: { resource: 'gold', amount: 40 },
        risk: 0.2,
        rewards: {
          resources: { ore: 30, herbs: 20, wood: 25 },
          xp: 20,
          narrative: 'You bought low and stocked high. When confidence returns, these goods will be worth far more.',
        },
        failNarrative: 'The goods were damaged — the merchants knew. A costly lesson in due diligence.',
      },
      {
        label: 'Offer stability contracts',
        description: 'Guarantee steady trade to panicked merchants.',
        risk: 0,
        rewards: {
          resources: { gold: 20 },
          xp: 25,
          narrative: 'Grateful merchants signed favorable long-term contracts. Your guild\'s reputation as a reliable partner grows.',
        },
        failNarrative: '',
      },
    ],
  },
  {
    id: 'clear_sky_festival',
    title: 'Perfect Weather Festival',
    description: 'The beautiful clear weather has your guild members in high spirits. They want to celebrate with a small festival. It would boost morale significantly.',
    trigger: { weather: ['clear'], chance: 0.15 },
    durationHours: 8,
    choices: [
      {
        label: 'Host a grand feast',
        description: 'Spend food for a major morale boost.',
        requires: { resource: 'food', amount: 25 },
        risk: 0,
        rewards: {
          resources: { gold: 15, essence: 3 },
          xp: 30,
          narrative: 'The festival was a tremendous success! Workers are energized and travelers heard of your hospitality.',
        },
        failNarrative: '',
      },
      {
        label: 'Small gathering',
        description: 'A modest celebration. Less cost, less reward.',
        risk: 0,
        rewards: {
          resources: { gold: 5 },
          xp: 10,
          narrative: 'A pleasant evening. Your guild members appreciate the gesture.',
        },
        failNarrative: '',
      },
    ],
  },
];
