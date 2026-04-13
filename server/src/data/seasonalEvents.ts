/**
 * T-0927: Seasonal event scheduling — events only in certain seasons
 * T-0928: Holiday-specific event content for 8 major real-world holidays
 */
import type { EventTemplate } from './eventTemplates';

export interface SeasonalEventSet {
  season: 'spring' | 'summer' | 'autumn' | 'winter';
  events: EventTemplate[];
}

export interface HolidayEvent {
  holiday: string;
  /** Month (1-12) */
  month: number;
  /** Day of month */
  day: number;
  /** Window in days before/after the date when this event can fire */
  windowDays: number;
  event: EventTemplate;
}

export const SEASONAL_EVENTS: SeasonalEventSet[] = [
  {
    season: 'spring',
    events: [
      {
        id: 'spring_awakening',
        title: 'Spring Awakening',
        description: 'The land bursts with new life. Flowers bloom, animals emerge, and the air smells of fresh growth.',
        category: 'seasonal',
        rarity: 'common',
        illustration: 'spring_awakening',
        trigger: { season: ['spring'], chance: 0.2, cooldownHours: 168 },
        durationHours: 14,
        choices: [
          {
            label: 'Plant new gardens',
            description: 'Expand your agricultural footprint.',
            requires: { heroRole: 'farmer', heroCount: 1 },
            risk: 0,
            rewards: { resources: { food: 40, herbs: 25 }, xp: 25, narrative: 'New gardens flourish! The spring conditions are ideal for growth.' },
            failNarrative: '',
          },
          {
            label: 'Forage for rare springs herbs',
            description: 'Seek herbs that only grow in early spring.',
            risk: 0.05,
            rewards: { resources: { herbs: 35, essence: 5 }, xp: 20, narrative: 'Rare spring herbs gathered! These are worth their weight in gold to alchemists.' },
            failNarrative: 'The rare herbs had already been picked by early birds.',
          },
        ],
      },
      {
        id: 'spring_rains',
        title: 'Blessed Spring Rains',
        description: 'Gentle rains nurture the land. Water reserves fill and crops thrive.',
        category: 'seasonal',
        rarity: 'common',
        illustration: 'spring_rains',
        trigger: { season: ['spring'], weather: ['rainy'], chance: 0.3, cooldownHours: 96 },
        durationHours: 10,
        choices: [
          {
            label: 'Maximize water collection',
            description: 'Set up rain barrels and cisterns everywhere.',
            risk: 0,
            rewards: { resources: { water: 50, food: 15 }, xp: 15, narrative: 'Water stores are overflowing! Crops are thriving in the gentle rain.' },
            failNarrative: '',
          },
          {
            label: 'Plant rain-loving crops',
            description: 'Take advantage of the wet conditions.',
            requires: { heroRole: 'farmer', heroCount: 1 },
            risk: 0,
            rewards: { resources: { food: 35, herbs: 10 }, xp: 20, narrative: 'Rain-loving crops planted and already sprouting! An excellent use of conditions.' },
            failNarrative: '',
          },
        ],
      },
    ],
  },
  {
    season: 'summer',
    events: [
      {
        id: 'summer_heat_wave',
        title: 'Summer Heat Wave',
        description: 'An oppressive heat wave grips the land. Workers struggle in the heat but opportunities arise.',
        category: 'seasonal',
        rarity: 'common',
        illustration: 'heat_wave',
        trigger: { season: ['summer'], weather: ['hot'], chance: 0.25, cooldownHours: 96 },
        durationHours: 12,
        choices: [
          {
            label: 'Night shift operations',
            description: 'Work during cool night hours instead.',
            risk: 0.05,
            rewards: { resources: { ore: 20, stone: 15 }, xp: 20, narrative: 'Night shifts kept production going. Workers appreciated the cooler temperatures.' },
            failNarrative: 'Night work brought its own challenges. Productivity was only marginally better.',
          },
          {
            label: 'Sun-dry preserves',
            description: 'Use the intense heat to preserve food.',
            requires: { resource: 'food', amount: 20 },
            risk: 0,
            rewards: { resources: { food: 45, gold: 10 }, xp: 15, narrative: 'Sun-dried provisions will last through winter. The heat was put to excellent use!' },
            failNarrative: '',
          },
        ],
      },
      {
        id: 'summer_fair',
        title: 'Midsummer Fair',
        description: 'The annual midsummer fair brings merchants, entertainers, and adventurers from distant lands.',
        category: 'seasonal',
        rarity: 'uncommon',
        illustration: 'midsummer_fair',
        trigger: { season: ['summer'], chance: 0.15, cooldownHours: 168 },
        durationHours: 14,
        choices: [
          {
            label: 'Set up trade stalls',
            description: 'Sell your goods at the fair.',
            requires: { heroRole: 'merchant', heroCount: 1 },
            risk: 0.05,
            rewards: { resources: { gold: 60 }, xp: 30, narrative: 'Fair-goers spent freely at your stalls. A lucrative day of trading!' },
            failNarrative: 'Competition at the fair was fierce. Sales were modest.',
          },
          {
            label: 'Recruit from visitors',
            description: 'Seek skilled adventurers among the fair-goers.',
            requires: { resource: 'gold', amount: 25 },
            risk: 0.1,
            rewards: { xp: 40, narrative: 'Talented individuals joined your guild! The fair was an excellent recruitment ground.' },
            failNarrative: 'No one was interested in joining. The fair had too many distractions.',
          },
        ],
      },
    ],
  },
  {
    season: 'autumn',
    events: [
      {
        id: 'autumn_storm_season',
        title: 'Autumn Storm Season',
        description: 'The season of storms begins. Powerful winds and heavy rains batter the land.',
        category: 'seasonal',
        rarity: 'common',
        illustration: 'autumn_storms',
        trigger: { season: ['autumn'], weather: ['stormy', 'windy'], chance: 0.2, cooldownHours: 72 },
        durationHours: 10,
        choices: [
          {
            label: 'Storm-proof buildings',
            description: 'Reinforce structures before the worst hits.',
            requires: { resource: 'wood', amount: 20 },
            risk: 0,
            rewards: { xp: 25, narrative: 'Buildings reinforced and secure. The storms pass without significant damage.' },
            failNarrative: '',
          },
          {
            label: 'Storm foraging',
            description: 'Collect materials blown in by the wind.',
            risk: 0.15,
            rewards: { resources: { wood: 25, ore: 10 }, xp: 15, narrative: 'The storm deposited useful materials. Free resources courtesy of nature!' },
            failNarrative: 'The storm was too dangerous. Workers stayed inside.',
          },
        ],
      },
      {
        id: 'autumn_mushroom_season',
        title: 'Mushroom Season',
        description: 'The damp autumn conditions produce a spectacular mushroom bloom. Rare varieties appear in the forest.',
        category: 'seasonal',
        rarity: 'uncommon',
        illustration: 'mushroom_season',
        trigger: { season: ['autumn'], chance: 0.15, cooldownHours: 120 },
        durationHours: 12,
        choices: [
          {
            label: 'Expert foraging',
            description: 'Send knowledgeable foragers for rare varieties.',
            requires: { heroRole: 'farmer', heroCount: 1 },
            risk: 0.1,
            rewards: { resources: { herbs: 40, essence: 8 }, xp: 30, narrative: 'Rare mushrooms harvested! Some varieties have powerful alchemical properties.' },
            failNarrative: 'The foragers misidentified some mushrooms. Only common varieties were safely gathered.',
          },
          {
            label: 'General harvest',
            description: 'Gather whatever is safe and recognizable.',
            risk: 0,
            rewards: { resources: { food: 25, herbs: 15 }, xp: 15, narrative: 'A good haul of edible mushrooms. Simple but nourishing.' },
            failNarrative: '',
          },
        ],
      },
    ],
  },
  {
    season: 'winter',
    events: [
      {
        id: 'winter_blizzard',
        title: 'Winter Blizzard',
        description: 'A fierce blizzard sweeps across the land. Travel is impossible and supplies dwindle.',
        category: 'seasonal',
        rarity: 'common',
        illustration: 'winter_blizzard',
        trigger: { season: ['winter'], weather: ['snowy'], chance: 0.25, cooldownHours: 72 },
        durationHours: 14,
        choices: [
          {
            label: 'Hunker down',
            description: 'Conserve resources and wait it out.',
            risk: 0,
            rewards: { xp: 15, narrative: 'Your guild weathered the blizzard. When it cleared, the world was white and silent.' },
            failNarrative: '',
          },
          {
            label: 'Ice harvesting',
            description: 'Brave the cold to gather ice and frozen resources.',
            risk: 0.15,
            rewards: { resources: { water: 40, food: 10 }, xp: 20, narrative: 'Brave workers gathered pristine ice. Water stores are fully stocked!' },
            failNarrative: 'The blizzard was too fierce. Workers returned empty-handed but safe.',
          },
        ],
      },
      {
        id: 'winter_aurora',
        title: 'Winter Aurora',
        description: 'The northern lights dance across the winter sky. Mystics say the aurora carries essence from the heavens.',
        category: 'seasonal',
        rarity: 'rare',
        illustration: 'winter_aurora',
        trigger: { season: ['winter'], chance: 0.08, cooldownHours: 168 },
        durationHours: 6,
        choices: [
          {
            label: 'Harvest aurora essence',
            description: 'Mystics channel the celestial energy.',
            requires: { heroRole: 'mystic', heroCount: 1 },
            risk: 0.1,
            rewards: { resources: { essence: 25, gold: 10 }, xp: 40, narrative: 'Aurora essence crystallized in your mystics\' hands. A beautiful and powerful harvest!' },
            failNarrative: 'The aurora faded before the ritual completed. Some essence was captured.',
          },
          {
            label: 'Star-gazing celebration',
            description: 'Enjoy the natural wonder together.',
            risk: 0,
            rewards: { resources: { essence: 5 }, xp: 20, narrative: 'The guild gathered to watch the lights. A magical evening that lifted all spirits.' },
            failNarrative: '',
          },
        ],
      },
    ],
  },
];

