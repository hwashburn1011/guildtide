// Region metadata for season/country mapping
const REGION_META: Record<string, { hemisphere: 'north' | 'south'; country: string }> = {
  'miami': { hemisphere: 'north', country: 'US' },
  'new-york': { hemisphere: 'north', country: 'US' },
  'chicago': { hemisphere: 'north', country: 'US' },
  'denver': { hemisphere: 'north', country: 'US' },
  'seattle': { hemisphere: 'north', country: 'US' },
  'los-angeles': { hemisphere: 'north', country: 'US' },
  'austin': { hemisphere: 'north', country: 'US' },
  'london': { hemisphere: 'north', country: 'GB' },
  'tokyo': { hemisphere: 'north', country: 'JP' },
  'sydney': { hemisphere: 'south', country: 'AU' },
  'sao-paulo': { hemisphere: 'south', country: 'BR' },
  'berlin': { hemisphere: 'north', country: 'DE' },
};

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export interface SeasonalModifiers {
  cropGrowth: number;
  morale: number;
  water: number;
  food: number;
  preservation: number;
}

export interface Holiday {
  name: string;
  month: number;
  day: number;
  country: string; // '*' = all countries
  duration: number; // days the festival lasts
}

export interface Festival {
  name: string;
  fantasyName: string;
  flavorText: string;
  buffs: {
    morale: number;
    goldIncome: number;
    marketDiscount: number;
    xpBonus: number;
  };
  duration: number;
}

// ~20 holidays across US, GB, JP, AU, BR, DE + universal ones
const HOLIDAYS: Holiday[] = [
  // Universal
  { name: "New Year's Day", month: 1, day: 1, country: '*', duration: 2 },
  { name: "Valentine's Day", month: 2, day: 14, country: '*', duration: 1 },
  // Easter approximate (using April 20 as a static approximation for MVP)
  { name: 'Easter', month: 4, day: 20, country: '*', duration: 2 },
  { name: 'Christmas', month: 12, day: 25, country: '*', duration: 2 },

  // US
  { name: 'Independence Day', month: 7, day: 4, country: 'US', duration: 1 },
  { name: 'Halloween', month: 10, day: 31, country: 'US', duration: 1 },
  { name: 'Thanksgiving', month: 11, day: 28, country: 'US', duration: 1 },
  { name: 'Memorial Day', month: 5, day: 26, country: 'US', duration: 1 },

  // GB
  { name: "Queen's Jubilee", month: 6, day: 2, country: 'GB', duration: 2 },
  { name: 'Guy Fawkes Night', month: 11, day: 5, country: 'GB', duration: 1 },
  { name: 'May Day', month: 5, day: 1, country: 'GB', duration: 1 },

  // JP
  { name: 'Golden Week', month: 5, day: 3, country: 'JP', duration: 2 },
  { name: 'Tanabata', month: 7, day: 7, country: 'JP', duration: 1 },
  { name: 'Obon', month: 8, day: 15, country: 'JP', duration: 2 },

  // AU
  { name: 'Australia Day', month: 1, day: 26, country: 'AU', duration: 1 },
  { name: 'ANZAC Day', month: 4, day: 25, country: 'AU', duration: 1 },

  // BR
  { name: 'Carnival', month: 2, day: 25, country: 'BR', duration: 2 },
  { name: 'Dia da Independencia', month: 9, day: 7, country: 'BR', duration: 1 },

  // DE
  { name: 'Oktoberfest', month: 9, day: 21, country: 'DE', duration: 2 },
  { name: 'Tag der Deutschen Einheit', month: 10, day: 3, country: 'DE', duration: 1 },
];

