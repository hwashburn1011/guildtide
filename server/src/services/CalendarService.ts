/**
 * CalendarService — Season, holiday, festival, lunar cycle, and time-of-day logic.
 *
 * T-0941: Calendar system synchronized with real-world date
 * T-0942: Season determination logic based on hemisphere and date
 * T-0953: Season indicator with days remaining
 * T-0954: Hemisphere selection support
 * T-0963: Lunar cycle calculation (29.5-day cycle)
 * T-0965: Full moon gameplay effects
 * T-0966: New moon gameplay effects
 * T-0967: Waxing/waning gameplay effects
 * T-0974: Cultural holiday detection for player's region
 * T-0975: Regional holiday events based on player location
 * T-0980: Anniversary event for guild creation date
 * T-0981: Equinox events with day/night balance theme
 * T-0982: Time-of-day synchronization with real clock
 * T-0984: Weekend bonus events
 * T-0985: Custom player anniversary celebration
 * T-0986: Month-specific event pool rotation
 */

import {
  MOON_PHASE_EFFECTS,
  SEASONAL_CROPS,
  SEASONAL_MARKET_MODIFIERS,
  HERO_SEASON_PREFERENCES,
  SEASONAL_EXPEDITION_MODIFIERS,
  DAILY_CHALLENGES,
  MONTH_EVENT_POOLS,
  type MoonPhase,
  type MoonPhaseEffect,
} from '../data/seasonalContent';

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

  /**
   * Get the hemisphere for a region.
   */
  static getHemisphere(regionId: string): 'north' | 'south' {
    return REGION_META[regionId]?.hemisphere ?? 'north';
  }

  // --- T-0953: Season indicator with days remaining ---
  static getSeasonInfo(regionId: string, date: Date = new Date()): {
    season: Season;
    daysRemaining: number;
    progress: number;
    nextSeason: Season;
  } {
    const season = CalendarService.getCurrentSeason(regionId, date);
    const hemisphere = CalendarService.getHemisphere(regionId);
    const month = date.getMonth() + 1;
    const day = date.getDate();

    // Season boundaries (northern hemisphere base)
    const seasonEnds: Record<Season, { month: number; day: number }> = {
      spring: { month: 5, day: 31 },
      summer: { month: 8, day: 31 },
      autumn: { month: 11, day: 30 },
      winter: { month: 2, day: 28 },
    };

    // For southern hemisphere, seasons are flipped, but end dates stay the same
    const actualSeason = hemisphere === 'south'
      ? ({ spring: 'autumn', summer: 'winter', autumn: 'spring', winter: 'summer' } as const)[season]
      : season;

    const end = seasonEnds[actualSeason];
    const endDate = new Date(date.getFullYear(), end.month - 1, end.day);
    if (endDate < date) {
      endDate.setFullYear(endDate.getFullYear() + 1);
    }

    const daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - date.getTime()) / 86400000));
    const totalDays = 91; // approximate season length
    const progress = Math.min(1, Math.max(0, 1 - daysRemaining / totalDays));

    const seasonOrder: Season[] = ['spring', 'summer', 'autumn', 'winter'];
    const idx = seasonOrder.indexOf(season);
    const nextSeason = seasonOrder[(idx + 1) % 4];

    return { season, daysRemaining, progress, nextSeason };
  }

  // --- T-0963: Lunar cycle calculation ---
  static getMoonPhase(date: Date = new Date()): MoonPhase {
    // Known new moon: January 6, 2000 at 18:14 UTC
    const knownNewMoon = new Date('2000-01-06T18:14:00Z').getTime();
    const lunarCycle = 29.53058770576; // days
    const daysSinceKnown = (date.getTime() - knownNewMoon) / 86400000;
    const cyclePosition = ((daysSinceKnown % lunarCycle) + lunarCycle) % lunarCycle;
    const phase = cyclePosition / lunarCycle; // 0..1

    if (phase < 0.0625) return 'new_moon';
    if (phase < 0.1875) return 'waxing_crescent';
    if (phase < 0.3125) return 'first_quarter';
    if (phase < 0.4375) return 'waxing_gibbous';
    if (phase < 0.5625) return 'full_moon';
    if (phase < 0.6875) return 'waning_gibbous';
    if (phase < 0.8125) return 'last_quarter';
    if (phase < 0.9375) return 'waning_crescent';
    return 'new_moon';
  }

  static getMoonPhaseEffect(date: Date = new Date()): MoonPhaseEffect {
    const phase = CalendarService.getMoonPhase(date);
    return MOON_PHASE_EFFECTS.find(e => e.phase === phase) ?? MOON_PHASE_EFFECTS[0];
  }

  // --- T-0968: Upcoming full and new moons ---
  static getUpcomingLunarEvents(date: Date = new Date(), count: number = 4): Array<{
    phase: 'full_moon' | 'new_moon';
    date: Date;
    label: string;
  }> {
    const knownNewMoon = new Date('2000-01-06T18:14:00Z').getTime();
    const lunarCycle = 29.53058770576;
    const results: Array<{ phase: 'full_moon' | 'new_moon'; date: Date; label: string }> = [];
    const startMs = date.getTime();

    // Find the start of the current cycle
    const daysSince = (startMs - knownNewMoon) / 86400000;
    const currentCycle = Math.floor(daysSince / lunarCycle);

    for (let i = 0; results.length < count && i < count * 2 + 4; i++) {
      const cycleStart = knownNewMoon + (currentCycle + i) * lunarCycle * 86400000;
      const newMoonDate = new Date(cycleStart);
      const fullMoonDate = new Date(cycleStart + (lunarCycle / 2) * 86400000);

      if (newMoonDate.getTime() > startMs && results.length < count) {
        results.push({ phase: 'new_moon', date: newMoonDate, label: 'New Moon' });
      }
      if (fullMoonDate.getTime() > startMs && results.length < count) {
        results.push({ phase: 'full_moon', date: fullMoonDate, label: 'Full Moon' });
      }
    }

    return results.sort((a, b) => a.date.getTime() - b.date.getTime()).slice(0, count);
  }

  // --- T-0982: Time-of-day synchronization ---
  static getTimeOfDay(date: Date = new Date()): 'dawn' | 'day' | 'dusk' | 'night' {
    const hour = date.getHours();
    if (hour >= 5 && hour < 7) return 'dawn';
    if (hour >= 7 && hour < 18) return 'day';
    if (hour >= 18 && hour < 20) return 'dusk';
    return 'night';
  }

  // --- T-0984: Weekend bonus detection ---
  static isWeekend(date: Date = new Date()): boolean {
    const day = date.getDay();
    return day === 0 || day === 6;
  }

  static getWeekendBonuses(): { xpBonus: number; goldBonus: number; lootBonus: number } {
    return { xpBonus: 0.15, goldBonus: 0.10, lootBonus: 0.10 };
  }

  // --- T-0980: Guild anniversary check ---
  static isGuildAnniversary(guildCreatedAt: string, date: Date = new Date()): boolean {
    const created = new Date(guildCreatedAt);
    return (
      created.getMonth() === date.getMonth() &&
      created.getDate() === date.getDate() &&
      created.getFullYear() < date.getFullYear()
    );
  }

  static getGuildAgeYears(guildCreatedAt: string, date: Date = new Date()): number {
    const created = new Date(guildCreatedAt);
    return date.getFullYear() - created.getFullYear();
  }

  // --- T-0985: Player anniversary ---
  static isPlayerAnniversary(playerCreatedAt: string, date: Date = new Date()): boolean {
    const created = new Date(playerCreatedAt);
    return (
      created.getMonth() === date.getMonth() &&
      created.getDate() === date.getDate() &&
      created.getFullYear() < date.getFullYear()
    );
  }

  // --- T-0981: Equinox detection ---
  static isEquinox(date: Date = new Date()): 'spring' | 'autumn' | null {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    // Spring equinox: around March 20
    if (month === 3 && day >= 19 && day <= 21) return 'spring';
    // Autumn equinox: around September 22
    if (month === 9 && day >= 21 && day <= 23) return 'autumn';
    return null;
  }

  // --- T-0974, T-0975: Cultural/Regional holiday detection ---
  static getRegionalHolidays(regionId: string, date: Date = new Date()): Holiday[] {
    const country = CalendarService.getCountry(regionId);
    return CalendarService.getHolidays(date, country);
  }

  // --- T-0986: Month-specific event pool ---
  static getMonthEventPool(date: Date = new Date()): string[] {
    const month = date.getMonth() + 1;
    return MONTH_EVENT_POOLS[month] ?? [];
  }

  // --- T-0970: Get today's daily challenges ---
  static getDailyChallenges(date: Date = new Date(), count: number = 3): typeof DAILY_CHALLENGES {
    // Deterministic selection based on day of year
    const dayOfYear = Math.floor(
      (date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000,
    );
    const shuffled = [...DAILY_CHALLENGES];
    // Simple seeded shuffle
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = (dayOfYear * 31 + i * 7) % (i + 1);
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, count);
  }

  // --- T-0976: Upcoming events this week ---
  static getUpcomingEventsThisWeek(regionId: string, date: Date = new Date()): Array<{
    date: Date;
    holiday: Holiday;
    festival: Festival | null;
  }> {
    const results: Array<{ date: Date; holiday: Holiday; festival: Festival | null }> = [];
    const country = CalendarService.getCountry(regionId);

    for (let i = 0; i < 7; i++) {
      const checkDate = new Date(date);
      checkDate.setDate(checkDate.getDate() + i);
      const holidays = CalendarService.getHolidays(checkDate, country);
      for (const holiday of holidays) {
        // Avoid duplicates
        if (!results.find(r => r.holiday.name === holiday.name)) {
          results.push({
            date: checkDate,
            holiday,
            festival: CalendarService.getFestivalFromHoliday(holiday),
          });
        }
      }
    }

    return results;
  }

  // --- T-0941: Full calendar data for current month ---
  static getCalendarMonth(regionId: string, date: Date = new Date()): Array<{
    day: number;
    date: Date;
    isToday: boolean;
    season: Season;
    holidays: Holiday[];
    moonPhase: MoonPhase;
    isWeekend: boolean;
  }> {
    const year = date.getFullYear();
    const month = date.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = date.getDate();
    const country = CalendarService.getCountry(regionId);
    const result: Array<{
      day: number;
      date: Date;
      isToday: boolean;
      season: Season;
      holidays: Holiday[];
      moonPhase: MoonPhase;
      isWeekend: boolean;
    }> = [];

    for (let d = 1; d <= daysInMonth; d++) {
      const dayDate = new Date(year, month, d);
      result.push({
        day: d,
        date: dayDate,
        isToday: d === today,
        season: CalendarService.getCurrentSeason(regionId, dayDate),
        holidays: CalendarService.getHolidays(dayDate, country),
        moonPhase: CalendarService.getMoonPhase(dayDate),
        isWeekend: CalendarService.isWeekend(dayDate),
      });
    }

    return result;
  }

  // --- Seasonal crop/market/expedition helpers ---
  static getSeasonalCrops(season: Season) {
    return SEASONAL_CROPS[season];
  }

  static getSeasonalMarketModifiers(season: Season) {
    return SEASONAL_MARKET_MODIFIERS[season];
  }

  static getHeroMoraleModifier(heroRole: string, season: Season): number {
    const pref = HERO_SEASON_PREFERENCES.find(p => p.role === heroRole);
    if (!pref) return 0;
    if (pref.preferredSeason === season) return pref.moraleBuff;
    if (pref.dislikedSeason === season) return pref.moraleDebuff;
    return 0;
  }

  static getExpeditionModifiers(season: Season) {
    return SEASONAL_EXPEDITION_MODIFIERS[season];
  }
}