export const HOLIDAY_EVENTS: HolidayEvent[] = [
  // 1. New Year's
  {
    holiday: "New Year's Day",
    month: 1,
    day: 1,
    windowDays: 2,
    event: {
      id: 'holiday_new_year',
      title: 'Dawn of the New Year',
      description: 'A new year dawns! The guild reflects on the past and looks forward with hope and ambition.',
      category: 'seasonal',
      rarity: 'uncommon',
      illustration: 'new_year',
      trigger: { chance: 1.0 },
      durationHours: 24,
      choices: [
        {
          label: 'New Year resolutions',
          description: 'Set ambitious goals for the year ahead.',
          risk: 0,
          rewards: { resources: { gold: 25, essence: 10 }, xp: 40, narrative: 'Inspired by the new year, your guild sets ambitious goals. Everyone feels motivated!' },
          failNarrative: '',
        },
        {
          label: 'Year-end feast',
          description: 'Celebrate the year with a grand feast.',
          requires: { resource: 'food', amount: 30 },
          risk: 0,
          rewards: { resources: { gold: 15 }, xp: 30, narrative: 'A wonderful feast to mark the transition. New friendships were forged!' },
          failNarrative: '',
        },
      ],
    },
  },
  // 2. Valentine's Day
  {
    holiday: "Valentine's Day",
    month: 2,
    day: 14,
    windowDays: 1,
    event: {
      id: 'holiday_valentines',
      title: 'Hearts Festival',
      description: 'Love is in the air! Guild members exchange gifts and strengthen bonds of friendship.',
      category: 'seasonal',
      rarity: 'uncommon',
      illustration: 'hearts_festival',
      trigger: { chance: 1.0 },
      durationHours: 16,
      choices: [
        {
          label: 'Gift exchange',
          description: 'Organize a guild-wide gift exchange.',
          requires: { resource: 'gold', amount: 15 },
          risk: 0,
          rewards: { resources: { essence: 8 }, xp: 30, narrative: 'The gift exchange brought everyone closer. Guild bonds are stronger than ever!' },
          failNarrative: '',
        },
        {
          label: 'Romantic garden party',
          description: 'Host a beautiful gathering in the gardens.',
          requires: { resource: 'food', amount: 15 },
          risk: 0,
          rewards: { resources: { herbs: 15, gold: 10 }, xp: 25, narrative: 'The garden party was enchanting! Even the flowers seemed to bloom brighter.' },
          failNarrative: '',
        },
      ],
    },
  },
  // 3. Easter / Spring Equinox
  {
    holiday: 'Easter',
    month: 4,
    day: 20,
    windowDays: 3,
    event: {
      id: 'holiday_easter',
      title: 'Bloom Festival',
      description: 'The spring equinox brings a celebration of renewal. Hidden treasures are scattered across the land.',
      category: 'seasonal',
      rarity: 'uncommon',
      illustration: 'bloom_festival',
      trigger: { chance: 1.0 },
      durationHours: 18,
      choices: [
        {
          label: 'Treasure hunt',
          description: 'Seek hidden treasures scattered by tradition.',
          requires: { heroRole: 'scout', heroCount: 1 },
          risk: 0.05,
          rewards: { resources: { gold: 40, essence: 10, herbs: 15 }, xp: 35, narrative: 'The treasure hunt was a success! Hidden prizes and rare herbs were discovered.' },
          failNarrative: 'Most treasures were already found by earlier searchers.',
        },
        {
          label: 'Planting ceremony',
          description: 'Ceremonially plant the first seeds of spring.',
          risk: 0,
          rewards: { resources: { food: 30, herbs: 10 }, xp: 20, narrative: 'The planting ceremony blessed the soil. Crops will grow strong this season!' },
          failNarrative: '',
        },
      ],
    },
  },
  // 4. Independence Day / Freedom Festival
  {
    holiday: 'Independence Day',
    month: 7,
    day: 4,
    windowDays: 1,
    event: {
      id: 'holiday_independence',
      title: 'Freedom Blaze',
      description: 'Arcane fireworks light the sky as the guild celebrates freedom and independence!',
      category: 'seasonal',
      rarity: 'uncommon',
      illustration: 'freedom_blaze',
      trigger: { chance: 1.0 },
      durationHours: 12,
      choices: [
        {
          label: 'Arcane fireworks',
          description: 'Put on a spectacular magical display.',
          requires: { resource: 'essence', amount: 8 },
          risk: 0.05,
          rewards: { resources: { gold: 30 }, xp: 35, narrative: 'The fireworks were magnificent! Visitors from afar came to watch and spend gold.' },
          failNarrative: 'A misfire caused excitement but no damage. Still a fun show!',
        },
        {
          label: 'Patriotic feast',
          description: 'A grand communal meal for all.',
          requires: { resource: 'food', amount: 25 },
          risk: 0,
          rewards: { resources: { gold: 15, essence: 3 }, xp: 25, narrative: 'The feast united the guild in celebration. Spirits are high!' },
          failNarrative: '',
        },
      ],
    },
  },
  // 5. Halloween
  {
    holiday: 'Halloween',
    month: 10,
    day: 31,
    windowDays: 2,
    event: {
      id: 'holiday_halloween',
      title: 'Night of Shadows',
      description: 'The barrier between worlds thins. Strange creatures appear and dark magic flows freely.',
      category: 'seasonal',
      rarity: 'rare',
      illustration: 'night_of_shadows',
      trigger: { chance: 1.0 },
      durationHours: 12,
      choices: [
        {
          label: 'Harvest shadow essence',
          description: 'Mystics channel the dark energy safely.',
          requires: { heroRole: 'mystic', heroCount: 1 },
          risk: 0.15,
          rewards: { resources: { essence: 30, gold: 20 }, xp: 45, items: ['shadow_crystal'], narrative: 'Shadow essence crystallized into a rare shadow crystal! Dark power harnessed safely.' },
          failNarrative: 'The dark energy was too chaotic to control. Your mystic retreated wisely.',
        },
        {
          label: 'Costume festival',
          description: 'Celebrate with costumes and treats.',
          requires: { resource: 'food', amount: 15 },
          risk: 0,
          rewards: { resources: { gold: 20 }, xp: 25, narrative: 'The costume festival was spooky and fun! Children and adults alike enjoyed the celebrations.' },
          failNarrative: '',
        },
      ],
    },
  },
  // 6. Thanksgiving
  {
    holiday: 'Thanksgiving',
    month: 11,
    day: 28,
    windowDays: 2,
    event: {
      id: 'holiday_thanksgiving',
      title: 'Feast of Gratitude',
      description: 'A day to give thanks for the guild\'s blessings. A grand feast brings everyone together.',
      category: 'seasonal',
      rarity: 'uncommon',
      illustration: 'feast_of_gratitude',
      trigger: { chance: 1.0 },
      durationHours: 16,
      choices: [
        {
          label: 'Grand thanksgiving feast',
          description: 'Prepare the finest meal of the year.',
          requires: { resource: 'food', amount: 35 },
          risk: 0,
          rewards: { resources: { gold: 30, essence: 8 }, xp: 35, narrative: 'The feast was extraordinary! Gratitude filled the hall and bonds strengthened.' },
          failNarrative: '',
        },
        {
          label: 'Charity drive',
          description: 'Share surplus with the less fortunate.',
          requires: { resource: 'food', amount: 20 },
          risk: 0,
          rewards: { resources: { gold: 15, essence: 5 }, xp: 30, narrative: 'Your generosity inspired others. The community is grateful and your reputation soars.' },
          failNarrative: '',
        },
      ],
    },
  },
  // 7. Christmas / Winter Feast
  {
    holiday: 'Christmas',
    month: 12,
    day: 25,
    windowDays: 3,
    event: {
      id: 'holiday_christmas',
      title: 'Winter Feast',
      description: 'The great winter celebration! The guild hall glows with warmth as the community gathers for the most joyous event of the year.',
      category: 'seasonal',
      rarity: 'rare',
      illustration: 'winter_feast',
      trigger: { chance: 1.0 },
      durationHours: 24,
      choices: [
        {
          label: 'Legendary feast',
          description: 'An unforgettable celebration for all.',
          requires: { resource: 'food', amount: 40 },
          risk: 0,
          rewards: { resources: { gold: 50, essence: 15 }, xp: 50, items: ['winter_blessing'], narrative: 'The Winter Feast was legendary! Magic itself seemed to celebrate, blessing all who attended.' },
          failNarrative: '',
        },
        {
          label: 'Gift-giving ceremony',
          description: 'Exchange gifts with guild members.',
          requires: { resource: 'gold', amount: 30 },
          risk: 0,
          rewards: { resources: { essence: 10, herbs: 15 }, xp: 40, narrative: 'Gifts were exchanged with joy and laughter. Every guild member felt valued and appreciated.' },
          failNarrative: '',
        },
      ],
    },
  },
  // 8. Oktoberfest
  {
    holiday: 'Oktoberfest',
    month: 9,
    day: 21,
    windowDays: 3,
    event: {
      id: 'holiday_oktoberfest',
      title: 'Ale Festival',
      description: 'The annual ale festival begins! Brewers compete, merchants trade, and everyone celebrates with overflowing tankards.',
      category: 'seasonal',
      rarity: 'uncommon',
      illustration: 'ale_festival',
      trigger: { chance: 1.0 },
      durationHours: 16,
      choices: [
        {
          label: 'Brewing competition',
          description: 'Enter your best brew in the contest.',
          requires: { resource: 'herbs', amount: 15 },
          risk: 0.1,
          rewards: { resources: { gold: 45, food: 10 }, xp: 30, narrative: 'Your ale won first place! Orders pour in and gold flows like, well, ale!' },
          failNarrative: 'Your brew was good but not great. Better luck next year!',
        },
        {
          label: 'Food stall profits',
          description: 'Sell hearty food to thirsty festival-goers.',
          requires: { resource: 'food', amount: 20 },
          risk: 0,
          rewards: { resources: { gold: 35 }, xp: 20, narrative: 'Hungry drinkers bought everything you had! A profitable day at the festival.' },
          failNarrative: '',
        },
      ],
    },
  },
];