// Map real holidays to fantasy festival names
const FESTIVAL_MAP: Record<string, Omit<Festival, 'duration'>> = {
  "New Year's Day": {
    name: "New Year's Day",
    fantasyName: 'Dawn Celebration',
    flavorText: 'A new dawn rises over the realm — fresh beginnings fill the air with promise.',
    buffs: { morale: 0.20, goldIncome: 0.15, marketDiscount: 0.10, xpBonus: 0.10 },
  },
  "Valentine's Day": {
    name: "Valentine's Day",
    fantasyName: 'Hearts Festival',
    flavorText: 'Love and camaraderie flourish; guild bonds grow stronger.',
    buffs: { morale: 0.25, goldIncome: 0.10, marketDiscount: 0.05, xpBonus: 0.10 },
  },
  'Easter': {
    name: 'Easter',
    fantasyName: 'Bloom Festival',
    flavorText: 'The land awakens — hidden treasures sprout from the earth.',
    buffs: { morale: 0.15, goldIncome: 0.15, marketDiscount: 0.10, xpBonus: 0.15 },
  },
  'Christmas': {
    name: 'Christmas',
    fantasyName: 'Winter Feast',
    flavorText: 'The great hall glows with warmth as the guild shares a legendary feast.',
    buffs: { morale: 0.25, goldIncome: 0.20, marketDiscount: 0.15, xpBonus: 0.10 },
  },
  'Independence Day': {
    name: 'Independence Day',
    fantasyName: 'Freedom Blaze',
    flavorText: 'Fireworks of arcane energy illuminate the sky — the guild celebrates liberty!',
    buffs: { morale: 0.20, goldIncome: 0.15, marketDiscount: 0.10, xpBonus: 0.10 },
  },
  'Halloween': {
    name: 'Halloween',
    fantasyName: 'Shadow Festival',
    flavorText: 'Spirits roam the land — brave adventurers reap rare rewards.',
    buffs: { morale: 0.15, goldIncome: 0.10, marketDiscount: 0.05, xpBonus: 0.20 },
  },
  'Thanksgiving': {
    name: 'Thanksgiving',
    fantasyName: 'Harvest Gathering',
    flavorText: 'The guild gives thanks for a bountiful harvest — food overflows.',
    buffs: { morale: 0.20, goldIncome: 0.15, marketDiscount: 0.15, xpBonus: 0.10 },
  },
  'Memorial Day': {
    name: 'Memorial Day',
    fantasyName: 'Heroes Remembrance',
    flavorText: 'We honor the fallen heroes whose courage paved our path.',
    buffs: { morale: 0.20, goldIncome: 0.10, marketDiscount: 0.05, xpBonus: 0.15 },
  },
  "Queen's Jubilee": {
    name: "Queen's Jubilee",
    fantasyName: 'Crown Festival',
    flavorText: 'The realm celebrates its sovereign with grand pageantry.',
    buffs: { morale: 0.20, goldIncome: 0.20, marketDiscount: 0.10, xpBonus: 0.10 },
  },
  'Guy Fawkes Night': {
    name: 'Guy Fawkes Night',
    fantasyName: 'Ember Night',
    flavorText: 'Bonfires roar across the land — a night of fire and intrigue.',
    buffs: { morale: 0.15, goldIncome: 0.10, marketDiscount: 0.05, xpBonus: 0.15 },
  },
  'May Day': {
    name: 'May Day',
    fantasyName: 'Greenweave Festival',
    flavorText: 'Flowers crown the guild hall as nature magic surges.',
    buffs: { morale: 0.20, goldIncome: 0.10, marketDiscount: 0.10, xpBonus: 0.10 },
  },
  'Golden Week': {
    name: 'Golden Week',
    fantasyName: 'Gilded Rest',
    flavorText: 'A week of golden tranquility — the guild prospers in peace.',
    buffs: { morale: 0.20, goldIncome: 0.20, marketDiscount: 0.15, xpBonus: 0.10 },
  },
  'Tanabata': {
    name: 'Tanabata',
    fantasyName: 'Starweave Festival',
    flavorText: 'Stars align and wishes are woven into reality.',
    buffs: { morale: 0.20, goldIncome: 0.10, marketDiscount: 0.05, xpBonus: 0.20 },
  },
  'Obon': {
    name: 'Obon',
    fantasyName: 'Spirit Lantern Festival',
    flavorText: 'Lanterns guide ancestral spirits home — wisdom flows from beyond.',
    buffs: { morale: 0.20, goldIncome: 0.10, marketDiscount: 0.10, xpBonus: 0.15 },
  },
  'Australia Day': {
    name: 'Australia Day',
    fantasyName: 'Sunlands Celebration',
    flavorText: 'The blazing sun empowers the guild with outback resilience.',
    buffs: { morale: 0.20, goldIncome: 0.15, marketDiscount: 0.10, xpBonus: 0.10 },
  },
  'ANZAC Day': {
    name: 'ANZAC Day',
    fantasyName: 'Dawn Guard Vigil',
    flavorText: 'At dawn we remember — courage echoes through the ages.',
    buffs: { morale: 0.20, goldIncome: 0.10, marketDiscount: 0.05, xpBonus: 0.15 },
  },
  'Carnival': {
    name: 'Carnival',
    fantasyName: 'Masquerade Revel',
    flavorText: 'Colors explode! Music, dance, and joyous chaos fill the streets.',
    buffs: { morale: 0.25, goldIncome: 0.15, marketDiscount: 0.10, xpBonus: 0.10 },
  },
  'Dia da Independencia': {
    name: 'Dia da Independencia',
    fantasyName: 'Liberation Day',
    flavorText: 'The guild breaks free of old chains — independence fuels ambition.',
    buffs: { morale: 0.20, goldIncome: 0.15, marketDiscount: 0.10, xpBonus: 0.10 },
  },
  'Oktoberfest': {
    name: 'Oktoberfest',
    fantasyName: 'Brew Fest',
    flavorText: 'Barrels overflow with legendary brews — morale reaches new heights!',
    buffs: { morale: 0.25, goldIncome: 0.15, marketDiscount: 0.15, xpBonus: 0.10 },
  },
  'Tag der Deutschen Einheit': {
    name: 'Tag der Deutschen Einheit',
    fantasyName: 'Unity Festival',
    flavorText: 'The guild unites as one — solidarity brings strength.',
    buffs: { morale: 0.20, goldIncome: 0.15, marketDiscount: 0.10, xpBonus: 0.10 },
  },
};

export class CalendarService {
  /**
   * Determine the current season based on date and hemisphere.
   * Southern hemisphere has reversed seasons.
   */
  static getCurrentSeason(regionId: string, date: Date = new Date()): Season {
    const meta = REGION_META[regionId];
    const hemisphere = meta?.hemisphere ?? 'north';
    const month = date.getMonth() + 1; // 1-12

    let season: Season;
    if (month >= 3 && month <= 5) season = 'spring';
    else if (month >= 6 && month <= 8) season = 'summer';
    else if (month >= 9 && month <= 11) season = 'autumn';
    else season = 'winter';

    // Reverse for southern hemisphere
    if (hemisphere === 'south') {
      const flip: Record<Season, Season> = {
        spring: 'autumn',
        summer: 'winter',
        autumn: 'spring',
        winter: 'summer',
      };
      season = flip[season];
    }

    return season;
  }

  /**
   * Get holidays active on a given date for a country.
   * Returns holidays that match the country or are universal ('*').
   */
  static getHolidays(date: Date, country: string): Holiday[] {
    const month = date.getMonth() + 1;
    const day = date.getDate();

    return HOLIDAYS.filter((h) => {
      if (h.country !== '*' && h.country !== country) return false;
      // Check if date falls within the holiday window
      if (h.month !== month) return false;
      return day >= h.day && day < h.day + h.duration;
    });
  }

  /**
   * Get seasonal modifiers as multipliers (matching GameModifiers convention).
   */
  static getSeasonalModifiers(season: Season): SeasonalModifiers {
    switch (season) {
      case 'spring':
        return { cropGrowth: 1.15, morale: 1.0, water: 1.0, food: 1.0, preservation: 1.0 };
      case 'summer':
        return { cropGrowth: 1.0, morale: 1.10, water: 0.95, food: 1.0, preservation: 1.0 };
      case 'autumn':
        return { cropGrowth: 1.0, morale: 1.0, water: 1.0, food: 1.20, preservation: 1.0 };
      case 'winter':
        return { cropGrowth: 0.85, morale: 1.0, water: 1.0, food: 1.0, preservation: 1.10 };
    }
  }

  /**
   * Map a real-world holiday to a fantasy festival with buffs.
   */
  static getFestivalFromHoliday(holiday: Holiday): Festival | null {
    const mapping = FESTIVAL_MAP[holiday.name];
    if (!mapping) return null;
    return { ...mapping, duration: holiday.duration };
  }

  /**
   * Check if there's a festival active today for the given region.
   */
  static getActiveFestival(regionId: string, date: Date = new Date()): Festival | null {
    const meta = REGION_META[regionId];
    const country = meta?.country ?? 'US';
    const holidays = CalendarService.getHolidays(date, country);

    if (holidays.length === 0) return null;

    // Return the first matching festival (priority: country-specific over universal)
    const sorted = [...holidays].sort((a, b) => {
      if (a.country !== '*' && b.country === '*') return -1;
      if (a.country === '*' && b.country !== '*') return 1;
      return 0;
    });

    for (const holiday of sorted) {
      const festival = CalendarService.getFestivalFromHoliday(holiday);
      if (festival) return festival;
    }

    return null;
  }

  /**
   * Get the country for a region.
   */
  static getCountry(regionId: string): string {
    return REGION_META[regionId]?.country ?? 'US';
  }
}
